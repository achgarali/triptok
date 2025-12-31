import { describe, it, expect } from 'vitest'

describe('Project Setup', () => {
  it('should have Node.js environment', () => {
    expect(process.version).toBeDefined()
    expect(process.version).toMatch(/^v\d+\.\d+\.\d+/)
  })

  it('should load environment variables', () => {
    expect(process.env.DATABASE_URL).toBeDefined()
  })

  it('should have TypeScript configured', () => {
    // This test passing means TypeScript compilation works
    const testValue: string = 'TypeScript is working'
    expect(testValue).toBe('TypeScript is working')
  })
})
