import { prisma } from '@/lib/prisma'
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
    
    const existingTrip = await prisma.trip.findUnique({
      where: { slug }
    })

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
        const trip = await prisma.trip.create({
          data: {
            userId,
            name: name.trim(),
            destination: destination.trim(),
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            isPublic,
            slug
          }
        })

        return {
          id: trip.id,
          userId: trip.userId,
          name: trip.name,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          isPublic: trip.isPublic,
          slug: trip.slug,
          createdAt: trip.createdAt
        }
      } catch (createError: any) {
        // If it's a unique constraint error on slug, generate a new one
        if (createError.code === 'P2002' && createError.meta?.target?.includes('slug')) {
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
    const trips = await prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return trips.map((trip: typeof trips[0]) => ({
      id: trip.id,
      userId: trip.userId,
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      isPublic: trip.isPublic,
      slug: trip.slug,
      createdAt: trip.createdAt
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
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    })

    if (!trip) {
      const error: TripError = {
        code: 'NOT_FOUND',
        message: 'Trip not found'
      }
      throw error
    }

    // Check ownership
    if (trip.userId !== userId) {
      const error: TripError = {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
      throw error
    }

    return {
      id: trip.id,
      userId: trip.userId,
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      isPublic: trip.isPublic,
      slug: trip.slug,
      createdAt: trip.createdAt
    }
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
    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (destination !== undefined) updateData.destination = destination.trim()
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (isPublic !== undefined) updateData.isPublic = isPublic

    // Update trip
    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData
    })

    return {
      id: trip.id,
      userId: trip.userId,
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      isPublic: trip.isPublic,
      slug: trip.slug,
      createdAt: trip.createdAt
    }
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
 * Delete a trip with ownership validation and cascade deletion
 * 
 * @throws TripError if trip not found or user doesn't own it
 */
export async function deleteTrip(tripId: string, userId: string): Promise<void> {
  // Verify trip exists and user owns it
  await getTripById(tripId, userId)

  try {
    // Delete trip (cascade deletion of places and sources is handled by database)
    await prisma.trip.delete({
      where: { id: tripId }
    })
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

