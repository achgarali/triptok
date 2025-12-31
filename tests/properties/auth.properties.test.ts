import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { signup, login } from '@/lib/services/authService'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

// Custom arbitraries for domain objects
const validEmail = fc.emailAddress()
const validPassword = fc.string({ minLength: 8, maxLength: 100 })

// Helper to clean up test users
async function cleanupTestUsers(emails: string[]) {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails
      }
    }
  })
}

describe('Authentication Property Tests', () => {
  afterEach(async () => {
    // Clean up all test users after each test
    await prisma.user.deleteMany({})
  })

  // Feature: trip-planning-app, Property 1: User registration creates unique accounts
  describe('Property 1: User registration creates unique accounts', () => {
    it('should create unique accounts with hashed passwords for valid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: validEmail,
            password: validPassword
          }),
          async (cred) => {
            try {
              const user = await signup(cred)
              
              // User should have unique ID
              expect(user.id).toBeDefined()
              expect(typeof user.id).toBe('string')
              
              // User should have the correct email
              expect(user.email).toBe(cred.email)
              
              // User should have createdAt timestamp
              expect(user.createdAt).toBeInstanceOf(Date)
              
              // Verify password is hashed (not stored as plaintext)
              const dbUser = await prisma.user.findUnique({
                where: { email: cred.email }
              })
              expect(dbUser).toBeDefined()
              expect(dbUser!.passwordHash).not.toBe(cred.password)
              expect(dbUser!.passwordHash.length).toBeGreaterThan(0)
              
              // Verify password hash is valid bcrypt hash
              const isValidHash = await bcrypt.compare(cred.password, dbUser!.passwordHash)
              expect(isValidHash).toBe(true)
            } finally {
              await cleanupTestUsers([cred.email])
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: trip-planning-app, Property 3: Duplicate email registration is rejected
  describe('Property 3: Duplicate email registration is rejected', () => {
    it('should reject registration with duplicate email', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmail,
          validPassword,
          validPassword,
          async (email, password1, password2) => {
            try {
              // Create first user
              await signup({ email, password: password1 })
              
              // Attempt to create second user with same email
              await expect(
                signup({ email, password: password2 })
              ).rejects.toMatchObject({
                code: 'CONFLICT',
                message: 'Email already exists'
              })
            } finally {
              await cleanupTestUsers([email])
            }
          }
        ),
        { numRuns: 50 } // Reduced runs for performance
      )
    }, { timeout: 120000 }) // Increased timeout
  })

  // Feature: trip-planning-app, Property 5: Password hashing is non-reversible
  describe('Property 5: Password hashing is non-reversible', () => {
    it('should hash passwords differently even for same password (due to salting)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validEmail, { minLength: 2, maxLength: 5 }),
          validPassword,
          async (emails, sharedPassword) => {
            const createdUsers: string[] = []
            const hashes: string[] = []

            try {
              // Create multiple users with the same password
              for (const email of emails) {
                await signup({ email, password: sharedPassword })
                
                const dbUser = await prisma.user.findUnique({
                  where: { email }
                })
                
                expect(dbUser).toBeDefined()
                
                // Hash should not equal plaintext password
                expect(dbUser!.passwordHash).not.toBe(sharedPassword)
                
                hashes.push(dbUser!.passwordHash)
                createdUsers.push(email)
              }
              
              // All hashes should be different (due to salting)
              const uniqueHashes = new Set(hashes)
              expect(uniqueHashes.size).toBe(hashes.length)
              
            } finally {
              await cleanupTestUsers(createdUsers)
            }
          }
        ),
        { numRuns: 50, timeout: 120000 } // Reduced runs and increased timeout
      )
    }, { timeout: 180000 }) // Increased test timeout
  })

  // Feature: trip-planning-app, Property 2: Valid credentials authenticate successfully
  describe('Property 2: Valid credentials authenticate successfully', () => {
    it('should authenticate successfully with valid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: validEmail,
            password: validPassword
          }),
          async (cred) => {
            try {
              // First, create the user
              await signup(cred)
              
              // Then, try to login with the same credentials
              const authenticatedUser = await login(cred)
              
              // Should return user information
              expect(authenticatedUser).toBeDefined()
              expect(authenticatedUser.id).toBeDefined()
              expect(authenticatedUser.email).toBe(cred.email)
              expect(authenticatedUser.createdAt).toBeInstanceOf(Date)
            } finally {
              await cleanupTestUsers([cred.email])
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: trip-planning-app, Property 4: Invalid credentials are rejected
  describe('Property 4: Invalid credentials are rejected', () => {
    it('should reject login with non-existent email', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmail,
          validPassword,
          async (email, password) => {
            try {
              // Try to login with email that doesn't exist
              await expect(
                login({ email, password })
              ).rejects.toMatchObject({
                code: 'AUTHENTICATION_ERROR',
                message: 'Invalid email or password'
              })
            } finally {
              // No cleanup needed - user doesn't exist
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject login with wrong password', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmail,
          validPassword,
          validPassword,
          async (email, correctPassword, wrongPassword) => {
            // Only test when passwords are different
            if (correctPassword === wrongPassword) {
              return
            }

            try {
              // Create user with correct password
              await signup({ email, password: correctPassword })
              
              // Try to login with wrong password
              await expect(
                login({ email, password: wrongPassword })
              ).rejects.toMatchObject({
                code: 'AUTHENTICATION_ERROR',
                message: 'Invalid email or password'
              })
            } finally {
              await cleanupTestUsers([email])
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject login with invalid email format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
          validPassword,
          async (invalidEmail, password) => {
            await expect(
              login({ email: invalidEmail, password })
            ).rejects.toMatchObject({
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: [{ field: 'email', message: 'Invalid email format' }]
            })
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
