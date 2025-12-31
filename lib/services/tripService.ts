import { query, queryOne } from '@/lib/db'
import { nanoid } from 'nanoid'

export interface CreateTripInput {
  name: string
  destination: string
  startDate?: Date
  endDate?: Date
  isPublic?: boolean
}

export interface UpdateTripInput {
  name?: string
  destination?: string
  startDate?: Date | null
  endDate?: Date | null
  isPublic?: boolean
}

export interface Trip {
  id: string
  userId: string
  name: string
  destination: string
  startDate: Date | null
  endDate: Date | null
  isPublic: boolean
  slug: string
  createdAt: Date
}

export interface TripError {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'INTERNAL_ERROR'
  message: string
  details?: Array<{ field: string; message: string }>
}

/**
 * Validates trip name (non-empty after trim)
 */
function isValidTripName(name: string): boolean {
  return typeof name === 'string' && name.trim().length > 0
}

/**
 * Validates trip destination (non-empty after trim)
 */
function isValidDestination(destination: string): boolean {
  return typeof destination === 'string' && destination.trim().length > 0
}

/**
 * Validates date range (endDate must be after or equal to startDate)
 */
function isValidDateRange(startDate: Date | null, endDate: Date | null): boolean {
  if (!startDate || !endDate) {
    return true // Dates are optional
  }
  return endDate >= startDate
}

/**
 * Generates a unique slug for a trip
 */
async function generateUniqueSlug(): Promise<string> {
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  while (!isUnique && attempts < maxAttempts) {
    const slug = nanoid(10) // Generate 10-character slug
    
    const existingTrip = await queryOne<{ id: string }>(
      'SELECT id FROM trips WHERE slug = $1',
      [slug]
    )

    if (!existingTrip) {
      return slug
    }

    attempts++
  }

  // Fallback: use nanoid with timestamp if all attempts fail
  return `${nanoid(8)}-${Date.now()}`
}

/**
 * Create a new trip with slug generation
 * Validates name and destination
 * 
 * @throws TripError if validation fails
 */
export async function createTrip(userId: string, input: CreateTripInput): Promise<Trip> {
  const { name, destination, startDate, endDate, isPublic = false } = input

  // Validate name
  if (!isValidTripName(name)) {
    const error: TripError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'name', message: 'Trip name is required' }]
    }
    throw error
  }

  // Validate destination
  if (!isValidDestination(destination)) {
    const error: TripError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'destination', message: 'Destination is required' }]
    }
    throw error
  }

  // Validate date range
  if (!isValidDateRange(startDate || null, endDate || null)) {
    const error: TripError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'endDate', message: 'End date must be after or equal to start date' }]
    }
    throw error
  }

  try {
    // Generate unique slug
    let slug = await generateUniqueSlug()
    let attempts = 0
    const maxAttempts = 10

    // Retry if slug collision occurs (very rare but possible)
    while (attempts < maxAttempts) {
      try {
        const trip = await queryOne<{
          id: string
          user_id: string
          name: string
          destination: string
          start_date: Date | null
          end_date: Date | null
          is_public: boolean
          slug: string
          created_at: Date
        }>(
          `INSERT INTO trips (id, user_id, name, destination, start_date, end_date, is_public, slug)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
           RETURNING id, user_id, name, destination, start_date, end_date, is_public, slug, created_at`,
          [
            userId,
            name.trim(),
            destination.trim(),
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null,
            isPublic,
            slug
          ]
        )

        if (!trip) {
          throw new Error('Failed to create trip')
        }

        return {
          id: trip.id,
          userId: trip.user_id,
          name: trip.name,
          destination: trip.destination,
          startDate: trip.start_date,
          endDate: trip.end_date,
          isPublic: trip.is_public,
          slug: trip.slug,
          createdAt: trip.created_at
        }
      } catch (createError: any) {
        // If it's a unique constraint error on slug (PostgreSQL error code 23505), generate a new one
        if (createError.code === '23505' && createError.constraint?.includes('slug')) {
          attempts++
          slug = await generateUniqueSlug()
          continue
        }
        // Otherwise, re-throw the error
        throw createError
      }
    }

    // If we exhausted all attempts, throw error
    const tripError: TripError = {
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate unique slug after multiple attempts'
    }
    throw tripError
  } catch (error: any) {
    // Re-throw TripError as-is
    if (error.code) {
      throw error
    }

    // Wrap unexpected errors
    const tripError: TripError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw tripError
  }
}

/**
 * Get all trips for a user
 * Returns trips ordered by creation date (newest first)
 */
export async function getUserTrips(userId: string): Promise<Trip[]> {
  try {
    const trips = await query<{
      id: string
      user_id: string
      name: string
      destination: string
      start_date: Date | null
      end_date: Date | null
      is_public: boolean
      slug: string
      created_at: Date
    }>(
      'SELECT id, user_id, name, destination, start_date, end_date, is_public, slug, created_at FROM trips WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )

    return trips.map((trip) => ({
      id: trip.id,
      userId: trip.user_id,
      name: trip.name,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      isPublic: trip.is_public,
      slug: trip.slug,
      createdAt: trip.created_at
    }))
  } catch (error: any) {
    const tripError: TripError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw tripError
  }
}

/**
 * Get a trip by ID with ownership validation
 * 
 * @throws TripError if trip not found or user doesn't own it
 */
export async function getTripById(tripId: string, userId: string): Promise<Trip> {
  try {
    const trip = await queryOne<{
      id: string
      user_id: string
      name: string
      destination: string
      start_date: Date | null
      end_date: Date | null
      is_public: boolean
      slug: string
      created_at: Date
    }>(
      'SELECT id, user_id, name, destination, start_date, end_date, is_public, slug, created_at FROM trips WHERE id = $1',
      [tripId]
    )

    if (!trip) {
      const error: TripError = {
        code: 'NOT_FOUND',
        message: 'Trip not found'
      }
      throw error
    }

    // Check ownership
    if (trip.user_id !== userId) {
      const error: TripError = {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
      throw error
    }

    return {
      id: trip.id,
      userId: trip.user_id,
      name: trip.name,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      isPublic: trip.is_public,
      slug: trip.slug,
      createdAt: trip.created_at
    }
  } catch (error: any) {
    // Re-throw TripError as-is
    if (error.code && ['NOT_FOUND', 'FORBIDDEN', 'VALIDATION_ERROR', 'CONFLICT'].includes(error.code)) {
      throw error
    }

    // Wrap unexpected errors
    const tripError: TripError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw tripError
  }
}

/**
 * Update a trip with ownership validation
 * 
 * @throws TripError if trip not found, user doesn't own it, or validation fails
 */
export async function updateTrip(
  tripId: string,
  userId: string,
  input: UpdateTripInput
): Promise<Trip> {
  // First, verify trip exists and user owns it
  const existingTrip = await getTripById(tripId, userId)

  const { name, destination, startDate, endDate, isPublic } = input

  // Validate name if provided
  if (name !== undefined && !isValidTripName(name)) {
    const error: TripError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'name', message: 'Trip name is required' }]
    }
    throw error
  }

  // Validate destination if provided
  if (destination !== undefined && !isValidDestination(destination)) {
    const error: TripError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'destination', message: 'Destination is required' }]
    }
    throw error
  }

  // Validate date range
  const finalStartDate = startDate !== undefined ? startDate : existingTrip.startDate
  const finalEndDate = endDate !== undefined ? endDate : existingTrip.endDate

  if (!isValidDateRange(finalStartDate, finalEndDate)) {
    const error: TripError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'endDate', message: 'End date must be after or equal to start date' }]
    }
    throw error
  }

  try {
    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name.trim())
    }
    if (destination !== undefined) {
      updates.push(`destination = $${paramIndex++}`)
      values.push(destination.trim())
    }
    if (startDate !== undefined) {
      updates.push(`start_date = $${paramIndex++}`)
      values.push(startDate ? new Date(startDate) : null)
    }
    if (endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`)
      values.push(endDate ? new Date(endDate) : null)
    }
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`)
      values.push(isPublic)
    }

    if (updates.length === 0) {
      // No updates, return existing trip
      return existingTrip
    }

    // Add tripId and userId for WHERE clause
    values.push(tripId, userId)

    const trip = await queryOne<{
      id: string
      user_id: string
      name: string
      destination: string
      start_date: Date | null
      end_date: Date | null
      is_public: boolean
      slug: string
      created_at: Date
    }>(
      `UPDATE trips SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING id, user_id, name, destination, start_date, end_date, is_public, slug, created_at`,
      values
    )

    if (!trip) {
      const error: TripError = {
        code: 'NOT_FOUND',
        message: 'Trip not found'
      }
      throw error
    }

    return {
      id: trip.id,
      userId: trip.user_id,
      name: trip.name,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      isPublic: trip.is_public,
      slug: trip.slug,
      createdAt: trip.created_at
    }
  } catch (error: any) {
    // Re-throw TripError as-is
    if (error.code && ['NOT_FOUND', 'FORBIDDEN', 'VALIDATION_ERROR', 'CONFLICT'].includes(error.code)) {
      throw error
    }

    // Wrap unexpected errors
    const tripError: TripError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw tripError
  }
}

/**
 * Delete a trip with ownership validation and cascade deletion
 * 
 * @throws TripError if trip not found or user doesn't own it
 */
export async function deleteTrip(tripId: string, userId: string): Promise<void> {
  // Verify trip exists and user owns it
  await getTripById(tripId, userId)

  try {
    // Delete trip (cascade deletion of places and sources is handled by database)
    const result = await query(
      'DELETE FROM trips WHERE id = $1 AND user_id = $2',
      [tripId, userId]
    )

    // Check if trip was actually deleted
    if (result.length === 0) {
      const error: TripError = {
        code: 'NOT_FOUND',
        message: 'Trip not found'
      }
      throw error
    }
  } catch (error: any) {
    // Re-throw TripError as-is
    if (error.code && ['NOT_FOUND', 'FORBIDDEN', 'VALIDATION_ERROR', 'CONFLICT'].includes(error.code)) {
      throw error
    }

    // Wrap unexpected errors
    const tripError: TripError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw tripError
  }
}

