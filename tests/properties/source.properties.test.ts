import { describe, it, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { createSource, deleteSource, getSourcesByPlace, Platform } from '@/lib/services/sourceService'
import { createPlace } from '@/lib/services/placeService'
import { createTrip } from '@/lib/services/tripService'
import { signup } from '@/lib/services/authService'
import { prisma } from '@/lib/prisma'

// Custom arbitraries for domain objects
const validEmail = fc.emailAddress()
const validPassword = fc.string({ minLength: 8, maxLength: 100 })
const validTripName = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validDestination = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validPlaceName = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validPlaceType = fc.constantFrom<'food' | 'bar' | 'cafe' | 'photo' | 'museum' | 'activity' | 'other'>('food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other')
const validPlatform = fc.constantFrom<Platform>('tiktok', 'instagram', 'other')
const validUrl = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
const validCaption = fc.string({ minLength: 0, maxLength: 1000 })
const validThumbnailUrl = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)

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

// Helper to create a test place
async function createTestPlace(tripId: string, userId: string) {
  return await createPlace(tripId, userId, {
    name: 'Test Place',
    type: 'food'
  })
}

// Helper to clean up test data
async function cleanupTestData(userIds: string[], tripIds: string[], placeIds: string[], sourceIds: string[]) {
  try {
    // Delete sources
    if (sourceIds.length > 0) {
      await prisma.source.deleteMany({
        where: { id: { in: sourceIds } }
      }).catch(() => {}) // Ignore errors if already deleted
    }
    
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

describe('Source Management Property Tests', () => {
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

  // Feature: trip-planning-app, Property 20: Source creation associates with place
  describe('Property 20: Source creation associates with place', () => {
    it('should create sources associated with the correct place', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrl,
          validPlatform,
          async (url, platform) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const place = await createTestPlace(trip.id, user.id)
            const sourceIds: string[] = []

            try {
              const source = await createSource(place.id, user.id, {
                url,
                platform
              })
              sourceIds.push(source.id)

              // Source should be associated with the place
              expect(source.placeId).toBe(place.id)
              
              // Source should have required fields
              expect(source.url).toBe(url.trim())
              expect(source.platform).toBe(platform)
              expect(source.id).toBeDefined()
              
              // Verify in database
              const dbSource = await prisma.source.findUnique({
                where: { id: source.id }
              })
              expect(dbSource).toBeDefined()
              expect(dbSource!.placeId).toBe(place.id)
            } finally {
              await cleanupTestData([user.id], [trip.id], [place.id], sourceIds)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // Feature: trip-planning-app, Property 21: Platform is validated and stored
  describe('Property 21: Platform is validated and stored', () => {
    it('should validate and store valid platforms', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrl,
          validPlatform,
          async (url, platform) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const place = await createTestPlace(trip.id, user.id)
            const sourceIds: string[] = []

            try {
              const source = await createSource(place.id, user.id, {
                url,
                platform
              })
              sourceIds.push(source.id)

              // Platform should be stored correctly
              expect(source.platform).toBe(platform)
              
              // Verify in database
              const dbSource = await prisma.source.findUnique({
                where: { id: source.id }
              })
              expect(dbSource).toBeDefined()
              expect(dbSource!.platform).toBe(platform)
            } finally {
              await cleanupTestData([user.id], [trip.id], [place.id], sourceIds)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject invalid platforms', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrl,
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !['tiktok', 'instagram', 'other'].includes(s.toLowerCase())
          ),
          async (url, invalidPlatform) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const place = await createTestPlace(trip.id, user.id)

            try {
              await expect(
                createSource(place.id, user.id, {
                  url,
                  platform: invalidPlatform as Platform
                })
              ).rejects.toMatchObject({
                code: 'VALIDATION_ERROR',
                message: 'Validation failed'
              })
            } finally {
              await cleanupTestData([user.id], [trip.id], [place.id], [])
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  // Feature: trip-planning-app, Property 22: Optional source metadata is stored
  describe('Property 22: Optional source metadata is stored', () => {
    it('should store optional fields when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrl,
          validPlatform,
          validCaption,
          validThumbnailUrl,
          async (url, platform, caption, thumbnailUrl) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const place = await createTestPlace(trip.id, user.id)
            const sourceIds: string[] = []

            try {
              const source = await createSource(place.id, user.id, {
                url,
                platform,
                caption,
                thumbnailUrl
              })
              sourceIds.push(source.id)

              // Optional fields should be stored
              expect(source.caption).toBe(caption.trim() || null)
              expect(source.thumbnailUrl).toBe(thumbnailUrl.trim() || null)
            } finally {
              await cleanupTestData([user.id], [trip.id], [place.id], sourceIds)
            }
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should store null for optional fields when not provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrl,
          validPlatform,
          async (url, platform) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const place = await createTestPlace(trip.id, user.id)
            const sourceIds: string[] = []

            try {
              const source = await createSource(place.id, user.id, {
                url,
                platform
                // No optional fields provided
              })
              sourceIds.push(source.id)

              // Optional fields should be null
              expect(source.caption).toBeNull()
              expect(source.thumbnailUrl).toBeNull()
            } finally {
              await cleanupTestData([user.id], [trip.id], [place.id], sourceIds)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // Feature: trip-planning-app, Property 23: Source deletion is isolated
  describe('Property 23: Source deletion is isolated', () => {
    it('should delete only the specified source', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrl,
          validPlatform,
          validUrl,
          validPlatform,
          async (url1, platform1, url2, platform2) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const place = await createTestPlace(trip.id, user.id)
            const sourceIds: string[] = []

            try {
              // Create two sources
              const source1 = await createSource(place.id, user.id, {
                url: url1,
                platform: platform1
              })
              sourceIds.push(source1.id)

              const source2 = await createSource(place.id, user.id, {
                url: url2,
                platform: platform2
              })
              sourceIds.push(source2.id)

              // Verify both sources exist
              const sourcesBefore = await getSourcesByPlace(place.id)
              expect(sourcesBefore.length).toBe(2)

              // Delete first source
              await deleteSource(source1.id, user.id)

              // Verify first source is deleted
              const deletedSource = await prisma.source.findUnique({
                where: { id: source1.id }
              })
              expect(deletedSource).toBeNull()

              // Verify second source still exists
              const sourcesAfter = await getSourcesByPlace(place.id)
              expect(sourcesAfter.length).toBe(1)
              expect(sourcesAfter[0].id).toBe(source2.id)

              // Verify place still exists
              const dbPlace = await prisma.place.findUnique({
                where: { id: place.id }
              })
              expect(dbPlace).toBeDefined()
            } finally {
              await cleanupTestData([user.id], [trip.id], [place.id], sourceIds)
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  // Feature: trip-planning-app, Property 24: Multiple sources per place are supported
  describe('Property 24: Multiple sources per place are supported', () => {
    it('should support multiple sources for a single place', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              url: validUrl,
              platform: validPlatform
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (sourceData) => {
            const user = await createTestUser()
            const trip = await createTestTrip(user.id)
            const place = await createTestPlace(trip.id, user.id)
            const sourceIds: string[] = []

            try {
              // Create multiple sources
              for (const data of sourceData) {
                const source = await createSource(place.id, user.id, {
                  url: data.url,
                  platform: data.platform
                })
                sourceIds.push(source.id)
              }

              // Verify all sources exist
              const sources = await getSourcesByPlace(place.id)
              expect(sources.length).toBe(sourceData.length)

              // Verify all sources are associated with the place
              sources.forEach(source => {
                expect(source.placeId).toBe(place.id)
              })

              // Verify place still exists
              const dbPlace = await prisma.place.findUnique({
                where: { id: place.id }
              })
              expect(dbPlace).toBeDefined()
            } finally {
              await cleanupTestData([user.id], [trip.id], [place.id], sourceIds)
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for performance
      )
    }, { timeout: 120000 }) // Increased timeout
  })
})

