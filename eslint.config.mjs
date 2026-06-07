import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

// Nuxt/Vue auto-imports — resolved by Nuxt at build time
const nuxtGlobals = {
  // Vue 3 auto-imports
  ref: 'readonly',
  computed: 'readonly',
  watch: 'readonly',
  watchEffect: 'readonly',
  onMounted: 'readonly',
  onUnmounted: 'readonly',
  onBeforeUnmount: 'readonly',
  nextTick: 'readonly',
  useId: 'readonly',
  useTemplateRef: 'readonly',
  defineProps: 'readonly',
  defineEmits: 'readonly',
  defineExpose: 'readonly',
  withDefaults: 'readonly',
  // Nuxt auto-imports
  useState: 'readonly',
  useFetch: 'readonly',
  $fetch: 'readonly',
  useRouter: 'readonly',
  useRoute: 'readonly',
  useHead: 'readonly',
  useSeoMeta: 'readonly',
  navigateTo: 'readonly',
  defineNuxtConfig: 'readonly',
  definePageMeta: 'readonly',
  // Nitro auto-imports
  defineEventHandler: 'readonly',
  getRouterParams: 'readonly',
  readBody: 'readonly',
  createError: 'readonly',
  sendError: 'readonly',
  setResponseStatus: 'readonly',
  // Nuxt composables from project
  useAuth: 'readonly',
  useBaZi: 'readonly',
  useSolarTerms: 'readonly',
  getSolarTerm: 'readonly',
  useShenSha: 'readonly',
  useLiuNian: 'readonly',
  useShengXiao: 'readonly',
  useConstellation: 'readonly',
  useGreeting: 'readonly',
  useYijing: 'readonly',
  useZiwei: 'readonly',
  useHeHun: 'readonly',
  useCezi: 'readonly',
  useNameTest: 'readonly',
  useZeJi: 'readonly',
  useMonthlyFortune: 'readonly',
  useNatalChart: 'readonly',
  useExportImage: 'readonly',
  // Vue Router composables
  onBeforeRouteLeave: 'readonly',
}

export default [
  // Global ignores
  {
    ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'dist/**', 'deploy/**', '.claude/**'],
  },

  // Base JS/TS recommended
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Vue flat recommended
  ...pluginVue.configs['flat/recommended'],

  // Client-side: Vue SFC + TypeScript (browser env)
  {
    files: ['**/*.{ts,vue}', '!server/**', '!tests/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...nuxtGlobals,
      },
    },
  },

  // Server files: Node.js env
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...nuxtGlobals,
      },
    },
  },

  // Test files: Node.js env + relaxed rules
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...nuxtGlobals,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // Vue files: set TS parser for <script> blocks
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },

  // Project-wide rule overrides
  {
    rules: {
      // conventions
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-debugger': 'error',
      // style — warn, not error (existing code)
      'prefer-const': 'warn',
      'no-empty': 'warn',
      'no-useless-assignment': 'warn',
      // Vue relaxed
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/no-v-html': 'warn',
      // Prettier handles formatting — avoid circular conflicts
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
    },
  },

  // Config files
  {
    files: ['*.config.{js,mjs,cjs,ts}', 'nuxt.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
]
