import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { initDb, dbRun, dbAll } from '../../server/database/db'
import {
  hashPassword,
  createSessionToken,
  resolveSession,
  deleteSession,
} from '../../server/utils/auth'
import { checkRateLimit } from '../../server/utils/rateLimit'

describe('R2 账号与会话最小集成（真实临时数据库）', () => {
  let accountId: number
  let token: string
  let otherAccountId: number
  let otherToken: string

  beforeAll(async () => {
    // 数据安全前置断言：必须在使用真实/不安全路径初始化数据库之前失败。
    // db.ts 在模块加载时固定 DB_PATH，因此这里必须位于 await initDb() 之前；
    // 断言失败时 initDb 不会执行，预期失败回归也不能写真实数据库。
    const dbPath = process.env.DB_PATH
    expect(dbPath, 'DB_PATH 必须在测试初始化前被注入（由 globalSetup 提供）').toBeDefined()
    const resolvedDbPath = resolve(dbPath as string)
    const projectDbPath = resolve(process.cwd(), 'xuanxue.db')
    const tmpRoot = resolve(tmpdir())
    expect(resolvedDbPath, 'DB_PATH 不得指向项目真实数据库 xuanxue.db').not.toBe(projectDbPath)
    expect(resolvedDbPath.startsWith(tmpRoot + sep), 'DB_PATH 必须位于操作系统临时目录之下').toBe(
      true,
    )

    await initDb()

    // 清理遗留测试数据
    dbRun(
      "DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE nickname LIKE 'test_r2_%')",
    )
    dbRun(
      "DELETE FROM security_log WHERE account_id IN (SELECT id FROM accounts WHERE nickname LIKE 'test_r2_%')",
    )
    dbRun("DELETE FROM accounts WHERE nickname LIKE 'test_r2_%'")

    // 创建测试账号 1
    const credential = hashPassword('password123')
    const { lastInsertRowid: acc1 } = dbRun(
      "INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, 'active', ?, ?, ?)",
      [
        `test_r2_user1_${Date.now()}`,
        credential,
        new Date().toISOString(),
        '2026-09-08',
        '2026-09-08',
      ],
    )
    accountId = acc1
    token = createSessionToken(accountId)

    // 创建测试账号 2（不同所有者）
    const { lastInsertRowid: acc2 } = dbRun(
      "INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, 'active', ?, ?, ?)",
      [
        `test_r2_user2_${Date.now()}`,
        credential,
        new Date().toISOString(),
        '2026-09-08',
        '2026-09-08',
      ],
    )
    otherAccountId = acc2
    otherToken = createSessionToken(otherAccountId)
  })

  afterAll(() => {
    // 清理测试数据
    deleteSession(token)
    deleteSession(otherToken)
    dbRun('DELETE FROM sessions WHERE account_id IN (?, ?)', [accountId, otherAccountId])
    dbRun('DELETE FROM security_log WHERE account_id IN (?, ?)', [accountId, otherAccountId])
    dbRun('DELETE FROM accounts WHERE id IN (?, ?)', [accountId, otherAccountId])
  })

  describe('多会话与账号隔离', () => {
    it('同一账号可并存多个会话', () => {
      const t2 = createSessionToken(accountId)
      expect(resolveSession(token)).not.toBeNull()
      expect(resolveSession(t2)).not.toBeNull()
      deleteSession(t2)
    })

    it('不同账号的会话互不关联', () => {
      const a = resolveSession(token)!
      const b = resolveSession(otherToken)!
      expect(a.accountId).toBe(accountId)
      expect(b.accountId).toBe(otherAccountId)
      expect(a.accountId).not.toBe(b.accountId)
    })

    it('删除一个会话不影响另一账号会话', () => {
      deleteSession(token)
      expect(resolveSession(token)).toBeNull()
      expect(resolveSession(otherToken)).not.toBeNull()
      // 重建 token 供后续使用
      token = createSessionToken(accountId)
    })
  })

  describe('限流工具', () => {
    it('checkRateLimit 允许首次请求', () => {
      const key = `test-rate-r2-${Date.now()}`
      expect(checkRateLimit(key, 5, 60000)).toBe(true)
    })

    it('checkRateLimit 超过上限后拒绝', () => {
      const key = `test-rate-block-r2-${Date.now()}`
      for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60000)
      expect(checkRateLimit(key, 5, 60000)).toBe(false)
    })
  })

  describe('R2 schema 无旧表', () => {
    it('临时库不含 profiles 或 divination_results 表', () => {
      const tables = dbAll(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('profiles', 'divination_results')",
      )
      expect(tables).toHaveLength(0)
    })
  })
})
