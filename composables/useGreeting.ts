const STORAGE_KEY = 'xuanxue:greeting'

/**
 * 从 localStorage 原始串读取已保存的问候语。
 *
 * `JSON.parse` 返回 `any`，若直接访问 `.prefix` / `.subtitle` 就是把未校验的外部数据
 * 当已知形状使用（localStorage 可被用户脚本或旧版本写入任意内容）。
 * 因此在边界处显式收窄为 unknown 并逐字段做 `typeof` 校验，非法形状一律返回 null。
 */
function readSavedGreeting(raw: string | null): { prefix?: string; subtitle?: string } | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const record = parsed as Record<string, unknown>
    const saved: { prefix?: string; subtitle?: string } = {}
    if (typeof record.prefix === 'string') saved.prefix = record.prefix
    if (typeof record.subtitle === 'string') saved.subtitle = record.subtitle
    return saved
  } catch {
    // 非法 JSON：按未保存处理，不抛出
    return null
  }
}

let _prefix: ReturnType<typeof useState<string>> | null = null
let _subtitle: ReturnType<typeof useState<string>> | null = null

function loadDefaults(): { prefix: string; subtitle: string } {
  if (import.meta.client) {
    const saved = readSavedGreeting(localStorage.getItem(STORAGE_KEY))
    if (saved) {
      return {
        prefix: saved.prefix || '你好',
        subtitle: saved.subtitle || '择一而探，洞见天机',
      }
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
    const saved = readSavedGreeting(localStorage.getItem(STORAGE_KEY))
    if (saved) {
      if (saved.prefix) _prefix!.value = saved.prefix
      if (saved.subtitle) _subtitle!.value = saved.subtitle
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
