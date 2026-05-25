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
    } catch {}
  }
  return { prefix: '你好', subtitle: '择一而探，洞见天机' }
}

export function useGreeting() {
  if (!_prefix) {
    const defaults = loadDefaults()
    _prefix = useState<string>('greeting:prefix', () => defaults.prefix)
    _subtitle = useState<string>('greeting:subtitle', () => defaults.subtitle)
  }

  // Rehydrate from localStorage on client (fixes SSR cache issue)
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.prefix) _prefix!.value = saved.prefix
        if (saved.subtitle) _subtitle!.value = saved.subtitle
      }
    } catch {}
  }

  function save(newPrefix: string, newSubtitle: string) {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ prefix: newPrefix, subtitle: newSubtitle }))
    }
    _prefix!.value = newPrefix
    _subtitle!.value = newSubtitle
  }

  return { prefix: _prefix!, subtitle: _subtitle!, save }
}
