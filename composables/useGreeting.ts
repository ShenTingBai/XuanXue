const STORAGE_KEY = 'xuanxue:greeting'

interface GreetingSettings {
  prefix: string
  subtitle: string
}

export const useGreeting = () => {
  const prefix = ref('你好')
  const subtitle = ref('择一而探，洞见天机')

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as GreetingSettings
        prefix.value = data.prefix || '你好'
        subtitle.value = data.subtitle || '择一而探，洞见天机'
      }
    } catch { /* ignore */ }
  }

  if (import.meta.client) {
    // Load in onMounted to avoid SSR hydration mismatch
    onMounted(load)
  }

  function save(newPrefix: string, newSubtitle: string) {
    prefix.value = newPrefix
    subtitle.value = newSubtitle
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ prefix: newPrefix, subtitle: newSubtitle }))
  }

  return { prefix, subtitle, save }
}
