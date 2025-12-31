import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    env: loadEnv(mode, process.cwd(), ''),
    testTimeout: 60000, // 60 seconds for property-based tests with 100 iterations
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
}))
