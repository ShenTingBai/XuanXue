export function safeJsonParse(str: unknown): unknown {
  if (typeof str !== 'string') return str
  try { return JSON.parse(str) } catch { return str }
}
