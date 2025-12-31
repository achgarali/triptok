// On Vercel, Prisma generates engine=none, so we MUST use Edge client with Prisma Accelerate
// In development, use standard client with direct PostgreSQL connection
const { PrismaClient } = process.env.NODE_ENV === 'production'
  ? require('@prisma/client/edge')
  : require('@prisma/client')

const globalForPrisma = globalThis as unknown as {
  prisma: typeof PrismaClient | undefined
}

// In production, use PRISMA_DATABASE_URL (Prisma Accelerate) or DATABASE_URL
// In development, use DATABASE_URL (direct PostgreSQL)
const databaseUrl = process.env.NODE_ENV === 'production'
  ? (process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL)
  : process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    process.env.NODE_ENV === 'production'
      ? 'PRISMA_DATABASE_URL or DATABASE_URL must be set. On Vercel, Prisma requires Prisma Accelerate (prisma:// URL).'
      : 'DATABASE_URL environment variable is not set'
  )
}

// In production, convert prisma+postgres:// to prisma:// for Edge client
let finalDatabaseUrl = databaseUrl
if (process.env.NODE_ENV === 'production') {
  if (databaseUrl.startsWith('prisma+postgres://')) {
    // Convert prisma+postgres:// to prisma://
    finalDatabaseUrl = databaseUrl.replace('prisma+postgres://', 'prisma://')
  } else if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    // If using direct PostgreSQL URL in production, this won't work with engine=none
    // User needs to set up Prisma Accelerate
    throw new Error(
      'On Vercel, Prisma generates engine=none which requires Prisma Accelerate. ' +
      'Please set PRISMA_DATABASE_URL with a prisma:// URL from Prisma Accelerate, ' +
      'or use a database provider that supports direct connections (Supabase, Neon, etc.).'
    )
  }
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
