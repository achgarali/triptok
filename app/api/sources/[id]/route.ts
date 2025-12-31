import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getSession'
import { deleteSource } from '@/lib/services/sourceService'

/**
 * DELETE /api/sources/[id] - Delete a source
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

    const sourceId = params.id

    // Delete source
    await deleteSource(sourceId, user.id)

    return NextResponse.json({ message: 'Source deleted successfully' }, { status: 200 })
  } catch (error: any) {
    // Handle not found errors
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'Source not found' },
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

    console.error('Error deleting source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

