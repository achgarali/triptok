import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use PRISMA_DATABASE_URL if available (for Prisma Accelerate/Data Proxy)
// Otherwise fall back to DATABASE_URL (for direct PostgreSQL connection)
// In production on Vercel, Prisma generates with engine=none, so we need to use PRISMA_DATABASE_URL
const databaseUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL or PRISMA_DATABASE_URL environment variable is not set')
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
