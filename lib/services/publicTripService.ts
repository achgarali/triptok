import { query, queryOne } from '@/lib/db'

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

// PostgreSQL DECIMAL is returned as string, convert to number
function parseDecimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  return parseFloat(value)
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
      'SELECT id, user_id, name, destination, start_date, end_date, is_public, slug, created_at FROM trips WHERE slug = $1',
      [slug]
    )

    // If trip doesn't exist, return null
    if (!trip) {
      return null
    }

    // If trip is not public, return null (access denied)
    if (!trip.is_public) {
      return null
    }

    // Get places for this trip
    const placesData = await query<{
      id: string
      trip_id: string
      name: string
      address: string | null
      lat: string | null
      lng: string | null
      type: 'food' | 'bar' | 'cafe' | 'photo' | 'museum' | 'activity' | 'other'
      day_index: number | null
      notes: string | null
      created_at: Date
    }>(
      'SELECT id, trip_id, name, address, lat, lng, type, day_index, notes, created_at FROM places WHERE trip_id = $1 ORDER BY day_index ASC NULLS LAST, created_at ASC',
      [trip.id]
    )

    // Get sources for all places
    const placeIds = placesData.map(p => p.id)
    const sourcesData = placeIds.length > 0
      ? await query<{
          id: string
          place_id: string
          platform: 'tiktok' | 'instagram' | 'other'
          url: string
          caption: string | null
          thumbnail_url: string | null
          created_at: Date
        }>(
          `SELECT id, place_id, platform, url, caption, thumbnail_url, created_at 
           FROM sources 
           WHERE place_id = ANY($1::uuid[])
           ORDER BY created_at ASC`,
          [placeIds]
        )
      : []

    // Group sources by place_id
    const sourcesByPlaceId = new Map<string, typeof sourcesData>()
    for (const source of sourcesData) {
      if (!sourcesByPlaceId.has(source.place_id)) {
        sourcesByPlaceId.set(source.place_id, [])
      }
      sourcesByPlaceId.get(source.place_id)!.push(source)
    }

    // Build places with sources
    const places: PlaceWithSources[] = placesData.map((place) => ({
      id: place.id,
      tripId: place.trip_id,
      name: place.name,
      address: place.address,
      lat: parseDecimal(place.lat),
      lng: parseDecimal(place.lng),
      type: place.type,
      dayIndex: place.day_index,
      notes: place.notes,
      createdAt: place.created_at,
      sources: (sourcesByPlaceId.get(place.id) || []).map((source) => ({
        id: source.id,
        placeId: source.place_id,
        platform: source.platform,
        url: source.url,
        caption: source.caption,
        thumbnailUrl: source.thumbnail_url,
        createdAt: source.created_at
      }))
    }))

    // Return complete trip data
    return {
      id: trip.id,
      userId: trip.user_id,
      name: trip.name,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      isPublic: trip.is_public,
      slug: trip.slug,
      createdAt: trip.created_at,
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
    const trip = await queryOne<{
      is_public: boolean
    }>(
      'SELECT is_public FROM trips WHERE slug = $1',
      [slug]
    )

    return trip?.is_public ?? false
  } catch (error: any) {
    return false
  }
}

