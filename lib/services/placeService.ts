import { query, queryOne } from '@/lib/db'
import { getTripById } from './tripService'

export type PlaceType = 'food' | 'bar' | 'cafe' | 'photo' | 'museum' | 'activity' | 'other'

export interface CreatePlaceInput {
  name: string
  address?: string
  lat?: number
  lng?: number
  type: PlaceType
  dayIndex?: number
  notes?: string
}

export interface UpdatePlaceInput {
  name?: string
  address?: string
  lat?: number | null
  lng?: number | null
  type?: PlaceType
  dayIndex?: number | null
  notes?: string | null
}

export interface Place {
  id: string
  tripId: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  type: PlaceType
  dayIndex: number | null
  notes: string | null
  createdAt: Date
}

export interface PlacesByDay {
  [dayIndex: number]: Place[]
  unassigned?: Place[]
}

export interface PaginatedPlacesResult {
  places: PlacesByDay
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PlaceError {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL_ERROR'
  message: string
  details?: Array<{ field: string; message: string }>
}

const VALID_PLACE_TYPES: PlaceType[] = ['food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other']

/**
 * Validates place name (non-empty)
 */
function isValidPlaceName(name: string): boolean {
  return typeof name === 'string' && name.trim().length > 0
}

/**
 * Validates place type
 */
function isValidPlaceType(type: string): type is PlaceType {
  return VALID_PLACE_TYPES.includes(type as PlaceType)
}

/**
 * Validates latitude (-90 to 90)
 */
function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
}

/**
 * Validates longitude (-180 to 180)
 */
function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180
}

/**
 * Validates coordinates (both must be provided together or both null)
 */
function areCoordinatesValid(lat: number | undefined | null, lng: number | undefined | null): boolean {
  // Both must be provided or both must be null/undefined
  const hasLat = lat !== undefined && lat !== null
  const hasLng = lng !== undefined && lng !== null

  if (hasLat && !hasLng) return false
  if (hasLng && !hasLat) return false

  if (hasLat && hasLng) {
    return isValidLatitude(lat!) && isValidLongitude(lng!)
  }

  return true
}

// PostgreSQL DECIMAL is returned as string, convert to number
function parseDecimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  return parseFloat(value)
}

/**
 * Create a new place in a trip
 * Validates trip ownership, place name, type, and coordinates
 * 
 * @throws PlaceError if validation fails or trip not found
 */
export async function createPlace(
  tripId: string,
  userId: string,
  input: CreatePlaceInput
): Promise<Place> {
  const { name, address, lat, lng, type, dayIndex, notes } = input

  // Validate name
  if (!isValidPlaceName(name)) {
    const error: PlaceError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'name', message: 'Place name is required' }]
    }
    throw error
  }

  // Validate type
  if (!isValidPlaceType(type)) {
    const error: PlaceError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'type', message: `Invalid place type. Must be one of: ${VALID_PLACE_TYPES.join(', ')}` }]
    }
    throw error
  }

  // Validate coordinates
  if (!areCoordinatesValid(lat, lng)) {
    const error: PlaceError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        { field: 'lat', message: 'Latitude must be between -90 and 90' },
        { field: 'lng', message: 'Longitude must be between -180 and 180' },
        { field: 'coordinates', message: 'Both latitude and longitude must be provided together' }
      ]
    }
    throw error
  }

  try {
    // Verify trip exists and user owns it
    await getTripById(tripId, userId)

    // Create place
    const place = await queryOne<{
      id: string
      trip_id: string
      name: string
      address: string | null
      lat: string | null
      lng: string | null
      type: PlaceType
      day_index: number | null
      notes: string | null
      created_at: Date
    }>(
      `INSERT INTO places (trip_id, name, address, lat, lng, type, day_index, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, trip_id, name, address, lat, lng, type, day_index, notes, created_at`,
      [
        tripId,
        name.trim(),
        address?.trim() || null,
        lat ?? null,
        lng ?? null,
        type,
        dayIndex ?? null,
        notes?.trim() || null
      ]
    )

    if (!place) {
      throw new Error('Failed to create place')
    }

    return {
      id: place.id,
      tripId: place.trip_id,
      name: place.name,
      address: place.address,
      lat: parseDecimal(place.lat),
      lng: parseDecimal(place.lng),
      type: place.type,
      dayIndex: place.day_index,
      notes: place.notes,
      createdAt: place.created_at
    }
  } catch (error: any) {
    // Re-throw PlaceError as-is
    if (error.code) {
      throw error
    }

    // Wrap unexpected errors
    const placeError: PlaceError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw placeError
  }
}

/**
 * Update a place with ownership validation
 * 
 * @throws PlaceError if place not found, user doesn't own it, or validation fails
 */
export async function updatePlace(
  placeId: string,
  userId: string,
  input: UpdatePlaceInput
): Promise<Place> {
  const { name, address, lat, lng, type, dayIndex, notes } = input

  try {
    // Get place and verify it exists, with trip info
    const existingPlace = await queryOne<{
      id: string
      trip_id: string
      name: string
      address: string | null
      lat: string | null
      lng: string | null
      type: PlaceType
      day_index: number | null
      notes: string | null
      created_at: Date
      user_id: string
    }>(
      `SELECT p.id, p.trip_id, p.name, p.address, p.lat, p.lng, p.type, p.day_index, p.notes, p.created_at, t.user_id
       FROM places p
       JOIN trips t ON p.trip_id = t.id
       WHERE p.id = $1`,
      [placeId]
    )

    if (!existingPlace) {
      const error: PlaceError = {
        code: 'NOT_FOUND',
        message: 'Place not found'
      }
      throw error
    }

    // Verify user owns the trip
    if (existingPlace.user_id !== userId) {
      const error: PlaceError = {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
      throw error
    }

    // Validate name if provided
    if (name !== undefined && !isValidPlaceName(name)) {
      const error: PlaceError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'name', message: 'Place name is required' }]
      }
      throw error
    }

    // Validate type if provided
    if (type !== undefined && !isValidPlaceType(type)) {
      const error: PlaceError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'type', message: `Invalid place type. Must be one of: ${VALID_PLACE_TYPES.join(', ')}` }]
      }
      throw error
    }

    // Validate coordinates
    const finalLat = lat !== undefined ? lat : parseDecimal(existingPlace.lat)
    const finalLng = lng !== undefined ? lng : parseDecimal(existingPlace.lng)

    if (!areCoordinatesValid(finalLat, finalLng)) {
      const error: PlaceError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [
          { field: 'lat', message: 'Latitude must be between -90 and 90' },
          { field: 'lng', message: 'Longitude must be between -180 and 180' },
          { field: 'coordinates', message: 'Both latitude and longitude must be provided together' }
        ]
      }
      throw error
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name.trim())
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`)
      values.push(address?.trim() || null)
    }
    if (lat !== undefined) {
      updates.push(`lat = $${paramIndex++}`)
      values.push(lat ?? null)
    }
    if (lng !== undefined) {
      updates.push(`lng = $${paramIndex++}`)
      values.push(lng ?? null)
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`)
      values.push(type)
    }
    if (dayIndex !== undefined) {
      updates.push(`day_index = $${paramIndex++}`)
      values.push(dayIndex ?? null)
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`)
      values.push(notes?.trim() || null)
    }

    if (updates.length === 0) {
      // No updates, return existing place
      return {
        id: existingPlace.id,
        tripId: existingPlace.trip_id,
        name: existingPlace.name,
        address: existingPlace.address,
        lat: parseDecimal(existingPlace.lat),
        lng: parseDecimal(existingPlace.lng),
        type: existingPlace.type,
        dayIndex: existingPlace.day_index,
        notes: existingPlace.notes,
        createdAt: existingPlace.created_at
      }
    }

    // Add placeId for WHERE clause
    values.push(placeId)

    // Update place
    const place = await queryOne<{
      id: string
      trip_id: string
      name: string
      address: string | null
      lat: string | null
      lng: string | null
      type: PlaceType
      day_index: number | null
      notes: string | null
      created_at: Date
    }>(
      `UPDATE places SET ${updates.join(', ')}
       WHERE id = $${paramIndex++}
       RETURNING id, trip_id, name, address, lat, lng, type, day_index, notes, created_at`,
      values
    )

    if (!place) {
      const error: PlaceError = {
        code: 'NOT_FOUND',
        message: 'Place not found'
      }
      throw error
    }

    return {
      id: place.id,
      tripId: place.trip_id,
      name: place.name,
      address: place.address,
      lat: parseDecimal(place.lat),
      lng: parseDecimal(place.lng),
      type: place.type,
      dayIndex: place.day_index,
      notes: place.notes,
      createdAt: place.created_at
    }
  } catch (error: any) {
    // Re-throw PlaceError as-is
    if (error.code) {
      throw error
    }

    // Wrap unexpected errors
    const placeError: PlaceError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw placeError
  }
}

/**
 * Delete a place with ownership validation and cascade deletion
 * 
 * @throws PlaceError if place not found or user doesn't own it
 */
export async function deletePlace(placeId: string, userId: string): Promise<void> {
  try {
    // Get place and verify it exists, with trip info
    const place = await queryOne<{
      id: string
      user_id: string
    }>(
      `SELECT p.id, t.user_id
       FROM places p
       JOIN trips t ON p.trip_id = t.id
       WHERE p.id = $1`,
      [placeId]
    )

    if (!place) {
      const error: PlaceError = {
        code: 'NOT_FOUND',
        message: 'Place not found'
      }
      throw error
    }

    // Verify user owns the trip
    if (place.user_id !== userId) {
      const error: PlaceError = {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
      throw error
    }

    // Delete place (cascade deletion of sources is handled by database)
    await query(
      'DELETE FROM places WHERE id = $1',
      [placeId]
    )
  } catch (error: any) {
    // Re-throw PlaceError as-is
    if (error.code) {
      throw error
    }

    // Wrap unexpected errors
    const placeError: PlaceError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw placeError
  }
}

/**
 * Get places for a trip grouped by day
 * Returns places grouped by dayIndex, with unassigned places in 'unassigned' key
 */
export async function getPlacesByTrip(tripId: string): Promise<PlacesByDay> {
  try {
    const places = await query<{
      id: string
      trip_id: string
      name: string
      address: string | null
      lat: string | null
      lng: string | null
      type: PlaceType
      day_index: number | null
      notes: string | null
      created_at: Date
    }>(
      'SELECT id, trip_id, name, address, lat, lng, type, day_index, notes, created_at FROM places WHERE trip_id = $1 ORDER BY day_index ASC NULLS LAST, created_at ASC',
      [tripId]
    )

    const grouped: PlacesByDay = {}

    for (const place of places) {
      const placeData: Place = {
        id: place.id,
        tripId: place.trip_id,
        name: place.name,
        address: place.address,
        lat: parseDecimal(place.lat),
        lng: parseDecimal(place.lng),
        type: place.type,
        dayIndex: place.day_index,
        notes: place.notes,
        createdAt: place.created_at
      }

      if (place.day_index === null) {
        if (!grouped.unassigned) {
          grouped.unassigned = []
        }
        grouped.unassigned.push(placeData)
      } else {
        if (!grouped[place.day_index]) {
          grouped[place.day_index] = []
        }
        grouped[place.day_index].push(placeData)
      }
    }

    return grouped
  } catch (error: any) {
    const placeError: PlaceError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw placeError
  }
}

/**
 * Get places for a trip with pagination support
 * Returns places grouped by day with pagination metadata
 * 
 * @param tripId - Trip ID
 * @param page - Page number (1-indexed, default: 1)
 * @param limit - Number of places per page (default: 20, max: 100)
 * @returns Paginated places result with metadata
 */
export async function getPlacesByTripPaginated(
  tripId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedPlacesResult> {
  try {
    // Validate and normalize pagination parameters
    const normalizedPage = Math.max(1, Math.floor(page))
    const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)))
    const skip = (normalizedPage - 1) * normalizedLimit

    // Get total count
    const totalResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM places WHERE trip_id = $1',
      [tripId]
    )
    const total = totalResult ? parseInt(totalResult.count) : 0

    // Get paginated places
    const places = await query<{
      id: string
      trip_id: string
      name: string
      address: string | null
      lat: string | null
      lng: string | null
      type: PlaceType
      day_index: number | null
      notes: string | null
      created_at: Date
    }>(
      'SELECT id, trip_id, name, address, lat, lng, type, day_index, notes, created_at FROM places WHERE trip_id = $1 ORDER BY day_index ASC NULLS LAST, created_at ASC LIMIT $2 OFFSET $3',
      [tripId, normalizedLimit, skip]
    )

    // Group places by day
    const grouped: PlacesByDay = {}

    for (const place of places) {
      const placeData: Place = {
        id: place.id,
        tripId: place.trip_id,
        name: place.name,
        address: place.address,
        lat: parseDecimal(place.lat),
        lng: parseDecimal(place.lng),
        type: place.type,
        dayIndex: place.day_index,
        notes: place.notes,
        createdAt: place.created_at
      }

      if (place.day_index === null) {
        if (!grouped.unassigned) {
          grouped.unassigned = []
        }
        grouped.unassigned.push(placeData)
      } else {
        if (!grouped[place.day_index]) {
          grouped[place.day_index] = []
        }
        grouped[place.day_index].push(placeData)
      }
    }

    const totalPages = Math.ceil(total / normalizedLimit)

    return {
      places: grouped,
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages
    }
  } catch (error: any) {
    const placeError: PlaceError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw placeError
  }
}

