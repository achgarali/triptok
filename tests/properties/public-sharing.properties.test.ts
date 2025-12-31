import { describe, it, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { getPublicTripBySlug, isPublicTrip } from '@/lib/services/publicTripService'
import { createTrip, getTripById } from '@/lib/services/tripService'
import { createPlace } from '@/lib/services/placeService'
import { createSource } from '@/lib/services/sourceService'
import { signup } from '@/lib/services/authService'
import { prisma } from '@/lib/prisma'

// Custom arbitraries for domain objects
const validEmail = fc.emailAddress()
const validPassword = fc.string({ minLength: 8, maxLength: 100 })
const validTripName = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validDestination = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validPlaceName = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
const validPlaceType = fc.constantFrom<'food' | 'bar' | 'cafe' | 'photo' | 'museum' | 'activity' | 'other'>('food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other')
const validPlatform = fc.constantFrom<'tiktok' | 'instagram' | 'other'>('tiktok', 'instagram', 'other')
const validUrl = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)

// Helper to create a test user
async function createTestUser() {
  const email = `test-${Date.now()}-${Math.random()}@example.com`
  const password = 'testpassword123'
  const user = await signup({ email, password })
  return user
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

describe('Public Sharing Property Tests', () => {
  afterEach(async () => {
    // Clean up all test data after each test
    await prisma.source.deleteMany({})
    await prisma.place.deleteMany({})
    await prisma.trip.deleteMany({})
    await prisma.user.deleteMany({})
  })

  // Feature: trip-planning-app, Property 29: Public trips are accessible via slug
  describe('Property 29: Public trips are accessible via slug', () => {
    it('should allow access to public trips via slug without authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          async (name, destination) => {
            const user = await createTestUser()
            const tripIds: string[] = []
            const placeIds: string[] = []
            const sourceIds: string[] = []

            try {
              // Create public trip
              const trip = await createTrip(user.id, {
                name,
                destination,
                isPublic: true
              })
              tripIds.push(trip.id)

              // Create place with source
              const place = await createPlace(trip.id, user.id, {
                name: 'Test Place',
                type: 'food'
              })
              placeIds.push(place.id)

              const source = await createSource(place.id, user.id, {
                url: 'https://tiktok.com/test',
                platform: 'tiktok'
              })
              sourceIds.push(source.id)

              // Access trip via slug without authentication
              const publicTrip = await getPublicTripBySlug(trip.slug)

              // Should return complete trip data
              expect(publicTrip).not.toBeNull()
              expect(publicTrip!.id).toBe(trip.id)
              expect(publicTrip!.name).toBe(name.trim())
              expect(publicTrip!.destination).toBe(destination.trim())
              expect(publicTrip!.isPublic).toBe(true)
              expect(publicTrip!.slug).toBe(trip.slug)
              
              // Should include places
              expect(publicTrip!.places).toBeDefined()
              expect(publicTrip!.places.length).toBe(1)
              expect(publicTrip!.places[0].id).toBe(place.id)
              
              // Should include sources
              expect(publicTrip!.places[0].sources).toBeDefined()
              expect(publicTrip!.places[0].sources.length).toBe(1)
              expect(publicTrip!.places[0].sources[0].id).toBe(source.id)
            } finally {
              await cleanupTestData([user.id], tripIds, placeIds, sourceIds)
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  // Feature: trip-planning-app, Property 30: Private trips are restricted to owners
  describe('Property 30: Private trips are restricted to owners', () => {
    it('should deny access to private trips via slug', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          async (name, destination) => {
            const user = await createTestUser()
            const tripIds: string[] = []

            try {
              // Create private trip (default)
              const trip = await createTrip(user.id, {
                name,
                destination,
                isPublic: false
              })
              tripIds.push(trip.id)

              // Try to access via slug without authentication
              const publicTrip = await getPublicTripBySlug(trip.slug)

              // Should return null (access denied)
              expect(publicTrip).toBeNull()
              
              // Verify isPublicTrip returns false
              const isPublic = await isPublicTrip(trip.slug)
              expect(isPublic).toBe(false)
            } finally {
              await cleanupTestData([user.id], tripIds, [], [])
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should allow owner to access private trip via getTripById', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          async (name, destination) => {
            const user = await createTestUser()
            const tripIds: string[] = []

            try {
              // Create private trip
              const trip = await createTrip(user.id, {
                name,
                destination,
                isPublic: false
              })
              tripIds.push(trip.id)

              // Owner should be able to access via getTripById
              const ownerTrip = await getTripById(trip.id, user.id)
              expect(ownerTrip).toBeDefined()
              expect(ownerTrip.id).toBe(trip.id)
              expect(ownerTrip.isPublic).toBe(false)
            } finally {
              await cleanupTestData([user.id], tripIds, [], [])
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // Feature: trip-planning-app, Property 31: Trips default to private
  describe('Property 31: Trips default to private', () => {
    it('should create trips as private by default', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          async (name, destination) => {
            const user = await createTestUser()
            const tripIds: string[] = []

            try {
              // Create trip without specifying isPublic
              const trip = await createTrip(user.id, {
                name,
                destination
                // isPublic not specified
              })
              tripIds.push(trip.id)

              // Should default to private
              expect(trip.isPublic).toBe(false)
              
              // Verify in database
              const dbTrip = await prisma.trip.findUnique({
                where: { id: trip.id }
              })
              expect(dbTrip).toBeDefined()
              expect(dbTrip!.isPublic).toBe(false)
              
              // Should not be accessible via public slug
              const publicTrip = await getPublicTripBySlug(trip.slug)
              expect(publicTrip).toBeNull()
            } finally {
              await cleanupTestData([user.id], tripIds, [], [])
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // Feature: trip-planning-app, Property 32: Public trip data is complete
  describe('Property 32: Public trip data is complete', () => {
    it('should return complete trip data including all places and sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTripName,
          validDestination,
          fc.array(
            fc.record({
              placeName: validPlaceName,
              placeType: validPlaceType,
              sourceUrl: validUrl,
              platform: validPlatform
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (name, destination, placeData) => {
            const user = await createTestUser()
            const tripIds: string[] = []
            const placeIds: string[] = []
            const sourceIds: string[] = []

            try {
              // Create public trip
              const trip = await createTrip(user.id, {
                name,
                destination,
                isPublic: true
              })
              tripIds.push(trip.id)

              // Create places with sources
              for (const data of placeData) {
                const place = await createPlace(trip.id, user.id, {
                  name: data.placeName,
                  type: data.placeType
                })
                placeIds.push(place.id)

                const source = await createSource(place.id, user.id, {
                  url: data.sourceUrl,
                  platform: data.platform
                })
                sourceIds.push(source.id)
              }

              // Get public trip
              const publicTrip = await getPublicTripBySlug(trip.slug)

              // Should return complete data
              expect(publicTrip).not.toBeNull()
              expect(publicTrip!.id).toBe(trip.id)
              expect(publicTrip!.name).toBe(name.trim())
              expect(publicTrip!.destination).toBe(destination.trim())
              expect(publicTrip!.isPublic).toBe(true)
              expect(publicTrip!.slug).toBe(trip.slug)
              expect(publicTrip!.startDate).toEqual(trip.startDate)
              expect(publicTrip!.endDate).toEqual(trip.endDate)
              
              // Should include all places
              expect(publicTrip!.places.length).toBe(placeData.length)
              
              // Should include all sources for each place
              for (let i = 0; i < placeData.length; i++) {
                const place = publicTrip!.places[i]
                expect(place).toBeDefined()
                expect(place.name).toBe(placeData[i].placeName.trim())
                expect(place.type).toBe(placeData[i].placeType)
                expect(place.sources.length).toBe(1)
                expect(place.sources[0].url).toBe(placeData[i].sourceUrl.trim())
                expect(place.sources[0].platform).toBe(placeData[i].platform)
              }
            } finally {
              await cleanupTestData([user.id], tripIds, placeIds, sourceIds)
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for performance
      )
    }, { timeout: 120000 }) // Increased timeout
  })
})

