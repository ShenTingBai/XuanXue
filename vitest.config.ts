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
    globalSetup: ['tests/helpers/vitest-global-setup.ts'],
    passWithNoTests: process.env.CI ? false : true,
    coverage: {
      provider: 'v8',
      // 本地 `npm test` 保持轻量；CI 与 `npm run test:coverage` 用 --coverage 显式开启。
      // 旧配置 enabled:false 且仓库内没有任何 --coverage 入口，thresholds 从未被评估过。
      enabled: false,
      // 阈值只允许上调，不允许为了变绿而下调。
      // 基线为 2026-09-15 实测值（含 server/api、server/services、server/database）：
      // 语句 86.91 / 分支 82.43 / 函数 93.31 / 行 86.91，此处留约 2 个点余量。
      // 注：components/** 与 pages/** 暂未纳入 include（覆盖极低），
      // 纳入前需先补测试，否则会把全局阈值拉到无意义。
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 91,
        statements: 85,
      },
      // 纳入服务端业务层：旧 include 把 server/api、server/services、server/database
      // 全部排除，等于"被调用最多的那层不计量"。
      include: [
        'composables/**/*.ts',
        'utils/**/*.ts',
        'server/utils/**/*.ts',
        'server/api/**/*.ts',
        'server/services/**/*.ts',
        'server/database/**/*.ts',
      ],
      exclude: ['constants/**', 'tests/**', 'node_modules/**', '.nuxt/**', '.output/**'],
    },
  },
})
