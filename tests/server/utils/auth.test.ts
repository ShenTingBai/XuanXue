import { describe, it, expect, beforeAll } from 'vitest'
import { resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { initDb, dbRun, dbGet, dbAll, getDb } from '../../../server/database/db'
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  resolveSession,
  deleteSession,
  deleteAllSessions,
  deleteSessionById,
  cleanupExpiredSessions,
} from '../../../server/utils/auth'
import { withTransaction } from '../../../server/database/db'

describe('R2 认证与会话工具（真实临时数据库）', () => {
  beforeAll(async () => {
    // 前置安全断言：必须由 globalSetup 注入临时 DB_PATH，绝不使用真实 xuanxue.db
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
  })

  describe('密码哈希', () => {
    it('hashPassword 生成带随机盐的 scrypt 哈希，两次哈希不同', () => {
      const h1 = hashPassword('password123')
      const h2 = hashPassword('password123')
      expect(h1).not.toBe(h2)
      expect(h1.split(':')).toHaveLength(2)
      expect(h1.split(':')[1]).toHaveLength(128)
    })

    it('verifyPassword 正确验证与拒绝', () => {
      const h = hashPassword('password123')
      expect(verifyPassword('password123', h)).toBe(true)
      expect(verifyPassword('wrongpass', h)).toBe(false)
    })

    it('畸形哈希一律拒绝且不抛异常', () => {
      expect(verifyPassword('password123', '')).toBe(false)
      expect(verifyPassword('password123', 'salt:')).toBe(false)
      expect(verifyPassword('password123', 'salt:short')).toBe(false)
      expect(verifyPassword('password123', 'a:b'.repeat(100))).toBe(false)
    })

    it('128 个非十六进制字符的哈希拒绝且不抛异常', () => {
      // 128 个 'g' 长度正确但不是合法十六进制：decode 后长度会错位，必须在 timingSafeEqual 前拒绝
      expect(verifyPassword('password123', `salt:${'g'.repeat(128)}`)).toBe(false)
      // 大写十六进制长度正确但解码后长度错误（128 个 'a' 合法但应代表 64 字节，这里故意用奇数错位验证）
      expect(verifyPassword('password123', `salt:${'z'.repeat(128)}`)).toBe(false)
    })

    it('错误解码长度与奇数十六进制拒绝且不抛异常', () => {
      // 偶数字节但解码后不是 64 字节：127 个十六进制字符（奇数长度）
      expect(verifyPassword('password123', `salt:${'a'.repeat(127)}`)).toBe(false)
      // 128 个合法十六进制字符解码后是 64 字节，但这里用 32 字节的短值模拟错误编码
      expect(verifyPassword('password123', `salt:${'ab'.repeat(32)}`)).toBe(false)
    })
  })

  describe('事务边界 withTransaction', () => {
    // 覆盖范围说明：以下用例真实覆盖成功提交、回调异常回滚、异步 Promise 拒绝、
    // 以及失败后普通 dbRun 深度归零仍可持久化。
    // 未覆盖边界：BEGIN 本身失败（嵌套 BEGIN 注入依赖 sql.js 底层透传行为，本轮未运行
    // 测试套件验证，故不虚构该覆盖；由静态审查确认 withTransaction 在 BEGIN 成功前不递增深度，
    // BEGIN 抛错时深度保持 0，不会遗留错误深度）。
    it('成功回调返回结果并在提交后调度持久化', () => {
      const nickname = `tx_ok_${Date.now()}`
      const result = withTransaction(() => {
        const r = dbRun(
          "INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, 'active', ?, ?, ?)",
          [
            nickname,
            hashPassword('password123'),
            new Date().toISOString(),
            '2026-09-08',
            '2026-09-08',
          ],
        )
        return r.lastInsertRowid
      })
      expect(result).toBeGreaterThan(0)
      const row = dbGet('SELECT id FROM accounts WHERE id = ?', [result])
      expect(row).toBeDefined()
    })

    it('回调抛异常时回滚且不留残留行', () => {
      const nickname = `tx_fail_${Date.now()}`
      expect(() =>
        withTransaction(() => {
          dbRun(
            "INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, 'active', ?, ?, ?)",
            [
              nickname,
              hashPassword('password123'),
              new Date().toISOString(),
              '2026-09-08',
              '2026-09-08',
            ],
          )
          throw new Error('boom')
        }),
      ).toThrow('boom')
      const row = dbGet('SELECT id FROM accounts WHERE nickname = ?', [nickname])
      expect(row).toBeUndefined()
    })

    it('回调返回 Promise 时拒绝并回滚', () => {
      const nickname = `tx_async_${Date.now()}`
      expect(() =>
        withTransaction(() => {
          dbRun(
            "INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, 'active', ?, ?, ?)",
            [
              nickname,
              hashPassword('password123'),
              new Date().toISOString(),
              '2026-09-08',
              '2026-09-08',
            ],
          )
          return Promise.resolve(1) as unknown as number
        }),
      ).toThrow('withTransaction 回调必须同步完成')
      const row = dbGet('SELECT id FROM accounts WHERE nickname = ?', [nickname])
      expect(row).toBeUndefined()
    })

    it('事务失败后普通 dbRun 仍可调度持久化（深度归零）', () => {
      // 失败事务后深度应归零，普通 dbRun 的写入仍能持久化到临时库
      try {
        withTransaction(() => {
          throw new Error('boom')
        })
      } catch {
        // 忽略
      }
      // 事务深度应为 0；此后 dbRun 正常写入且可读取
      const nickname = `tx_after_${Date.now()}`
      const r = dbRun(
        "INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, 'active', ?, ?, ?)",
        [
          nickname,
          hashPassword('password123'),
          new Date().toISOString(),
          '2026-09-08',
          '2026-09-08',
        ],
      )
      expect(r.lastInsertRowid).toBeGreaterThan(0)
      const row = dbGet('SELECT id FROM accounts WHERE nickname = ?', [nickname])
      expect(row).toBeDefined()
    })
  })

  describe('会话创建与解析', () => {
    let accountId: number
    beforeAll(() => {
      // 用事务插入一个测试账号，保证多会话测试互不影响
      accountId = withTransaction(() => {
        const r = dbRun(
          "INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, 'active', ?, ?, ?)",
          [
            `r2auth_${Date.now()}`,
            hashPassword('password123'),
            new Date().toISOString(),
            '2026-09-08',
            '2026-09-08',
          ],
        )
        return r.lastInsertRowid
      })
    })

    it('创建会话只保存 token_hash，且不删除其他会话', () => {
      const t1 = createSessionToken(accountId)
      const t2 = createSessionToken(accountId)
      expect(t1).not.toBe(t2)

      // resolveSession 都有效
      expect(resolveSession(t1)).not.toBeNull()
      expect(resolveSession(t2)).not.toBeNull()

      // 数据库只有 token_hash，没有原始 token
      const rows = dbAll('SELECT token_hash FROM sessions WHERE account_id = ?', [accountId])
      const hashes = rows.map(row => row.token_hash as string)
      expect(hashes).not.toContain(t1)
      expect(hashes).not.toContain(t2)
    })

    it('resolveSession 返回 accountId 与 sessionId', () => {
      const t = createSessionToken(accountId)
      const session = resolveSession(t)
      expect(session).not.toBeNull()
      expect(session!.accountId).toBe(accountId)
      expect(typeof session!.sessionId).toBe('number')
    })

    it('deleteSessionById 只删除当前会话', () => {
      const tA = createSessionToken(accountId)
      const tB = createSessionToken(accountId)
      const sessionA = resolveSession(tA)!
      deleteSessionById(sessionA.sessionId)
      expect(resolveSession(tA)).toBeNull()
      expect(resolveSession(tB)).not.toBeNull()
    })

    it('deleteSession 按原始 token 删除', () => {
      const t = createSessionToken(accountId)
      deleteSession(t)
      expect(resolveSession(t)).toBeNull()
    })

    it('deleteAllSessions 删除账号全部会话', () => {
      const t1 = createSessionToken(accountId)
      const t2 = createSessionToken(accountId)
      deleteAllSessions(accountId)
      expect(resolveSession(t1)).toBeNull()
      expect(resolveSession(t2)).toBeNull()
    })

    it('cleanupExpiredSessions 删除过期会话', () => {
      // 手工插入一条已过期会话
      const db = getDb()
      db.run('INSERT INTO sessions (account_id, token_hash, expires_at) VALUES (?, ?, ?)', [
        accountId,
        'expired-hash-' + Date.now(),
        '2000-01-01T00:00:00.000Z',
      ])
      cleanupExpiredSessions()
      const rows = dbAll("SELECT * FROM sessions WHERE token_hash LIKE 'expired-hash-%'")
      expect(rows).toHaveLength(0)
    })
  })
})
