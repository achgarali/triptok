import { NextRequest, NextResponse } from 'next/server'
import { signup } from '@/lib/services/authService'
import { withRateLimit, getClientIdentifier } from '@/lib/utils/rateLimit'
import { sanitizeEmail, sanitizeString } from '@/lib/utils/sanitize'

/**
 * POST /api/auth/signup - Register a new user
 * Rate limited: 5 requests per 15 minutes per IP
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(5, 15 * 60 * 1000)(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await request.json()
    let { email, password } = body

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email)
    if (!sanitizedEmail) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    email = sanitizedEmail
    password = sanitizeString(password)

    // Validate password length after sanitization
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Create user
    const user = await signup({ email, password })

    return NextResponse.json(
      { message: 'User created successfully', user: { id: user.id, email: user.email } },
      { status: 201 }
    )
  } catch (error: any) {
    // Handle validation errors
    if (error.code === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      )
    }

    // Handle conflict errors (duplicate email)
    if (error.code === 'CONFLICT') {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

