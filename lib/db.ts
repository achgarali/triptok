import { Pool } from 'pg'

const globalForDb = globalThis as unknown as {
  db: Pool | undefined
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create a connection pool for Supabase
// The pool handles connections efficiently for serverless environments
export const db =
  globalForDb.db ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool settings for serverless
    max: 1, // Maximum 1 connection per serverless function
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // SSL is required for Supabase
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

// In development, store the pool in global to avoid creating multiple pools during hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db
}

// Helper function to execute queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await db.query(text, params)
  return result.rows
}

// Helper function to execute a single row query
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await db.query(text, params)
  return result.rows[0] || null
}

