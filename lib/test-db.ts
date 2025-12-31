import { PrismaClient } from '@prisma/client'

let testPrisma: PrismaClient | undefined

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    })
  }
  return testPrisma
}

export async function cleanupTestDb() {
  if (testPrisma) {
    await testPrisma.$disconnect()
    testPrisma = undefined
  }
}

export async function resetTestDb() {
  const prisma = getTestPrisma()
  
  // Delete all records in reverse order of dependencies
  await prisma.source.deleteMany()
  await prisma.place.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.user.deleteMany()
}
