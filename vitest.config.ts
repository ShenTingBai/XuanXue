import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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
    passWithNoTests: process.env.CI ? false : true,
    coverage: {
      provider: 'v8',
      enabled: false,
      thresholds: {
        lines: 60,
        branches: 45,
        functions: 60,
        statements: 60,
      },
      include: ['composables/**/*.ts', 'utils/**/*.ts', 'server/utils/**/*.ts'],
      exclude: ['constants/**', 'tests/**', 'node_modules/**'],
    },
  },
})
