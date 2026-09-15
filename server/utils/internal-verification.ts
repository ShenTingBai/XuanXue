/**
 * 授权内部验证白名单（D3 方案 B，默认关闭）。
 *
 * 治理规范 §20.2 允许 `internal + enabled` 用于**授权内部验证**，但本项目此前从未落地：
 * 工具被中间件一律重定向到状态页，导致验收期无法在真实构建上打开内部工具页面。
 *
 * 本模块只做一件事：把"授权"落到一个**服务端环境变量**上，并在**未设置时判定恒为 false**，
 * 使线上（`public_preview`）行为与启用前完全一致——即默认关闭、失败关闭。
 *
 * 环境变量格式：`XUANXUE_INTERNAL_TOOLS=bazi:12,34`
 * （逗号分隔的 `工具id:账号id` 或 `工具id:账号id|账号id`，两端空白忽略）。
 * 该变量只读进程环境，不读数据库、不落盘、不记录账号信息。
 *
 * @author LiXinwen
 */

/** 解析后的白名单：工具 id → 允许的账号 id 集合。 */
export type InternalAllowlist = Map<string, Set<number>>

/**
 * 解析白名单；未设置、空串或全部格式非法时返回空 Map（等价于"谁都不放行"）。
 * 格式非法的条目被丢弃而不是放宽为"该工具全部账号"，避免配置写错变成敞口。
 */
export function parseInternalAllowlist(raw: string | undefined): InternalAllowlist {
  const allowlist: InternalAllowlist = new Map()
  if (typeof raw !== 'string' || raw.trim() === '') return allowlist

  for (const entry of raw.split(',')) {
    const [toolIdPart, accountsPart] = entry.split(':')
    const toolId = toolIdPart?.trim()
    if (!toolId || !accountsPart) continue

    const accounts = new Set<number>()
    for (const accountPart of accountsPart.split('|')) {
      const accountId = Number(accountPart.trim())
      if (Number.isInteger(accountId) && accountId > 0) accounts.add(accountId)
    }
    if (accounts.size === 0) continue

    const existing = allowlist.get(toolId)
    if (existing) {
      for (const accountId of accounts) existing.add(accountId)
    } else {
      allowlist.set(toolId, accounts)
    }
  }
  return allowlist
}

let cachedRaw: string | undefined
let cachedAllowlist: InternalAllowlist = new Map()

/** 读取并缓存当前进程环境中的白名单（按原始值记忆，环境变量变更即重新解析）。 */
function currentAllowlist(): InternalAllowlist {
  const raw = process.env.XUANXUE_INTERNAL_TOOLS
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedAllowlist = parseInternalAllowlist(raw)
  }
  return cachedAllowlist
}

/**
 * 该账号是否被授权对该工具进行内部验证。
 * 未设置环境变量时恒为 false（默认关闭）；账号不是正整数时恒为 false。
 */
export function isInternalVerificationAllowed(toolId: string, accountId: number): boolean {
  if (!Number.isInteger(accountId) || accountId <= 0) return false
  const accounts = currentAllowlist().get(toolId)
  return accounts ? accounts.has(accountId) : false
}
