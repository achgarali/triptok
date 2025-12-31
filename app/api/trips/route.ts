import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getSession'
import { createTrip, getUserTrips } from '@/lib/services/tripService'

/**
 * POST /api/trips - Create a new trip
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, destination, startDate, endDate, isPublic } = body

    // Create trip
    const trip = await createTrip(user.id, {
      name,
      destination,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isPublic
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error: any) {
    // Handle validation errors
    if (error.code === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      )
    }

    // Handle other errors
    console.error('Error creating trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/trips - Get all trips for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's trips
    const trips = await getUserTrips(user.id)

    return NextResponse.json(trips, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching trips:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

