import { query, queryOne } from '@/lib/db'

export type Platform = 'tiktok' | 'instagram' | 'other'

export interface CreateSourceInput {
  url: string
  platform: Platform
  caption?: string
  thumbnailUrl?: string
}

export interface Source {
  id: string
  placeId: string
  platform: Platform
  url: string
  caption: string | null
  thumbnailUrl: string | null
  createdAt: Date
}

export interface SourceError {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL_ERROR'
  message: string
  details?: Array<{ field: string; message: string }>
}

const VALID_PLATFORMS: Platform[] = ['tiktok', 'instagram', 'other']

/**
 * Validates URL (non-empty)
 */
function isValidUrl(url: string): boolean {
  return typeof url === 'string' && url.trim().length > 0
}

/**
 * Validates platform
 */
function isValidPlatform(platform: string): platform is Platform {
  return VALID_PLATFORMS.includes(platform as Platform)
}

/**
 * Verifies that user owns the place (via trip ownership)
 */
async function verifyPlaceOwnership(placeId: string, userId: string): Promise<void> {
  const place = await queryOne<{
    id: string
    user_id: string
  }>(
    `SELECT p.id, t.user_id
     FROM places p
     JOIN trips t ON p.trip_id = t.id
     WHERE p.id = $1`,
    [placeId]
  )

  if (!place) {
    const error: SourceError = {
      code: 'NOT_FOUND',
      message: 'Place not found'
    }
    throw error
  }

  if (place.user_id !== userId) {
    const error: SourceError = {
      code: 'FORBIDDEN',
      message: 'Access denied'
    }
    throw error
  }
}

/**
 * Create a new source for a place
 * Validates place ownership, URL, and platform
 * 
 * @throws SourceError if validation fails or place not found
 */
export async function createSource(
  placeId: string,
  userId: string,
  input: CreateSourceInput
): Promise<Source> {
  const { url, platform, caption, thumbnailUrl } = input

  // Validate URL
  if (!isValidUrl(url)) {
    const error: SourceError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'url', message: 'URL is required' }]
    }
    throw error
  }

  // Validate platform
  if (!isValidPlatform(platform)) {
    const error: SourceError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'platform', message: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` }]
    }
    throw error
  }

  try {
    // Verify place exists and user owns it
    await verifyPlaceOwnership(placeId, userId)

    // Create source
    const source = await queryOne<{
      id: string
      place_id: string
      platform: Platform
      url: string
      caption: string | null
      thumbnail_url: string | null
      created_at: Date
    }>(
      `INSERT INTO sources (id, place_id, platform, url, caption, thumbnail_url)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id, place_id, platform, url, caption, thumbnail_url, created_at`,
      [
        placeId,
        platform,
        url.trim(),
        caption?.trim() || null,
        thumbnailUrl?.trim() || null
      ]
    )

    if (!source) {
      throw new Error('Failed to create source')
    }

    return {
      id: source.id,
      placeId: source.place_id,
      platform: source.platform,
      url: source.url,
      caption: source.caption,
      thumbnailUrl: source.thumbnail_url,
      createdAt: source.created_at
    }
  } catch (error: any) {
    // Re-throw SourceError as-is
    if (error.code) {
      throw error
    }

    // Wrap unexpected errors
    const sourceError: SourceError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw sourceError
  }
}

/**
 * Delete a source with ownership validation
 * 
 * @throws SourceError if source not found or user doesn't own it
 */
export async function deleteSource(sourceId: string, userId: string): Promise<void> {
  try {
    // Get source and verify it exists, with trip ownership
    const source = await queryOne<{
      id: string
      user_id: string
    }>(
      `SELECT s.id, t.user_id
       FROM sources s
       JOIN places p ON s.place_id = p.id
       JOIN trips t ON p.trip_id = t.id
       WHERE s.id = $1`,
      [sourceId]
    )

    if (!source) {
      const error: SourceError = {
        code: 'NOT_FOUND',
        message: 'Source not found'
      }
      throw error
    }

    // Verify user owns the trip (and thus the place)
    if (source.user_id !== userId) {
      const error: SourceError = {
        code: 'FORBIDDEN',
        message: 'Access denied'
      }
      throw error
    }

    // Delete source
    await query(
      'DELETE FROM sources WHERE id = $1',
      [sourceId]
    )
  } catch (error: any) {
    // Re-throw SourceError as-is
    if (error.code) {
      throw error
    }

    // Wrap unexpected errors
    const sourceError: SourceError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw sourceError
  }
}

/**
 * Get all sources for a place
 * No ownership validation (assumes caller has already verified access)
 */
export async function getSourcesByPlace(placeId: string): Promise<Source[]> {
  try {
    const sources = await query<{
      id: string
      place_id: string
      platform: Platform
      url: string
      caption: string | null
      thumbnail_url: string | null
      created_at: Date
    }>(
      'SELECT id, place_id, platform, url, caption, thumbnail_url, created_at FROM sources WHERE place_id = $1 ORDER BY created_at ASC',
      [placeId]
    )

    return sources.map((source) => ({
      id: source.id,
      placeId: source.place_id,
      platform: source.platform,
      url: source.url,
      caption: source.caption,
      thumbnailUrl: source.thumbnail_url,
      createdAt: source.created_at
    }))
  } catch (error: any) {
    const sourceError: SourceError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw sourceError
  }
}

