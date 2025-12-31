import { NextRequest, NextResponse } from 'next/server'
import { getPublicTripBySlug } from '@/lib/services/publicTripService'

/**
 * GET /api/public/trips/[slug] - Get public trip by slug (no authentication required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug

    // Get public trip
    const trip = await getPublicTripBySlug(slug)

    // If trip doesn't exist or is private, return 404
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found or not publicly accessible' },
        { status: 404 }
      )
    }

    return NextResponse.json(trip, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching public trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

