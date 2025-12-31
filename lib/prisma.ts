// On Vercel, Prisma generates engine=none, so we MUST use Edge client
// Supabase connection pooler works with Edge client
// In development, use standard client with direct PostgreSQL connection
const { PrismaClient } = process.env.NODE_ENV === 'production'
  ? require('@prisma/client/edge')
  : require('@prisma/client')

const globalForPrisma = globalThis as unknown as {
  prisma: typeof PrismaClient | undefined
}

// In production, use DATABASE_URL (Supabase pooler URL works with Edge client)
// In development, use DATABASE_URL (direct PostgreSQL)
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// In production with Edge client, we can use Supabase pooler URL directly
// Supabase pooler URLs are in format: postgresql://postgres:[password]@[host]:6543/postgres
// The Edge client can work with postgresql:// URLs from Supabase pooler
let finalDatabaseUrl = databaseUrl

// Convert prisma+postgres:// to prisma:// if using Prisma Accelerate
if (databaseUrl.startsWith('prisma+postgres://')) {
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
