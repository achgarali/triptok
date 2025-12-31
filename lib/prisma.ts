// Use edge client in production (Vercel) to work with engine=none
// Use regular client in development
const { PrismaClient } = process.env.NODE_ENV === 'production'
  ? require('@prisma/client/edge')
  : require('@prisma/client')

const globalForPrisma = globalThis as unknown as {
  prisma: typeof PrismaClient | undefined
}

// In production on Vercel, Prisma generates with engine=none, so we need to use PRISMA_DATABASE_URL
// In development, use DATABASE_URL for direct PostgreSQL connection
const databaseUrl = process.env.NODE_ENV === 'production'
  ? (process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL)
  : process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    process.env.NODE_ENV === 'production'
      ? 'PRISMA_DATABASE_URL or DATABASE_URL environment variable is not set'
      : 'DATABASE_URL environment variable is not set'
  )
}

// In production, if using Prisma Accelerate, convert prisma+postgres:// to prisma://
let finalDatabaseUrl = databaseUrl
if (process.env.NODE_ENV === 'production' && databaseUrl.startsWith('prisma+postgres://')) {
  // Convert prisma+postgres:// to prisma:// format
  // prisma+postgres://accelerate.prisma-data.net/?api_key=... -> prisma://accelerate.prisma-data.net/?api_key=...
  finalDatabaseUrl = databaseUrl.replace('prisma+postgres://', 'prisma://')
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
