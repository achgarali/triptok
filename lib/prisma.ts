import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use DATABASE_URL for direct PostgreSQL connection
// This works with the native Prisma engine (not Data Proxy)
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Verify that we're using a direct PostgreSQL connection, not Prisma Data Proxy
if (databaseUrl.startsWith('prisma://') || databaseUrl.startsWith('prisma+postgres://')) {
  throw new Error(
    'DATABASE_URL must be a direct PostgreSQL connection (postgres:// or postgresql://). ' +
    'Prisma Data Proxy URLs (prisma://) are not supported. ' +
    'Please remove PRISMA_DATABASE_URL from your environment variables if it exists.'
  )
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
