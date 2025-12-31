import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getSession'
import { createPlace, getPlacesByTrip, getPlacesByTripPaginated } from '@/lib/services/placeService'
import { getTripById } from '@/lib/services/tripService'

/**
 * POST /api/trips/[id]/places - Create a new place in a trip
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tripId = params.id

    // Verify user owns the trip
    await getTripById(tripId, user.id)

    // Parse request body
    const body = await request.json()
    const { name, address, lat, lng, type, dayIndex, notes } = body

    // Create place
    const place = await createPlace(tripId, user.id, {
      name,
      address,
      lat,
      lng,
      type,
      dayIndex,
      notes
    })

    return NextResponse.json(place, { status: 201 })
  } catch (error: any) {
    // Handle validation errors
    if (error.code === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      )
    }

    // Handle not found errors
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Handle forbidden errors
    if (error.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    console.error('Error creating place:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/trips/[id]/places - Get places for a trip (grouped by day)
 * Supports pagination via query parameters: ?page=1&limit=20
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tripId = params.id

    // Verify user owns the trip
    await getTripById(tripId, user.id)

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')

    // If pagination parameters are provided, use paginated version
    if (pageParam || limitParam) {
      const page = pageParam ? parseInt(pageParam, 10) : 1
      const limit = limitParam ? parseInt(limitParam, 10) : 20

      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        return NextResponse.json(
          { error: 'Invalid page parameter. Must be a positive integer.' },
          { status: 400 }
        )
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        return NextResponse.json(
          { error: 'Invalid limit parameter. Must be between 1 and 100.' },
          { status: 400 }
        )
      }

      const result = await getPlacesByTripPaginated(tripId, page, limit)
      return NextResponse.json(result, { status: 200 })
    }

    // Otherwise, return all places (backward compatibility)
    const places = await getPlacesByTrip(tripId)
    return NextResponse.json(places, { status: 200 })
  } catch (error: any) {
    // Handle not found errors
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Handle forbidden errors
    if (error.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    console.error('Error fetching places:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

