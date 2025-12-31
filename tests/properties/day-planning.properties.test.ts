import { describe, it, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { createPlace, updatePlace, getPlacesByTrip, PlaceType } from '@/lib/services/placeService'
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
const validDayIndex = fc.integer({ min: 1, max: 30 }) // Reasonable day range

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

describe('Day Planning Property Tests', () => {
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

  // Feature: trip-planning-app, Property 16: Day index assignment is stored
  describe('Property 16: Day index assignment is stored', () => {
    it('should store day index when assigned during creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          validPlaceType,
          validDayIndex,
          async (name, type, dayIndex) => {
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
                dayIndex
              })
              placeIds.push(place.id)

              // Day index should be stored
              expect(place.dayIndex).toBe(dayIndex)
              
              // Verify in database
              const dbPlace = await prisma.place.findUnique({
                where: { id: place.id }
              })
              expect(dbPlace).toBeDefined()
              expect(dbPlace!.dayIndex).toBe(dayIndex)
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

  // Feature: trip-planning-app, Property 17: Day index updates are reflected
  describe('Property 17: Day index updates are reflected', () => {
    it('should update day index when changed', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          validPlaceType,
          validDayIndex,
          validDayIndex,
          async (name, type, originalDayIndex, newDayIndex) => {
            // Only test when day indices are different
            if (originalDayIndex === newDayIndex) {
              return
            }

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

              // Create place with original day index
              const place = await createPlace(trip.id, user.id, {
                name,
                type,
                dayIndex: originalDayIndex
              })
              placeIds.push(place.id)

              expect(place.dayIndex).toBe(originalDayIndex)

              // Update day index
              const updatedPlace = await updatePlace(place.id, user.id, {
                dayIndex: newDayIndex
              })

              // Day index should be updated
              expect(updatedPlace.dayIndex).toBe(newDayIndex)
              expect(updatedPlace.dayIndex).not.toBe(originalDayIndex)

              // Verify in database
              const dbPlace = await prisma.place.findUnique({
                where: { id: place.id }
              })
              expect(dbPlace).toBeDefined()
              expect(dbPlace!.dayIndex).toBe(newDayIndex)
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

    it('should allow setting day index to null', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPlaceName,
          validPlaceType,
          validDayIndex,
          async (name, type, dayIndex) => {
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

              // Create place with day index
              const place = await createPlace(trip.id, user.id, {
                name,
                type,
                dayIndex
              })
              placeIds.push(place.id)

              // Update to null
              const updatedPlace = await updatePlace(place.id, user.id, {
                dayIndex: null
              })

              // Day index should be null
              expect(updatedPlace.dayIndex).toBeNull()
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

  // Feature: trip-planning-app, Property 18: Places are grouped by day
  describe('Property 18: Places are grouped by day', () => {
    it('should group places by day index', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: validPlaceName,
              type: validPlaceType,
              dayIndex: validDayIndex
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (placeData) => {
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

              // Create places with different day indices
              for (const data of placeData) {
                const place = await createPlace(trip.id, user.id, {
                  name: data.name,
                  type: data.type,
                  dayIndex: data.dayIndex
                })
                placeIds.push(place.id)
              }

              // Get grouped places
              const grouped = await getPlacesByTrip(trip.id)

              // Count places in each group
              const dayCounts: { [key: number]: number } = {}
              for (const data of placeData) {
                dayCounts[data.dayIndex] = (dayCounts[data.dayIndex] || 0) + 1
              }

              // Verify grouping
              for (const [dayIndexStr, count] of Object.entries(dayCounts)) {
                const dayIndex = parseInt(dayIndexStr)
                expect(grouped[dayIndex]).toBeDefined()
                expect(grouped[dayIndex]!.length).toBe(count)
                
                // Verify all places in group have correct day index
                grouped[dayIndex]!.forEach(place => {
                  expect(place.dayIndex).toBe(dayIndex)
                })
              }

              // Verify total count
              let totalGrouped = 0
              for (const dayIndex in grouped) {
                if (dayIndex !== 'unassigned') {
                  totalGrouped += grouped[parseInt(dayIndex)]!.length
                }
              }
              if (grouped.unassigned) {
                totalGrouped += grouped.unassigned.length
              }
              expect(totalGrouped).toBe(placeData.length)
            } finally {
              if (user && user.id && trip && trip.id) {
                await cleanupTestData([user.id], [trip.id], placeIds)
              }
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for performance
      )
    }, { timeout: 120000 }) // Increased timeout
  })

  // Feature: trip-planning-app, Property 19: Null day index is supported
  describe('Property 19: Null day index is supported', () => {
    it('should support places without day index', async () => {
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

              // Create place without day index
              const place = await createPlace(trip.id, user.id, {
                name,
                type
                // No dayIndex provided
              })
              placeIds.push(place.id)

              // Day index should be null
              expect(place.dayIndex).toBeNull()

              // Verify in database
              const dbPlace = await prisma.place.findUnique({
                where: { id: place.id }
              })
              expect(dbPlace).toBeDefined()
              expect(dbPlace!.dayIndex).toBeNull()

              // Verify it appears in unassigned group
              const grouped = await getPlacesByTrip(trip.id)
              expect(grouped.unassigned).toBeDefined()
              expect(grouped.unassigned!.length).toBeGreaterThan(0)
              
              const unassignedPlace = grouped.unassigned!.find(p => p.id === place.id)
              expect(unassignedPlace).toBeDefined()
              expect(unassignedPlace!.dayIndex).toBeNull()
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

    it('should group unassigned places separately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validPlaceName, { minLength: 1, maxLength: 5 }),
          validPlaceType,
          async (names, type) => {
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

              // Create places without day index
              for (const name of names) {
                const place = await createPlace(trip.id, user.id, {
                  name,
                  type
                  // No dayIndex
                })
                placeIds.push(place.id)
              }

              // Get grouped places
              const grouped = await getPlacesByTrip(trip.id)

              // Unassigned places should be in unassigned group
              expect(grouped.unassigned).toBeDefined()
              expect(grouped.unassigned!.length).toBe(names.length)

              // All unassigned places should have null dayIndex
              grouped.unassigned!.forEach(place => {
                expect(place.dayIndex).toBeNull()
              })
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
  })
})

