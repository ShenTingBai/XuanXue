const STORAGE_KEY = 'xuanxue:greeting'

let _prefix: ReturnType<typeof useState<string>> | null = null
let _subtitle: ReturnType<typeof useState<string>> | null = null

function loadDefaults(): { prefix: string; subtitle: string } {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        return {
          prefix: saved.prefix || '你好',
          subtitle: saved.subtitle || '择一而探，洞见天机',
        }
      }
    } catch {
      // Intentionally empty: localStorage not available in SSR
    }
  }
  return { prefix: '你好', subtitle: '择一而探，洞见天机' }
}

let _hydrated = false

export function useGreeting() {
  if (!_prefix) {
    const defaults = loadDefaults()
    _prefix = useState<string>('greeting:prefix', () => defaults.prefix)
    _subtitle = useState<string>('greeting:subtitle', () => defaults.subtitle)
  }

  // Hydrate from localStorage on first client-side call only.
  // On Nuxt SSR hydration useState ignores the factory (returns serialized SSR value),
  // so we must explicitly override with the saved greeting here.
  if (import.meta.client && !_hydrated) {
    _hydrated = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.prefix) _prefix!.value = saved.prefix
        if (saved.subtitle) _subtitle!.value = saved.subtitle
      }
    } catch {
      // Intentionally empty: localStorage not available in SSR
    }
  }

  function save(newPrefix: string, newSubtitle: string) {
    if (import.meta.client) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ prefix: newPrefix, subtitle: newSubtitle }),
      )
    }
    _prefix!.value = newPrefix
    _subtitle!.value = newSubtitle
  }

  if (!_prefix || !_subtitle) {
    throw new Error('useGreeting not initialized')
  }
  return { prefix: _prefix, subtitle: _subtitle, save }
}
