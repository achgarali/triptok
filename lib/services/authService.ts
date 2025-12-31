import { query, queryOne } from '@/lib/db'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

export interface SignupInput {
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  createdAt: Date
}

export interface AuthError {
  code: 'VALIDATION_ERROR' | 'CONFLICT' | 'AUTHENTICATION_ERROR' | 'INTERNAL_ERROR'
  message: string
  details?: Array<{ field: string; message: string }>
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates password requirements
 * - Minimum 8 characters
 */
function isValidPassword(password: string): boolean {
  return password.length >= 8
}

/**
 * Register a new user with email and password
 * Validates email format and password requirements
 * Hashes password before storing
 * 
 * @throws AuthError if validation fails or email already exists
 */
export async function signup(input: SignupInput): Promise<User> {
  const { email, password } = input

  // Validate email format
  if (!isValidEmail(email)) {
    const error: AuthError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'email', message: 'Invalid email format' }]
    }
    throw error
  }

  // Validate password requirements
  if (!isValidPassword(password)) {
    const error: AuthError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'password', message: 'Password must be at least 8 characters' }]
    }
    throw error
  }

  try {
    // Check if email already exists
    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser) {
      const error: AuthError = {
        code: 'CONFLICT',
        message: 'Email already exists'
      }
      throw error
    }

    // Hash password
    let passwordHash: string
    try {
      passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    } catch (bcryptError: any) {
      console.error('Bcrypt error:', bcryptError)
      console.error('Bcrypt error message:', bcryptError?.message)
      console.error('Bcrypt error stack:', bcryptError?.stack)
      const error: AuthError = {
        code: 'INTERNAL_ERROR',
        message: 'Failed to hash password'
      }
      throw error
    }

    // Create user
    const user = await queryOne<{ id: string; email: string; created_at: Date }>(
      'INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid(), $1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    )

    if (!user) {
      throw new Error('Failed to create user')
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    }
  } catch (error: any) {
    // Re-throw AuthError as-is
    if (error.code) {
      throw error
    }

    // Wrap unexpected errors
    const authError: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw authError
  }
}

/**
 * Authenticate a user with email and password
 * Validates credentials and returns user information
 * 
 * @throws AuthError if credentials are invalid
 */
export async function login(input: LoginInput): Promise<User> {
  const { email, password } = input

  // Validate email format
  if (!isValidEmail(email)) {
    const error: AuthError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'email', message: 'Invalid email format' }]
    }
    throw error
  }

  try {
    // Find user by email
    const user = await queryOne<{ id: string; email: string; password_hash: string; created_at: Date }>(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email]
    )

    // If user doesn't exist, throw authentication error
    if (!user) {
      const error: AuthError = {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid email or password'
      }
      throw error
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      const error: AuthError = {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid email or password'
      }
      throw error
    }

    // Return user information (without password hash)
    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    }
  } catch (error: any) {
    // Re-throw AuthError as-is
    if (error.code) {
      throw error
    }

    // Wrap unexpected errors
    const authError: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
    throw authError
  }
}