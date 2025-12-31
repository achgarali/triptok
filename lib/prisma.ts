// Use standard Prisma client for both development and production
// Prisma Edge client requires prisma:// URLs (Prisma Accelerate), which we don't have
// We'll use the standard client even though Prisma generates engine=none on Vercel
// This requires Prisma Accelerate or a workaround - for now, we'll try with standard client
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use DATABASE_URL for Supabase connection
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Add ?pgbouncer=true for Supabase pooler if not already present
let finalDatabaseUrl = databaseUrl
if (databaseUrl.includes('pooler.supabase.com') && !databaseUrl.includes('pgbouncer=true')) {
  const separator = databaseUrl.includes('?') ? '&' : '?'
  finalDatabaseUrl = `${databaseUrl}${separator}pgbouncer=true`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: finalDatabaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
