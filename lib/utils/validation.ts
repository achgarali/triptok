/**
 * Validation utilities for reuse across services
 */

export type PlaceType = 'food' | 'bar' | 'cafe' | 'photo' | 'museum' | 'activity' | 'other'
export type Platform = 'tiktok' | 'instagram' | 'other'

export const VALID_PLACE_TYPES: PlaceType[] = ['food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other']
export const VALID_PLATFORMS: Platform[] = ['tiktok', 'instagram', 'other']

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates password requirements
 * - Minimum 8 characters
 * @param password - Password to validate
 * @returns true if password meets requirements
 */
export function isValidPassword(password: string): boolean {
  if (typeof password !== 'string') {
    return false
  }
  return password.length >= 8
}

/**
 * Validates that a string is non-empty after trimming
 * @param value - String to validate
 * @returns true if string is non-empty after trim
 */
export function isNonEmptyString(value: string): boolean {
  if (typeof value !== 'string') {
    return false
  }
  return value.trim().length > 0
}

/**
 * Validates latitude range (-90 to 90)
 * @param lat - Latitude to validate
 * @returns true if latitude is in valid range
 */
export function isValidLatitude(lat: number): boolean {
  if (typeof lat !== 'number' || isNaN(lat)) {
    return false
  }
  return lat >= -90 && lat <= 90
}

/**
 * Validates longitude range (-180 to 180)
 * @param lng - Longitude to validate
 * @returns true if longitude is in valid range
 */
export function isValidLongitude(lng: number): boolean {
  if (typeof lng !== 'number' || isNaN(lng)) {
    return false
  }
  return lng >= -180 && lng <= 180
}

/**
 * Validates coordinate pair
 * Both must be provided together or both must be null/undefined
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns true if coordinates are valid
 */
export function areCoordinatesValid(
  lat: number | undefined | null,
  lng: number | undefined | null
): boolean {
  const hasLat = lat !== undefined && lat !== null
  const hasLng = lng !== undefined && lng !== null

  // Both must be provided or both must be null/undefined
  if (hasLat && !hasLng) return false
  if (hasLng && !hasLat) return false

  // If both provided, validate ranges
  if (hasLat && hasLng) {
    return isValidLatitude(lat!) && isValidLongitude(lng!)
  }

  return true
}

/**
 * Validates place type against allowed values
 * @param type - Place type to validate
 * @returns true if type is valid
 */
export function isValidPlaceType(type: string): type is PlaceType {
  return VALID_PLACE_TYPES.includes(type as PlaceType)
}

/**
 * Validates platform against allowed values
 * @param platform - Platform to validate
 * @returns true if platform is valid
 */
export function isValidPlatform(platform: string): platform is Platform {
  return VALID_PLATFORMS.includes(platform as Platform)
}

/**
 * Validates URL (non-empty string)
 * @param url - URL to validate
 * @returns true if URL is non-empty
 */
export function isValidUrl(url: string): boolean {
  return isNonEmptyString(url)
}

