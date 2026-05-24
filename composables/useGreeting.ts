const STORAGE_KEY = 'xuanxue:greeting'

const prefix = useState<string>('greeting:prefix', () => {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        return saved.prefix || '你好'
      }
    } catch {}
  }
  return '你好'
})

const subtitle = useState<string>('greeting:subtitle', () => {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        return saved.subtitle || '择一而探，洞见天机'
      }
    } catch {}
  }
  return '择一而探，洞见天机'
})

function save(newPrefix: string, newSubtitle: string) {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ prefix: newPrefix, subtitle: newSubtitle }))
  }
  prefix.value = newPrefix
  subtitle.value = newSubtitle
}

export function useGreeting() {
  return { prefix, subtitle, save }
}
