import { describe, it, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { createPlace, updatePlace, deletePlace, getPlacesByTrip, PlaceType } from '@/lib/services/placeService'
import { createTrip } from '@/lib/services/tripService'
import { signup } from '@/lib/services/authService'
import { prisma } from '@/lib/prisma'

// Custom arbitraries for domain objects
const validEmail = fc.emailAddress()
const validPassword = fc.string({ minLength: 8, maxLength: 100 })
const validTripName = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validDestination = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validPlaceName = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validPlaceType = fc.constantFrom<PlaceType>('food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other')
const validLatitude = fc.float({ min: -90, max: 90 })
const validLongitude = fc.float({ min: -180, max: 180 })
const validAddress = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
const validNotes = fc.string({ minLength: 0, maxLength: 1000 })

// Helper to create a test user
async function createTestUser() {
  const email = `test-${Date.now()}-${Math.random()}@example.com`
  const password = 'testpassword123'
  const user = await signup({ email, password })
  return user
}

// Helper to create a test trip
async function createTestTrip(userId: string) {
  return await createTrip(userId, {
    name: 'Test Trip',
    destination: 'Test Destination'
  })
}

// Helper to clean up test data
async function cleanupTestData(userIds: string[], tripIds: string[], placeIds: string[]) {
  try {
    // Delete places (cascade will handle sources)
    if (placeIds.length > 0) {
      await prisma.place.deleteMany({
        where: { id: { in: placeIds } }
      }).catch(() => {}) // Ignore errors if already deleted
    }
    
    // Delete trips (cascade will handle places and sources)
    if (tripIds.length > 0) {
      await prisma.trip.deleteMany({
        where: { id: { in: tripIds } }
      }).catch(() => {}) // Ignore errors if already deleted
    }
    
    // Delete users
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      }).catch(() => {}) // Ignore errors if already deleted
    }
  } catch (error) {
    // Silently ignore cleanup errors
  }
}

describe('Place Management Property Tests', () => {
  afterEach(async () => {
    // Clean up all test data after each test
    try {
      await prisma.source.deleteMany({}).catch(() => {})
      await prisma.place.deleteMany({}).catch(() => {})
      await prisma.trip.deleteMany({}).catch(() => {})
      await prisma.user.deleteMany({}).catch(() => {})
    } catch (error) {
      // Silently ignore cleanup errors
    }
  })

  // Feature: trip-planning-app, Property 12: Place creation associates with trip
  describe('Property 12: Place creation associates with trip', () => {
    it('should create places associated with the correct trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          validPlaceType,
          async (name, type) => {
            let user: any = null
            let trip: any = null
            const placeIds: string[] = []

            try {
              user = await createTestUser()
              if (!user || !user.id) {
                throw new Error('Failed to create test user')
              }

              trip = await createTestTrip(user.id)
              if (!trip || !trip.id) {
                throw new Error('Failed to create test trip')
              }

              const place = await createPlace(trip.id, user.id, {
                name,
                type
              })
              placeIds.push(place.id)

              // Place should be associated with the trip
              expect(place.tripId).toBe(trip.id)
              
              // Place should have required fields
              expect(place.name).toBe(name.trim())
              expect(place.type).toBe(type)
              expect(place.id).toBeDefined()
              
              // Verify in database
              const dbPlace = await prisma.place.findUnique({
                where: { id: place.id }
              })
              expect(dbPlace).toBeDefined()
              expect(dbPlace!.tripId).toBe(trip.id)
            } finally {
              if (user && user.id && trip && trip.id) {
                await cleanupTestData([user.id], [trip.id], placeIds)
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // Feature: trip-planning-app, Property 13: Optional place data is stored when provided
  describe('Property 13: Optional place data is stored when provided', () => {
    it('should store optional fields when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          validPlaceType,
          validAddress,
          validLatitude,
          validLongitude,
          validNotes,
          async (name, type, address, lat, lng, notes) => {
            let user: any = null
            let trip: any = null
            const placeIds: string[] = []

            try {
              user = await createTestUser()
              if (!user || !user.id) {
                throw new Error('Failed to create test user')
              }

              trip = await createTestTrip(user.id)
              if (!trip || !trip.id) {
                throw new Error('Failed to create test trip')
              }

              const place = await createPlace(trip.id, user.id, {
                name,
                type,
                address,
                lat,
                lng,
                notes
              })
              placeIds.push(place.id)

              // Optional fields should be stored
              expect(place.address).toBe(address.trim())
              expect(place.lat).toBeCloseTo(lat, 8)
              expect(place.lng).toBeCloseTo(lng, 8)
              expect(place.notes).toBe(notes.trim() || null)
            } finally {
              if (user && user.id && trip && trip.id) {
                await cleanupTestData([user.id], [trip.id], placeIds)
              }
            }
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should store null for optional fields when not provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          validPlaceType,
          async (name, type) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const placeIds: string[] = []

            try {
              const place = await createPlace(trip.id, user.id, {
                name,
                type
                // No optional fields provided
              })
              placeIds.push(place.id)

              // Optional fields should be null
              expect(place.address).toBeNull()
              expect(place.lat).toBeNull()
              expect(place.lng).toBeNull()
              expect(place.notes).toBeNull()
              expect(place.dayIndex).toBeNull()
            } finally {
              await cleanupTestData([user.id], [trip.id], placeIds)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // Feature: trip-planning-app, Property 14: Invalid place types are rejected
  describe('Property 14: Invalid place types are rejected', () => {
    it('should reject invalid place types on creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !['food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other'].includes(s.toLowerCase())
          ),
          async (name, invalidType) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)

            try {
              await expect(
                createPlace(trip.id, user.id, {
                  name,
                  type: invalidType as PlaceType
                })
              ).rejects.toMatchObject({
                code: 'VALIDATION_ERROR',
                message: 'Validation failed'
              })
            } finally {
              await cleanupTestData([user.id], [trip.id], [])
            }
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should reject invalid place types on update', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          validPlaceType,
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !['food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other'].includes(s.toLowerCase())
          ),
          async (name, validType, invalidType) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const placeIds: string[] = []

            try {
              // Create place with valid type
              const place = await createPlace(trip.id, user.id, {
                name,
                type: validType
              })
              placeIds.push(place.id)

              // Try to update with invalid type
              await expect(
                updatePlace(place.id, user.id, {
                  type: invalidType as PlaceType
                })
              ).rejects.toMatchObject({
                code: 'VALIDATION_ERROR',
                message: 'Validation failed'
              })
            } finally {
              await cleanupTestData([user.id], [trip.id], placeIds)
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  // Feature: trip-planning-app, Property 15: Place deletion cascades to sources
  describe('Property 15: Place deletion cascades to sources', () => {
    it('should delete all associated sources when place is deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          validPlaceType,
          fc.array(
            fc.record({
              platform: fc.constantFrom('tiktok', 'instagram', 'other' as const),
              url: fc.string({ minLength: 1, maxLength: 500 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (name, type, sourceData) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const placeIds: string[] = []

            try {
              // Create place
              const place = await createPlace(trip.id, user.id, {
                name,
                type
              })
              placeIds.push(place.id)

              // Create sources for the place
              const sourceIds: string[] = []
              for (const sourceInfo of sourceData) {
                const source = await prisma.source.create({
                  data: {
                    placeId: place.id,
                    platform: sourceInfo.platform,
                    url: sourceInfo.url
                  }
                })
                sourceIds.push(source.id)
              }

              // Verify sources exist
              const sourcesBefore = await prisma.source.findMany({
                where: { placeId: place.id }
              })
              expect(sourcesBefore.length).toBe(sourceData.length)

              // Delete place
              await deletePlace(place.id, user.id)

              // Verify place is deleted
              const deletedPlace = await prisma.place.findUnique({
                where: { id: place.id }
              })
              expect(deletedPlace).toBeNull()

              // Verify all sources are deleted (cascade)
              const sourcesAfter = await prisma.source.findMany({
                where: { placeId: place.id }
              })
              expect(sourcesAfter.length).toBe(0)
            } finally {
              // Cleanup any remaining data
              await cleanupTestData([user.id], [trip.id], placeIds)
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})

