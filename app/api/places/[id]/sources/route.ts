import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getSession'
import { createSource, getSourcesByPlace } from '@/lib/services/sourceService'
import { queryOne } from '@/lib/db'
import { getTripById } from '@/lib/services/tripService'

/**
 * POST /api/places/[id]/sources - Create a new source for a place
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

    const placeId = params.id

    // Verify place exists and user owns it (via trip ownership)
    const place = await queryOne<{
      id: string
      trip_id: string
    }>(
      'SELECT id, trip_id FROM places WHERE id = $1',
      [placeId]
    )

    if (!place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    // Verify user owns the trip
    await getTripById(place.trip_id, user.id)

    // Parse request body
    const body = await request.json()
    const { url, platform, caption, thumbnailUrl } = body

    // Create source
    const source = await createSource(placeId, user.id, {
      url,
      platform,
      caption,
      thumbnailUrl
    })

    return NextResponse.json(source, { status: 201 })
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
        { error: 'Place not found' },
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

    console.error('Error creating source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/places/[id]/sources - Get all sources for a place
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

    const placeId = params.id

    // Verify place exists and user owns it (via trip ownership)
    const place = await queryOne<{
      id: string
      trip_id: string
    }>(
      'SELECT id, trip_id FROM places WHERE id = $1',
      [placeId]
    )

    if (!place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    // Verify user owns the trip
    await getTripById(place.trip_id, user.id)

    // Get sources
    const sources = await getSourcesByPlace(placeId)

    return NextResponse.json(sources, { status: 200 })
  } catch (error: any) {
    // Handle not found errors
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'Place not found' },
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

    console.error('Error fetching sources:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

