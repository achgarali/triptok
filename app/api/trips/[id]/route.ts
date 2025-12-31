import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getSession'
import { getTripById, updateTrip, deleteTrip } from '@/lib/services/tripService'

/**
 * GET /api/trips/[id] - Get trip details
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

    // Get trip
    const trip = await getTripById(tripId, user.id)

    return NextResponse.json(trip, { status: 200 })
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

    console.error('Error fetching trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/trips/[id] - Update trip
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json()
    const { name, destination, startDate, endDate, isPublic } = body

    // Update trip
    const trip = await updateTrip(tripId, user.id, {
      name,
      destination,
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
      endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      isPublic
    })

    return NextResponse.json(trip, { status: 200 })
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

    console.error('Error updating trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/trips/[id] - Delete trip
 */
export async function DELETE(
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

    // Delete trip
    await deleteTrip(tripId, user.id)

    return NextResponse.json({ message: 'Trip deleted successfully' }, { status: 200 })
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

    console.error('Error deleting trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

