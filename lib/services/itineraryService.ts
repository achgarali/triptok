/**
 * Service for generating itinerary suggestions based on places
 */

import { query } from '@/lib/db'

export interface Place {
  id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  type: string
  dayIndex: number | null
  notes: string | null
}

export interface ItinerarySuggestion {
  day: number
  places: Place[]
  estimatedDuration: number // in hours
  description: string
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Estimate duration for a place based on its type
 */
function estimatePlaceDuration(type: string): number {
  // Duration in hours
  const durations: { [key: string]: number } = {
    food: 1.5, // Restaurant: 1.5 hours
    bar: 2, // Bar: 2 hours
    cafe: 0.5, // Café: 30 minutes
    photo: 0.5, // Photo spot: 30 minutes
    museum: 2.5, // Museum: 2.5 hours
    activity: 2, // Activity: 2 hours
    other: 1 // Other: 1 hour
  }
  return durations[type] || 1
}

/**
 * Estimate travel time between two places (in hours)
 */
function estimateTravelTime(place1: Place, place2: Place): number {
  if (!place1.lat || !place1.lng || !place2.lat || !place2.lng) {
    return 0.5 // Default 30 minutes if no coordinates
  }

  const distance = calculateDistance(
    place1.lat,
    place1.lng,
    place2.lat,
    place2.lng
  )

  // Assume average speed of 30 km/h in city (walking + public transport)
  const speed = 30 // km/h
  return distance / speed
}

/**
 * Generate itinerary suggestions for unassigned places
 * Groups places by proximity and suggests optimal day assignments
 */
export async function suggestItinerary(
  tripId: string,
  userId: string
): Promise<ItinerarySuggestion[]> {
  try {
    // Get all places for the trip
    const places = await query<Place>(
      `SELECT p.id, p.name, p.address, p.lat, p.lng, p.type, p.day_index, p.notes
       FROM places p
       JOIN trips t ON p.trip_id = t.id
       WHERE p.trip_id = $1 AND t.user_id = $2
       ORDER BY p.day_index NULLS LAST, p.created_at ASC`,
      [tripId, userId]
    )

    // Filter unassigned places (day_index is null)
    const unassignedPlaces = places.filter((p) => p.day_index === null)

    if (unassignedPlaces.length === 0) {
      return []
    }

    // Get places with coordinates for clustering
    const placesWithCoords = unassignedPlaces.filter(
      (p) => p.lat !== null && p.lng !== null
    )

    if (placesWithCoords.length === 0) {
      // If no coordinates, just group by type and suggest one day
      return [
        {
          day: 1,
          places: unassignedPlaces,
          estimatedDuration: unassignedPlaces.reduce(
            (sum, p) => sum + estimatePlaceDuration(p.type),
            0
          ),
          description: `Journée avec ${unassignedPlaces.length} lieu(x) à visiter`
        }
      ]
    }

    // Simple clustering: group places that are close to each other
    const clusters: Place[][] = []
    const used = new Set<string>()

    for (const place of placesWithCoords) {
      if (used.has(place.id)) continue

      const cluster: Place[] = [place]
      used.add(place.id)

      // Find nearby places (within 5 km)
      for (const otherPlace of placesWithCoords) {
        if (used.has(otherPlace.id)) continue
        if (!otherPlace.lat || !otherPlace.lng) continue

        const distance = calculateDistance(
          place.lat!,
          place.lng!,
          otherPlace.lat!,
          otherPlace.lng!
        )

        if (distance < 5) {
          // Within 5 km
          cluster.push(otherPlace)
          used.add(otherPlace.id)
        }
      }

      clusters.push(cluster)
    }

    // Add places without coordinates to the first cluster
    const placesWithoutCoords = unassignedPlaces.filter(
      (p) => p.lat === null || p.lng === null
    )
    if (placesWithoutCoords.length > 0 && clusters.length > 0) {
      clusters[0].push(...placesWithoutCoords)
    } else if (placesWithoutCoords.length > 0) {
      clusters.push(placesWithoutCoords)
    }

    // Convert clusters to itinerary suggestions
    const suggestions: ItinerarySuggestion[] = clusters.map((cluster, index) => {
      // Sort places in cluster by type (museums first, then activities, then food, etc.)
      const typeOrder: { [key: string]: number } = {
        museum: 1,
        activity: 2,
        photo: 3,
        food: 4,
        cafe: 5,
        bar: 6,
        other: 7
      }

      const sortedPlaces = [...cluster].sort((a, b) => {
        const orderA = typeOrder[a.type] || 7
        const orderB = typeOrder[b.type] || 7
        return orderA - orderB
      })

      // Calculate total duration
      let totalDuration = 0
      for (let i = 0; i < sortedPlaces.length; i++) {
        totalDuration += estimatePlaceDuration(sortedPlaces[i].type)
        if (i < sortedPlaces.length - 1) {
          totalDuration += estimateTravelTime(
            sortedPlaces[i],
            sortedPlaces[i + 1]
          )
        }
      }

      const placeCount = sortedPlaces.length
      const types = [...new Set(sortedPlaces.map((p) => p.type))]
      const description =
        placeCount === 1
          ? `1 lieu à visiter`
          : `${placeCount} lieux à visiter (${types.length} type${types.length > 1 ? 's' : ''} différent${types.length > 1 ? 's' : ''})`

      return {
        day: index + 1,
        places: sortedPlaces,
        estimatedDuration: Math.round(totalDuration * 10) / 10, // Round to 1 decimal
        description
      }
    })

    return suggestions
  } catch (error: any) {
    console.error('Error suggesting itinerary:', error)
    throw new Error('Erreur lors de la génération des suggestions d\'itinéraire')
  }
}

