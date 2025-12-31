import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface PlaceWithSources {
  id: string
  tripId: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  type: 'food' | 'bar' | 'cafe' | 'photo' | 'museum' | 'activity' | 'other'
  dayIndex: number | null
  notes: string | null
  createdAt: Date
  sources: Array<{
    id: string
    placeId: string
    platform: 'tiktok' | 'instagram' | 'other'
    url: string
    caption: string | null
    thumbnailUrl: string | null
    createdAt: Date
  }>
}

export interface TripWithPlaces {
  id: string
  userId: string
  name: string
  destination: string
  startDate: Date | null
  endDate: Date | null
  isPublic: boolean
  slug: string
  createdAt: Date
  places: PlaceWithSources[]
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
 * Get a public trip by slug (no authentication required)
 * Returns null if trip doesn't exist or is private
 * 
 * @param slug - Trip slug
 * @returns Trip with all places and sources, or null if not accessible
 */
export async function getPublicTripBySlug(slug: string): Promise<TripWithPlaces | null> {
  try {
    // Find trip by slug
    const trip = await prisma.trip.findUnique({
      where: { slug },
      include: {
        places: {
          include: {
            sources: true
          },
          orderBy: [
            { dayIndex: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    })

    // If trip doesn't exist, return null
    if (!trip) {
      return null
    }

    // If trip is not public, return null (access denied)
    if (!trip.isPublic) {
      return null
    }

    // Build places with sources
    const places: PlaceWithSources[] = trip.places.map((place: typeof trip.places[0]) => ({
      id: place.id,
      tripId: place.tripId,
      name: place.name,
      address: place.address,
      lat: fromDecimal(place.lat),
      lng: fromDecimal(place.lng),
      type: place.type,
      dayIndex: place.dayIndex,
      notes: place.notes,
      createdAt: place.createdAt,
      sources: place.sources.map(source => ({
        id: source.id,
        placeId: source.placeId,
        platform: source.platform,
        url: source.url,
        caption: source.caption,
        thumbnailUrl: source.thumbnailUrl,
        createdAt: source.createdAt
      }))
    }))

    // Return complete trip data
    return {
      id: trip.id,
      userId: trip.userId,
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      isPublic: trip.isPublic,
      slug: trip.slug,
      createdAt: trip.createdAt,
      places
    }
  } catch (error: any) {
    // Return null on any error (treat as not found/not accessible)
    return null
  }
}

/**
 * Check if a trip is publicly accessible by slug
 * 
 * @param slug - Trip slug
 * @returns true if trip exists and is public, false otherwise
 */
export async function isPublicTrip(slug: string): Promise<boolean> {
  try {
    const trip = await prisma.trip.findUnique({
      where: { slug },
      select: { isPublic: true }
    })

    return trip?.isPublic ?? false
  } catch (error: any) {
    return false
  }
}

