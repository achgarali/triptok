import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

/**
 * Get the current user session on the server side
 * Use this in Server Components, API routes, and Server Actions
 */
export async function getSession() {
  return await getServerSession(authOptions)
}

/**
 * Get the current user from the session
 * Returns null if user is not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}

