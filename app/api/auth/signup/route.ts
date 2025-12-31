import { NextRequest, NextResponse } from 'next/server'
import { signup } from '@/lib/services/authService'
import { withRateLimit, getClientIdentifier } from '@/lib/utils/rateLimit'
import { sanitizeEmail, sanitizeString } from '@/lib/utils/sanitize'

/**
 * POST /api/auth/signup - Register a new user
 * Rate limited: 5 requests per 15 minutes per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(5, 15 * 60 * 1000)(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
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

    // Handle internal errors
    if (error.code === 'INTERNAL_ERROR') {
      console.error('Internal error in signup:', error.message)
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
    }

    console.error('Error creating user:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    
    // In development, return more details
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: error?.message || String(error),
          stack: error?.stack
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

