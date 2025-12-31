/**
 * XSS prevention utilities
 * Sanitize user input before displaying
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param str - String to escape
 * @returns Escaped string safe for HTML display
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return String(str)
  }

  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }

  return str.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Sanitize string by removing potentially dangerous characters
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return ''
  }

  // Remove null bytes and control characters
  let sanitized = str.replace(/\0/g, '')
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

  // Trim whitespace
  sanitized = sanitized.trim()

  return sanitized
}

/**
 * Sanitize object recursively
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T
  }

  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized as T
  }

  return obj
}

/**
 * Validate and sanitize email address
 * @param email - Email to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') {
    return null
  }

  const sanitized = sanitizeString(email.toLowerCase())
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(sanitized)) {
    return null
  }

  return sanitized
}

