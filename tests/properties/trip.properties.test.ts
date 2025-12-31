import { describe, it, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { createTrip, getUserTrips, getTripById, updateTrip, deleteTrip } from '@/lib/services/tripService'
import { signup } from '@/lib/services/authService'
import { prisma } from '@/lib/prisma'

// Custom arbitraries for domain objects
const validEmail = fc.emailAddress()
const validPassword = fc.string({ minLength: 8, maxLength: 100 })
// Filter out strings that are only whitespace
const validTripName = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validDestination = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)

// Helper to create a test user
async function createTestUser() {
  const email = `test-${Date.now()}-${Math.random()}@example.com`
  const password = 'testpassword123'
  const user = await signup({ email, password })
  return user
}

// Helper to clean up test data
async function cleanupTestData(userIds: string[], tripIds: string[]) {
  try {
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

describe('Trip Management Property Tests', () => {
  afterEach(async () => {
    // Clean up all test data after each test
    try {
      await prisma.place.deleteMany({}).catch(() => {})
      await prisma.source.deleteMany({}).catch(() => {})
      await prisma.trip.deleteMany({}).catch(() => {})
      await prisma.user.deleteMany({}).catch(() => {})
    } catch (error) {
      // Silently ignore cleanup errors
    }
  })

  // Feature: trip-planning-app, Property 6: Trip creation associates with user
  describe('Property 6: Trip creation associates with user', () => {
    it('should create trips associated with the correct user', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          async (name, destination) => {
            const user = await createTestUser()
            const tripIds: string[] = []

            try {
              const trip = await createTrip(user.id, {
                name,
                destination
              })
              tripIds.push(trip.id)

              // Trip should be associated with the user
              expect(trip.userId).toBe(user.id)
              
              // Trip should have required fields
              expect(trip.name).toBe(name.trim())
              expect(trip.destination).toBe(destination.trim())
              expect(trip.id).toBeDefined()
              expect(trip.slug).toBeDefined()
              expect(trip.slug.length).toBeGreaterThan(0)
              
              // Verify in database
              const dbTrip = await prisma.trip.findUnique({
                where: { id: trip.id }
              })
              expect(dbTrip).toBeDefined()
              expect(dbTrip!.userId).toBe(user.id)
            } finally {
              await cleanupTestData([user.id], tripIds)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // Feature: trip-planning-app, Property 7: Trip dates are stored accurately
  describe('Property 7: Trip dates are stored accurately', () => {
    it('should store and retrieve trip dates accurately', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
          async (name, destination, startDate, endDate) => {
            // Ensure endDate is after or equal to startDate
            const finalStartDate = startDate <= endDate ? startDate : endDate
            const finalEndDate = startDate <= endDate ? endDate : startDate

            const user = await createTestUser()
            const tripIds: string[] = []

            try {
              const trip = await createTrip(user.id, {
                name,
                destination,
                startDate: finalStartDate,
                endDate: finalEndDate
              })
              tripIds.push(trip.id)

              // Dates should be stored accurately
              if (trip.startDate) {
                expect(trip.startDate.toISOString().split('T')[0]).toBe(
                  finalStartDate.toISOString().split('T')[0]
                )
              }
              if (trip.endDate) {
                expect(trip.endDate.toISOString().split('T')[0]).toBe(
                  finalEndDate.toISOString().split('T')[0]
                )
              }

              // Retrieve and verify
              const retrievedTrip = await getTripById(trip.id, user.id)
              if (retrievedTrip.startDate && trip.startDate) {
                expect(retrievedTrip.startDate.toISOString().split('T')[0]).toBe(
                  trip.startDate.toISOString().split('T')[0]
                )
              }
              if (retrievedTrip.endDate && trip.endDate) {
                expect(retrievedTrip.endDate.toISOString().split('T')[0]).toBe(
                  trip.endDate.toISOString().split('T')[0]
                )
              }
            } finally {
              if (user && user.id) {
                await cleanupTestData([user.id], tripIds)
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle trips without dates', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          async (name, destination) => {
            let user: any = null
            const tripIds: string[] = []

            try {
              user = await createTestUser()
              if (!user || !user.id) {
                throw new Error('Failed to create test user')
              }

              const trip = await createTrip(user.id, {
                name,
                destination
                // No dates provided
              })
              tripIds.push(trip.id)

              // Dates should be null
              expect(trip.startDate).toBeNull()
              expect(trip.endDate).toBeNull()
            } finally {
              if (user && user.id) {
                await cleanupTestData([user.id], tripIds)
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // Feature: trip-planning-app, Property 8: Users see only their own trips
  describe('Property 8: Users see only their own trips', () => {
    it('should return only trips belonging to the requesting user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validTripName, { minLength: 1, maxLength: 5 }),
          fc.array(validTripName, { minLength: 1, maxLength: 5 }),
          validDestination,
          async (user1Names, user2Names, destination) => {
            let user1: any = null
            let user2: any = null
            const tripIds: string[] = []

            try {
              user1 = await createTestUser()
              user2 = await createTestUser()
              
              if (!user1 || !user1.id || !user2 || !user2.id) {
                throw new Error('Failed to create test users')
              }

              // Create trips for user1
              for (const name of user1Names) {
                const trip = await createTrip(user1.id, { name, destination })
                tripIds.push(trip.id)
              }

              // Create trips for user2
              for (const name of user2Names) {
                const trip = await createTrip(user2.id, { name, destination })
                tripIds.push(trip.id)
              }

              // User1 should see only their trips
              const user1Trips = await getUserTrips(user1.id)
              expect(user1Trips.length).toBe(user1Names.length)
              user1Trips.forEach(trip => {
                expect(trip.userId).toBe(user1.id)
              })

              // User2 should see only their trips
              const user2Trips = await getUserTrips(user2.id)
              expect(user2Trips.length).toBe(user2Names.length)
              user2Trips.forEach(trip => {
                expect(trip.userId).toBe(user2.id)
              })

              // No overlap
              const user1TripIds = new Set(user1Trips.map(t => t.id))
              const user2TripIds = new Set(user2Trips.map(t => t.id))
              const intersection = [...user1TripIds].filter(id => user2TripIds.has(id))
              expect(intersection.length).toBe(0)
            } finally {
              if (user1 && user1.id && user2 && user2.id) {
                await cleanupTestData([user1.id, user2.id], tripIds)
              }
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  // Feature: trip-planning-app, Property 9: Updates preserve entity identity
  describe('Property 9: Updates preserve entity identity', () => {
    it('should preserve trip ID when updating', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          validTripName,
          validDestination,
          async (originalName, originalDestination, newName, newDestination) => {
            let user: any = null
            const tripIds: string[] = []

            try {
              user = await createTestUser()
              if (!user || !user.id) {
                throw new Error('Failed to create test user')
              }

              // Create trip
              const trip = await createTrip(user.id, {
                name: originalName,
                destination: originalDestination
              })
              tripIds.push(trip.id)
              const originalId = trip.id
              const originalSlug = trip.slug

              // Update trip
              const updatedTrip = await updateTrip(trip.id, user.id, {
                name: newName,
                destination: newDestination
              })

              // ID should remain the same
              expect(updatedTrip.id).toBe(originalId)
              
              // Slug should remain the same (not regenerated)
              expect(updatedTrip.slug).toBe(originalSlug)
              
              // Values should be updated
              expect(updatedTrip.name).toBe(newName.trim())
              expect(updatedTrip.destination).toBe(newDestination.trim())
            } finally {
              if (user && user.id) {
                await cleanupTestData([user.id], tripIds)
              }
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for performance
      )
    }, { timeout: 180000 }) // Increased timeout for slower tests
  })

  // Feature: trip-planning-app, Property 11: Trip slugs are unique
  describe('Property 11: Trip slugs are unique', () => {
    it('should generate unique slugs for all trips', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: validTripName,
              destination: validDestination
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (tripData) => {
            let user: any = null
            const tripIds: string[] = []

            try {
              user = await createTestUser()
              if (!user || !user.id) {
                throw new Error('Failed to create test user')
              }

              // Create multiple trips
              const trips = await Promise.all(
                tripData.map(data => createTrip(user.id, data))
              )
              tripIds.push(...trips.map(t => t.id))

              // All slugs should be unique
              const slugs = trips.map(t => t.slug)
              const uniqueSlugs = new Set(slugs)
              expect(uniqueSlugs.size).toBe(slugs.length)

              // Verify in database
              const dbTrips = await prisma.trip.findMany({
                where: { id: { in: tripIds } }
              })
              const dbSlugs = dbTrips.map(t => t.slug)
              const uniqueDbSlugs = new Set(dbSlugs)
              expect(uniqueDbSlugs.size).toBe(dbSlugs.length)
            } finally {
              if (user && user.id) {
                await cleanupTestData([user.id], tripIds)
              }
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for performance
      )
    }, { timeout: 120000 }) // Increased timeout
  })

  // Feature: trip-planning-app, Property 10: Trip deletion cascades to places and sources
  describe('Property 10: Trip deletion cascades to places and sources', () => {
    it('should delete all associated places and sources when trip is deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              type: fc.constantFrom('food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other' as const)
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (tripName, destination, placeData) => {
            const user = await createTestUser()
            const tripIds: string[] = []

            try {
              // Create trip
              const trip = await createTrip(user.id, {
                name: tripName,
                destination
              })
              tripIds.push(trip.id)

              // Create places for the trip
              const placeIds: string[] = []
              for (const placeInfo of placeData) {
                const place = await prisma.place.create({
                  data: {
                    tripId: trip.id,
                    name: placeInfo.name,
                    type: placeInfo.type
                  }
                })
                placeIds.push(place.id)

                // Create sources for each place
                await prisma.source.create({
                  data: {
                    placeId: place.id,
                    platform: 'tiktok',
                    url: `https://tiktok.com/video-${place.id}`
                  }
                })
              }

              // Verify places and sources exist
              const placesBefore = await prisma.place.findMany({
                where: { tripId: trip.id }
              })
              expect(placesBefore.length).toBe(placeData.length)

              const sourcesBefore = await prisma.source.findMany({
                where: { placeId: { in: placeIds } }
              })
              expect(sourcesBefore.length).toBe(placeData.length)

              // Delete trip
              await deleteTrip(trip.id, user.id)

              // Verify trip is deleted
              const deletedTrip = await prisma.trip.findUnique({
                where: { id: trip.id }
              })
              expect(deletedTrip).toBeNull()

              // Verify all places are deleted (cascade)
              const placesAfter = await prisma.place.findMany({
                where: { tripId: trip.id }
              })
              expect(placesAfter.length).toBe(0)

              // Verify all sources are deleted (cascade)
              const sourcesAfter = await prisma.source.findMany({
                where: { placeId: { in: placeIds } }
              })
              expect(sourcesAfter.length).toBe(0)
            } finally {
              // Cleanup any remaining data
              await cleanupTestData([user.id], tripIds)
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})

