import { afterEach, describe, expect, it } from 'vitest'
import {
  isInternalVerificationAllowed,
  parseInternalAllowlist,
} from '~/server/utils/internal-verification'

/**
 * 授权内部验证白名单测试（D3 方案 B 的回归保障）。
 *
 * 核心不变量：**未设置环境变量时谁都不放行**。这一条保证线上（public_preview）行为
 * 与启用通道之前完全一致；其余用例覆盖配置解析的严格性——格式错误的条目必须被丢弃，
 * 而不是被放宽成"该工具全部账号可访问"。
 */

const ENV_KEY = 'XUANXUE_INTERNAL_TOOLS'
const original = process.env[ENV_KEY]

function setAllowlist(raw: string | undefined): void {
  if (raw === undefined) {
    delete process.env[ENV_KEY]
  } else {
    process.env[ENV_KEY] = raw
  }
}

afterEach(() => {
  setAllowlist(original)
})

describe('parseInternalAllowlist', () => {
  it('未设置、空串与纯空白都解析为空表（谁都不放行）', () => {
    expect(parseInternalAllowlist(undefined).size).toBe(0)
    expect(parseInternalAllowlist('').size).toBe(0)
    expect(parseInternalAllowlist('   ').size).toBe(0)
  })

  it('解析工具与账号白名单，支持多个账号（| 分隔）与两端空白', () => {
    const allowlist = parseInternalAllowlist(' bazi:12|34 , zeji:5 ')
    expect([...(allowlist.get('bazi') ?? [])].sort((a, b) => a - b)).toEqual([12, 34])
    expect([...(allowlist.get('zeji') ?? [])]).toEqual([5])
  })

  it('非法账号与非法条目被丢弃，不放宽为全量', () => {
    const allowlist = parseInternalAllowlist('bazi:0,zeji:abc,bazi:-3,noColon,bazi:9')
    // bazi 只保留合法正整数 9；0/-3/abc 全部丢弃。
    expect([...(allowlist.get('bazi') ?? [])]).toEqual([9])
    expect(allowlist.has('zeji')).toBe(false)
    expect(allowlist.has('noColon')).toBe(false)
  })

  it('工具名缺失或账号段缺失的条目被忽略', () => {
    const allowlist = parseInternalAllowlist(':12,bazi:')
    expect(allowlist.size).toBe(0)
  })
})

describe('isInternalVerificationAllowed', () => {
  it('未设置环境变量时对任何账号都返回 false（默认关闭）', () => {
    setAllowlist(undefined)
    expect(isInternalVerificationAllowed('bazi', 12)).toBe(false)
    expect(isInternalVerificationAllowed('zeji', 5)).toBe(false)
  })

  it('白名单内账号放行，非白名单账号与非法账号拒绝', () => {
    setAllowlist('bazi:12')
    expect(isInternalVerificationAllowed('bazi', 12)).toBe(true)
    expect(isInternalVerificationAllowed('bazi', 13)).toBe(false)
    expect(isInternalVerificationAllowed('bazi', 0)).toBe(false)
    expect(isInternalVerificationAllowed('bazi', 1.5)).toBe(false)
  })

  it('只对配置中的工具放行，其余工具不受影响', () => {
    setAllowlist('bazi:12')
    expect(isInternalVerificationAllowed('bazi', 12)).toBe(true)
    // 另外 10 个工具（含同样 internal + enabled 的 zeji）不得因此获得任何放行。
    for (const toolId of [
      'zeji',
      'shengxiao',
      'constellation',
      'name-test',
      'cezi',
      'guming',
      'ziwei',
      'yijing',
      'hehun',
      'meihua',
    ]) {
      expect(isInternalVerificationAllowed(toolId, 12)).toBe(false)
    }
  })

  it('环境变量变更后立即按新值判定（不残留旧配置）', () => {
    setAllowlist('bazi:12')
    expect(isInternalVerificationAllowed('bazi', 12)).toBe(true)
    setAllowlist('bazi:99')
    expect(isInternalVerificationAllowed('bazi', 12)).toBe(false)
    expect(isInternalVerificationAllowed('bazi', 99)).toBe(true)
    setAllowlist(undefined)
    expect(isInternalVerificationAllowed('bazi', 99)).toBe(false)
  })
})
