import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  isValidEmail,
  isValidPassword,
  isNonEmptyString,
  isValidLatitude,
  isValidLongitude,
  areCoordinatesValid,
  isValidPlaceType,
  isValidPlatform,
  isValidUrl,
  VALID_PLACE_TYPES,
  VALID_PLATFORMS
} from '@/lib/utils/validation'

describe('Validation Utilities Property Tests', () => {
  // Feature: trip-planning-app, Property 33: Empty names are rejected
  describe('Property 33: Empty names are rejected', () => {
    it('should reject empty strings', () => {
      expect(isNonEmptyString('')).toBe(false)
      expect(isNonEmptyString('   ')).toBe(false) // Only whitespace
      expect(isNonEmptyString('\t\n')).toBe(false) // Whitespace characters
    })

    it('should accept non-empty strings', async () => {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (value) => {
            expect(isNonEmptyString(value)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject non-string values', () => {
      expect(isNonEmptyString(null as any)).toBe(false)
      expect(isNonEmptyString(undefined as any)).toBe(false)
      expect(isNonEmptyString(123 as any)).toBe(false)
      expect(isNonEmptyString({} as any)).toBe(false)
      expect(isNonEmptyString([] as any)).toBe(false)
    })
  })

  // Feature: trip-planning-app, Property 34: Coordinate ranges are validated
  describe('Property 34: Coordinate ranges are validated', () => {
    it('should validate latitude range (-90 to 90)', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90 }).filter((n) => !isNaN(n)),
          (lat) => {
            expect(isValidLatitude(lat)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject latitude outside range', () => {
      // Test values outside valid range
      expect(isValidLatitude(-91.0)).toBe(false)
      expect(isValidLatitude(91.0)).toBe(false)
      expect(isValidLatitude(-100.0)).toBe(false)
      expect(isValidLatitude(100.0)).toBe(false)
      expect(isValidLatitude(-90.0001)).toBe(false)
      expect(isValidLatitude(90.0001)).toBe(false)
    })

    it('should validate longitude range (-180 to 180)', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: -180, max: 180 }).filter((n) => !isNaN(n)),
          (lng) => {
            expect(isValidLongitude(lng)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject longitude outside range', () => {
      // Test values outside valid range
      expect(isValidLongitude(-181.0)).toBe(false)
      expect(isValidLongitude(181.0)).toBe(false)
      expect(isValidLongitude(-200.0)).toBe(false)
      expect(isValidLongitude(200.0)).toBe(false)
      expect(isValidLongitude(-180.0001)).toBe(false)
      expect(isValidLongitude(180.0001)).toBe(false)
    })

    it('should validate coordinate pairs', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90 }).filter((n) => !isNaN(n)),
          fc.float({ min: -180, max: 180 }).filter((n) => !isNaN(n)),
          (lat, lng) => {
            expect(areCoordinatesValid(lat, lng)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invalid coordinate pairs', () => {
      // Test invalid longitude with valid latitude
      expect(areCoordinatesValid(45.0, -200.0)).toBe(false)
      expect(areCoordinatesValid(45.0, 200.0)).toBe(false)
      
      // Test invalid latitude with valid longitude
      expect(areCoordinatesValid(-100.0, 120.0)).toBe(false)
      expect(areCoordinatesValid(100.0, 120.0)).toBe(false)
      
      // Test edge cases
      expect(areCoordinatesValid(45.0, -180.0001)).toBe(false)
      expect(areCoordinatesValid(45.0, 180.0001)).toBe(false)
      expect(areCoordinatesValid(-90.0001, 120.0)).toBe(false)
      expect(areCoordinatesValid(90.0001, 120.0)).toBe(false)
    })

    it('should accept null coordinates', () => {
      expect(areCoordinatesValid(null, null)).toBe(true)
      expect(areCoordinatesValid(undefined, undefined)).toBe(true)
    })

    it('should reject partial coordinates', () => {
      expect(areCoordinatesValid(45.0, null)).toBe(false)
      expect(areCoordinatesValid(null, 120.0)).toBe(false)
      expect(areCoordinatesValid(45.0, undefined)).toBe(false)
      expect(areCoordinatesValid(undefined, 120.0)).toBe(false)
    })

    it('should reject NaN values', () => {
      expect(isValidLatitude(NaN)).toBe(false)
      expect(isValidLongitude(NaN)).toBe(false)
      expect(areCoordinatesValid(NaN, 120.0)).toBe(false)
      expect(areCoordinatesValid(45.0, NaN)).toBe(false)
    })
  })

  describe('Email validation', () => {
    it('should validate correct email formats', async () => {
      await fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            expect(isValidEmail(email)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invalid email formats', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('notanemail@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user@domain')).toBe(false)
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('   ')).toBe(false)
    })

    it('should reject non-string values', () => {
      expect(isValidEmail(null as any)).toBe(false)
      expect(isValidEmail(123 as any)).toBe(false)
      expect(isValidEmail({} as any)).toBe(false)
    })
  })

  describe('Password validation', () => {
    it('should validate passwords with 8+ characters', async () => {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 8, maxLength: 200 }),
          (password) => {
            expect(isValidPassword(password)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject passwords with less than 8 characters', async () => {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 7 }),
          (password) => {
            expect(isValidPassword(password)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject non-string values', () => {
      expect(isValidPassword(null as any)).toBe(false)
      expect(isValidPassword(123 as any)).toBe(false)
      expect(isValidPassword({} as any)).toBe(false)
    })
  })

  describe('Place type validation', () => {
    it('should validate all valid place types', () => {
      VALID_PLACE_TYPES.forEach(type => {
        expect(isValidPlaceType(type)).toBe(true)
      })
    })

    it('should reject invalid place types', () => {
      expect(isValidPlaceType('invalid')).toBe(false)
      expect(isValidPlaceType('FOOD')).toBe(false) // Case sensitive
      expect(isValidPlaceType('')).toBe(false)
      expect(isValidPlaceType('restaurant')).toBe(false)
    })
  })

  describe('Platform validation', () => {
    it('should validate all valid platforms', () => {
      VALID_PLATFORMS.forEach(platform => {
        expect(isValidPlatform(platform)).toBe(true)
      })
    })

    it('should reject invalid platforms', () => {
      expect(isValidPlatform('invalid')).toBe(false)
      expect(isValidPlatform('TIKTOK')).toBe(false) // Case sensitive
      expect(isValidPlatform('')).toBe(false)
      expect(isValidPlatform('youtube')).toBe(false)
    })
  })

  describe('URL validation', () => {
    it('should validate non-empty URLs', async () => {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (url) => {
            expect(isValidUrl(url)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject empty URLs', () => {
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('   ')).toBe(false)
    })
  })
})

