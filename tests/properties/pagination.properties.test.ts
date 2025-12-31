import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { prisma } from '@/lib/prisma'
import { getPlacesByTripPaginated } from '@/lib/services/placeService'
import { createTrip } from '@/lib/services/tripService'
import { createPlace } from '@/lib/services/placeService'
import { signup } from '@/lib/services/authService'

// Helper to create a test user
async function createTestUser() {
  const email = `test-${Date.now()}-${Math.random()}@example.com`
  const password = 'testpassword123'
  const user = await signup({ email, password })
  return user
}

// Helper to clean up test data
async function cleanupTestData(userIds: string[], tripIds: string[], placeIds: string[]) {
  try {
    // Delete places
    if (placeIds.length > 0) {
      await prisma.place.deleteMany({
        where: { id: { in: placeIds } }
      }).catch(() => {}) // Ignore errors if already deleted
    }
    
    // Delete trips (cascade will handle remaining places and sources)
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

describe('Pagination Property Tests', () => {

  // Feature: trip-planning-app, Property 35: Large place lists are paginated
  describe('Property 35: Large place lists are paginated', () => {
    it('should return correct pagination metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // number of places to create
          fc.integer({ min: 1, max: 20 }), // page number
          fc.integer({ min: 5, max: 20 }), // limit per page
          async (numPlaces, page, limit) => {
            const user = await createTestUser()
            const trip = await createTrip(user.id, {
              name: 'Test Trip',
              destination: 'Test Destination'
            })

            // Create places
            const placeIds: string[] = []
            for (let i = 0; i < numPlaces; i++) {
              const place = await createPlace(trip.id, user.id, {
                name: `Place ${i}`,
                type: 'food',
                dayIndex: i % 5 // Distribute across days
              })
              placeIds.push(place.id)
            }

            // Get paginated results
            const result = await getPlacesByTripPaginated(trip.id, page, limit)

            // Verify pagination metadata
            expect(result.total).toBe(numPlaces)
            expect(result.page).toBe(page)
            expect(result.limit).toBe(limit)
            expect(result.totalPages).toBe(Math.ceil(numPlaces / limit))

            // Verify returned places count
            const returnedPlacesCount = Object.values(result.places).flat().length
            const expectedCount = Math.min(limit, numPlaces - (page - 1) * limit)
            expect(returnedPlacesCount).toBeGreaterThanOrEqual(0)
            expect(returnedPlacesCount).toBeLessThanOrEqual(limit)
            } finally {
              if (user && user.id && trip && trip.id) {
                await cleanupTestData([user.id], [trip.id], placeIds)
              }
            }
          }
        ),
        { numRuns: 20, timeout: 30000 }
      )
    })

    it('should handle empty place lists', async () => {
      let user: any = null
      let trip: any = null

      try {
        user = await createTestUser()
        if (!user || !user.id) {
          throw new Error('Failed to create test user')
        }

        trip = await createTrip(user.id, {
          name: 'Test Trip',
          destination: 'Test Destination'
        })
        if (!trip || !trip.id) {
          throw new Error('Failed to create test trip')
        }

        const result = await getPlacesByTripPaginated(trip.id, 1, 20)

        expect(result.total).toBe(0)
        expect(result.page).toBe(1)
        expect(result.limit).toBe(20)
        expect(result.totalPages).toBe(0)
        expect(Object.values(result.places).flat().length).toBe(0)
      } finally {
        if (user && user.id && trip && trip.id) {
          await cleanupTestData([user.id], [trip.id], [])
        }
      }
    })

    it('should normalize invalid pagination parameters', async () => {
      const user = await createTestUser()
      const trip = await createTrip(user.id, {
        name: 'Test Trip',
        destination: 'Test Destination'
      })

      // Create some places
      for (let i = 0; i < 10; i++) {
        await createPlace(trip.id, user.id, {
          name: `Place ${i}`,
          type: 'food'
        })
      }

      // Test with invalid page (negative)
      const result1 = await getPlacesByTripPaginated(trip.id, -1, 20)
      expect(result1.page).toBe(1)

      // Test with invalid limit (too large)
      const result2 = await getPlacesByTripPaginated(trip.id, 1, 200)
      expect(result2.limit).toBe(100) // Should be capped at 100

      // Test with invalid limit (zero)
      const result3 = await getPlacesByTripPaginated(trip.id, 1, 0)
      expect(result3.limit).toBe(1) // Should be at least 1

      // Cleanup
      const places = await prisma.place.findMany({ where: { tripId: trip.id } })
      const placeIds = places.map(p => p.id)
      await cleanupTestData([user.id], [trip.id], placeIds)
    })

    it('should return consistent results across pages', async () => {
      const user = await createTestUser()
      const trip = await createTrip(user.id, {
        name: 'Test Trip',
        destination: 'Test Destination'
      })

      // Create 30 places
      const placeIds: string[] = []
      for (let i = 0; i < 30; i++) {
        const place = await createPlace(trip.id, user.id, {
          name: `Place ${i}`,
          type: 'food',
          dayIndex: i % 5
        })
        placeIds.push(place.id)
      }

      const limit = 10

      // Get all pages
      const page1 = await getPlacesByTripPaginated(trip.id, 1, limit)
      const page2 = await getPlacesByTripPaginated(trip.id, 2, limit)
      const page3 = await getPlacesByTripPaginated(trip.id, 3, limit)

      // Verify total is consistent
      expect(page1.total).toBe(30)
      expect(page2.total).toBe(30)
      expect(page3.total).toBe(30)

      // Verify page counts
      expect(page1.totalPages).toBe(3)
      expect(page2.totalPages).toBe(3)
      expect(page3.totalPages).toBe(3)

      // Verify no duplicates across pages
      const allPlaceIds = [
        ...Object.values(page1.places).flat().map(p => p.id),
        ...Object.values(page2.places).flat().map(p => p.id),
        ...Object.values(page3.places).flat().map(p => p.id)
      ]
      const uniquePlaceIds = new Set(allPlaceIds)
      expect(uniquePlaceIds.size).toBe(allPlaceIds.length)

      // Cleanup
      await cleanupTestData([user.id], [trip.id], placeIds)
    })
  })
})

