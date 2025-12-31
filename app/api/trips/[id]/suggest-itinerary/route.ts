import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getSession'
import { getTripById } from '@/lib/services/tripService'
import { suggestItinerary } from '@/lib/services/itineraryService'

/**
 * GET /api/trips/[id]/suggest-itinerary - Get itinerary suggestions for unassigned places
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

    // Generate suggestions
    const suggestions = await suggestItinerary(tripId, user.id)

    return NextResponse.json(suggestions, { status: 200 })
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

    console.error('Error suggesting itinerary:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

