import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname),
    },
  },
  define: {
    'import.meta.client': 'true',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/vitest-setup.ts'],
    passWithNoTests: true,
  },
})
