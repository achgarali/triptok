import { prisma } from '@/lib/prisma'
import { getTripById } from './tripService'
import { Decimal } from '@prisma/client/runtime/library'

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

/**
 * Convert number to Prisma Decimal
 */
function toDecimal(value: number | null | undefined): Decimal | null {
  if (value === null || value === undefined) {
    return null
  }
  return new Decimal(value)
}

/**
 * Convert Prisma Decimal to number
 */
function fromDecimal(value: Decimal | null): number | null {
  if (value === null) {
    return null
  }
  return value.toNumber()
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
    const place = await prisma.place.create({
      data: {
        tripId,
        name: name.trim(),
        address: address?.trim() || null,
        lat: toDecimal(lat),
        lng: toDecimal(lng),
        type,
        dayIndex: dayIndex ?? null,
        notes: notes?.trim() || null
      }
    })

    return {
      id: place.id,
      tripId: place.tripId,
      name: place.name,
      address: place.address,
      lat: fromDecimal(place.lat),
      lng: fromDecimal(place.lng),
      type: place.type,
      dayIndex: place.dayIndex,
      notes: place.notes,
      createdAt: place.createdAt
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
    // Get place and verify it exists
    const existingPlace = await prisma.place.findUnique({
      where: { id: placeId },
      include: { trip: true }
    })

    if (!existingPlace) {
      const error: PlaceError = {
        code: 'NOT_FOUND',
        message: 'Place not found'
      }
      throw error
    }

    // Verify user owns the trip
    if (existingPlace.trip.userId !== userId) {
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
    const finalLat = lat !== undefined ? lat : fromDecimal(existingPlace.lat)
    const finalLng = lng !== undefined ? lng : fromDecimal(existingPlace.lng)

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

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (address !== undefined) updateData.address = address?.trim() || null
    if (lat !== undefined) updateData.lat = toDecimal(lat)
    if (lng !== undefined) updateData.lng = toDecimal(lng)
    if (type !== undefined) updateData.type = type
    if (dayIndex !== undefined) updateData.dayIndex = dayIndex
    if (notes !== undefined) updateData.notes = notes?.trim() || null

    // Update place
    const place = await prisma.place.update({
      where: { id: placeId },
      data: updateData
    })

    return {
      id: place.id,
      tripId: place.tripId,
      name: place.name,
      address: place.address,
      lat: fromDecimal(place.lat),
      lng: fromDecimal(place.lng),
      type: place.type,
      dayIndex: place.dayIndex,
      notes: place.notes,
      createdAt: place.createdAt
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
    // Get place and verify it exists
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      include: { trip: true }
    })

    if (!place) {
      const error: PlaceError = {
        code: 'NOT_FOUND',
        message: 'Place not found'
      }
      throw error
    }

    // Verify user owns the trip
    if (place.trip.userId !== userId) {
      const error: PlaceError = {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
      throw error
    }

    // Delete place (cascade deletion of sources is handled by database)
    await prisma.place.delete({
      where: { id: placeId }
    })
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
    const places = await prisma.place.findMany({
      where: { tripId },
      orderBy: [
        { dayIndex: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    const grouped: PlacesByDay = {}

    for (const place of places) {
      const placeData: Place = {
        id: place.id,
        tripId: place.tripId,
        name: place.name,
        address: place.address,
        lat: fromDecimal(place.lat),
        lng: fromDecimal(place.lng),
        type: place.type,
        dayIndex: place.dayIndex,
        notes: place.notes,
        createdAt: place.createdAt
      }

      if (place.dayIndex === null) {
        if (!grouped.unassigned) {
          grouped.unassigned = []
        }
        grouped.unassigned.push(placeData)
      } else {
        if (!grouped[place.dayIndex]) {
          grouped[place.dayIndex] = []
        }
        grouped[place.dayIndex].push(placeData)
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
    const total = await prisma.place.count({
      where: { tripId }
    })

    // Get paginated places
    const places = await prisma.place.findMany({
      where: { tripId },
      orderBy: [
        { dayIndex: 'asc' },
        { createdAt: 'asc' }
      ],
      skip,
      take: normalizedLimit
    })

    // Group places by day
    const grouped: PlacesByDay = {}

    for (const place of places) {
      const placeData: Place = {
        id: place.id,
        tripId: place.tripId,
        name: place.name,
        address: place.address,
        lat: fromDecimal(place.lat),
        lng: fromDecimal(place.lng),
        type: place.type,
        dayIndex: place.dayIndex,
        notes: place.notes,
        createdAt: place.createdAt
      }

      if (place.dayIndex === null) {
        if (!grouped.unassigned) {
          grouped.unassigned = []
        }
        grouped.unassigned.push(placeData)
      } else {
        if (!grouped[place.dayIndex]) {
          grouped[place.dayIndex] = []
        }
        grouped[place.dayIndex].push(placeData)
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

