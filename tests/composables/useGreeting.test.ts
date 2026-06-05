/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// Global mocks: localStorage, Nuxt useState
// ============================================================================

const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value
  },
  removeItem: (key: string) => {
    delete store[key]
  },
  clear: () => {
    Object.keys(store).forEach(k => delete store[k])
  },
})

const stateMap = new Map<string, { value: any }>()
vi.stubGlobal(
  'useState',
  vi.fn(<T>(key: string, init?: () => T): { value: T } => {
    if (!stateMap.has(key)) {
      stateMap.set(key, { value: init ? init() : undefined })
    }
    return stateMap.get(key)!
  }),
)

// ============================================================================
// Tests
// ============================================================================

let useGreeting: typeof import('../../composables/useGreeting').useGreeting

beforeEach(async () => {
  vi.resetModules()
  stateMap.clear()
  Object.keys(store).forEach(k => delete store[k])
  const mod = await import('../../composables/useGreeting')
  useGreeting = mod.useGreeting
})

const STORAGE_KEY = 'xuanxue:greeting'

describe('useGreeting', () => {
  // ========================================================================
  // Default values
  // ========================================================================

  describe('default values', () => {
    it('returns default prefix "你好"', () => {
      const { prefix } = useGreeting()
      expect(prefix.value).toBe('你好')
    })

    it('returns default subtitle "择一而探，洞见天机"', () => {
      const { subtitle } = useGreeting()
      expect(subtitle.value).toBe('择一而探，洞见天机')
    })
  })

  // ========================================================================
  // save()
  // ========================================================================

  describe('save', () => {
    it('updates prefix and subtitle values', () => {
      const { prefix, subtitle, save } = useGreeting()
      save('大家好', '探索奥秘')
      expect(prefix.value).toBe('大家好')
      expect(subtitle.value).toBe('探索奥秘')
    })

    it('writes to localStorage with key "xuanxue:greeting"', () => {
      const { save } = useGreeting()
      save('大家好', '探索奥秘')
      const stored = JSON.parse(store[STORAGE_KEY])
      expect(stored).toEqual({ prefix: '大家好', subtitle: '探索奥秘' })
    })

    it('updates localStorage on subsequent saves', () => {
      const { save } = useGreeting()
      save('第一次', '第一副标题')
      expect(JSON.parse(store[STORAGE_KEY]).prefix).toBe('第一次')

      save('第二次', '第二副标题')
      expect(JSON.parse(store[STORAGE_KEY]).prefix).toBe('第二次')
      expect(JSON.parse(store[STORAGE_KEY]).subtitle).toBe('第二副标题')
    })
  })

  // ========================================================================
  // Singleton
  // ========================================================================

  describe('singleton', () => {
    it('returns same prefix and subtitle objects on subsequent calls', () => {
      const first = useGreeting()
      first.save('自定义', '自定义副标题')

      const second = useGreeting()
      // Both calls should return the same reactive ref objects
      expect(second.prefix).toBe(first.prefix)
      expect(second.subtitle).toBe(first.subtitle)
      // Values should match
      expect(second.prefix.value).toBe('自定义')
      expect(second.subtitle.value).toBe('自定义副标题')
    })

    it('save from either call updates the same shared state', () => {
      const first = useGreeting()
      const second = useGreeting()
      // Both save functions operate on the same shared refs
      first.save('第一次', '副标题A')
      expect(second.prefix.value).toBe('第一次')
      expect(second.subtitle.value).toBe('副标题A')

      second.save('第二次', '副标题B')
      expect(first.prefix.value).toBe('第二次')
      expect(first.subtitle.value).toBe('副标题B')
    })
  })

  // ========================================================================
  // localStorage hydration
  // ========================================================================

  describe('localStorage hydration', () => {
    it('reads saved prefix from localStorage on init', async () => {
      // Pre-populate localStorage before creating the module
      store[STORAGE_KEY] = JSON.stringify({ prefix: '存储的你好', subtitle: '存储的副标题' })
      // Reset and re-import so loadDefaults() picks up the stored value
      vi.resetModules()
      stateMap.clear()
      const mod = await import('../../composables/useGreeting')
      const localUseGreeting = mod.useGreeting
      const { prefix, subtitle } = localUseGreeting()
      expect(prefix.value).toBe('存储的你好')
      expect(subtitle.value).toBe('存储的副标题')
    })

    it('falls back to defaults when localStorage has corrupted JSON', async () => {
      store[STORAGE_KEY] = 'corrupted{{{json'
      vi.resetModules()
      stateMap.clear()
      const mod = await import('../../composables/useGreeting')
      const localUseGreeting = mod.useGreeting
      const { prefix, subtitle } = localUseGreeting()
      expect(prefix.value).toBe('你好')
      expect(subtitle.value).toBe('择一而探，洞见天机')
    })

    it('falls back to defaults when saved prefix is empty', async () => {
      store[STORAGE_KEY] = JSON.stringify({ prefix: '', subtitle: '' })
      vi.resetModules()
      stateMap.clear()
      const mod = await import('../../composables/useGreeting')
      const localUseGreeting = mod.useGreeting
      const { prefix, subtitle } = localUseGreeting()
      expect(prefix.value).toBe('你好')
      expect(subtitle.value).toBe('择一而探，洞见天机')
    })
  })
})
