import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getSession'
import { updatePlace, deletePlace } from '@/lib/services/placeService'

/**
 * PATCH /api/places/[id] - Update a place
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

    const placeId = params.id

    // Parse request body
    const body = await request.json()
    const { name, address, lat, lng, type, dayIndex, notes } = body

    // Update place
    const place = await updatePlace(placeId, user.id, {
      name,
      address,
      lat: lat !== undefined ? lat : undefined,
      lng: lng !== undefined ? lng : undefined,
      type,
      dayIndex: dayIndex !== undefined ? dayIndex : undefined,
      notes: notes !== undefined ? notes : undefined
    })

    return NextResponse.json(place, { status: 200 })
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

    console.error('Error updating place:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/places/[id] - Delete a place
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

    const placeId = params.id

    // Delete place
    await deletePlace(placeId, user.id)

    return NextResponse.json({ message: 'Place deleted successfully' }, { status: 200 })
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

    console.error('Error deleting place:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

