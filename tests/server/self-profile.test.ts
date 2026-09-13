import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import initSqlJs, { type Database } from 'sql.js'
import {
  CREATE_ACCOUNTS_TABLE,
  CREATE_SESSIONS_TABLE,
  CREATE_SECURITY_LOG_TABLE,
} from '~/server/database/schema'
import {
  CREATE_SELF_PROFILES_TABLE,
  CREATE_CONSENT_RECEIPTS_TABLE,
} from '~/server/database/self-profile-schema'
import { createSelfProfileService } from '~/server/services/self-profile'
import type { SelfProfileServiceError } from '~/server/services/self-profile'
import { SELF_PROFILE_POLICY_VERSION } from '~/constants/self-profile-policy'
import type { SaveSelfProfileRequest, ExpectedProfile } from '~/types/self-profile'

/**
 * 本人档案领域服务测试（只编写，不运行）。
 *
 * 使用新的 sql.js SQL.Database() 内存库，开启外键，加载真实 R2 账号 DDL 及新 R4 两表 DDL，
 * 通过 createSelfProfileService 依赖入口绑定实际参数化 get/run/transaction。
 * 不得调用项目 initDb、不得让多 worker 共享落盘库，不新增临时业务数据库文件。
 *
 * 真实 SQL 验证：一账号一档、不同账号隔离、版本 CAS 冲突、缺失 expected、删除重建旧
 * id/version 拒绝、相同值不重复写、字段组全 null/完整约束、失败凭证写入导致日期写入回滚、
 * 删除失败回滚、撤回后 summary 不可带入但日期仍保留、再授权需要新版本确认。
 */

let SQL: Awaited<ReturnType<typeof initSqlJs>>
let db: Database

/** 固定服务端时间：校验当日按 Asia/Shanghai 为 2026-09-09。 */
const FIXED_NOW = new Date('2026-09-09T12:00:00Z')

function makeDeps() {
  const run = (
    sql: string,
    params: (string | number | null | undefined)[] = [],
  ): { lastInsertRowid: number; changes: number } => {
    db.run(sql, params)
    return { lastInsertRowid: 0, changes: db.getRowsModified() }
  }
  const get = (
    sql: string,
    params: (string | number | null | undefined)[] = [],
  ): Record<string, unknown> | undefined => {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const row = stmt.step() ? stmt.getAsObject() : undefined
    stmt.free()
    return row
  }
  const transaction = <T>(fn: () => T): T => {
    db.run('BEGIN')
    try {
      const result = fn()
      db.run('COMMIT')
      return result
    } catch (err) {
      db.run('ROLLBACK')
      throw err
    }
  }
  return { get, run, transaction, now: () => FIXED_NOW }
}

/** 插入一个账号（age_confirmed_at 已填；年龄由具体保存日期决定）。 */
function insertAccount(nickname: string): number {
  db.run(
    'INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, ?, ?, ?, ?)',
    [nickname, 'salt:hash', 'active', '2026-09-08T00:00:00.000Z', '2026-09-08', '2026-09-08'],
  )
  return db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] as number
}

function saveRequest(
  expected: ExpectedProfile,
  birthDate: SaveSelfProfileRequest['birthDate'],
): SaveSelfProfileRequest {
  return {
    expected,
    birthDate,
    consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION },
  }
}

function expectError(fn: () => unknown, code: string): void {
  try {
    fn()
    expect('should throw').toBe('did not throw')
  } catch (e) {
    expect((e as SelfProfileServiceError).code).toBe(code)
  }
}

beforeEach(async () => {
  SQL = await initSqlJs()
  db = new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')
  db.run(CREATE_ACCOUNTS_TABLE)
  db.run(CREATE_SESSIONS_TABLE)
  db.run(CREATE_SECURITY_LOG_TABLE)
  db.run(CREATE_SELF_PROFILES_TABLE)
  db.run(CREATE_CONSENT_RECEIPTS_TABLE)
})

afterEach(() => {
  // 任何失败仍关闭内存 DB。
  if (db) db.close()
})

describe('createSelfProfileService 领域服务（真实内存 SQL）', () => {
  let svc: ReturnType<typeof createSelfProfileService>
  let deps: ReturnType<typeof makeDeps>

  beforeEach(() => {
    deps = makeDeps()
    svc = createSelfProfileService(deps)
  })

  it('一账号一档：首次创建成功，再次同 expected=null 返回 VERSION_CONFLICT', () => {
    const accountId = insertAccount('user-a')
    const created = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    expect(created.birthDate?.solarDate).toBe('2000-01-01')
    expectError(
      () =>
        svc.save(
          accountId,
          saveRequest(null, { calendar: 'solar', year: 2001, month: 1, day: 1, isLeapMonth: null }),
        ),
      'VERSION_CONFLICT',
    )
  })

  it('不同账号隔离：B 账号查询不到 A 的档案', () => {
    const a = insertAccount('user-a')
    const b = insertAccount('user-b')
    svc.save(
      a,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    expect(svc.get(b)).toBeNull()
  })

  it('更新版本 CAS 冲突：旧 version 提交返回 VERSION_CONFLICT', () => {
    const accountId = insertAccount('user-a')
    const created = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    expect(created.version).toBe(1)
    // 先提交一次真实更新，再使用旧版本模拟并发客户端；当前版本本身不应冲突。
    svc.save(
      accountId,
      saveRequest(
        { profileId: created.id, version: 1 },
        { calendar: 'solar', year: 2001, month: 1, day: 1, isLeapMonth: null },
      ),
    )
    expectError(
      () =>
        svc.save(
          accountId,
          saveRequest(
            { profileId: created.id, version: 1 },
            { calendar: 'solar', year: 2001, month: 1, day: 1, isLeapMonth: null },
          ),
        ),
      'VERSION_CONFLICT',
    )
    const updated = svc.save(
      accountId,
      saveRequest(
        { profileId: created.id, version: 2 },
        { calendar: 'solar', year: 2001, month: 1, day: 1, isLeapMonth: null },
      ),
    )
    expect(updated.version).toBe(2)
  })

  it('缺失 expected 请求结构拒绝', () => {
    const accountId = insertAccount('user-a')
    expectError(
      () =>
        svc.save(accountId, {
          birthDate: { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null },
          consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION },
        } as unknown as SaveSelfProfileRequest),
      'VERSION_CONFLICT',
    )
  })

  it('删除重建：旧 id/version 的 expected 永远不能覆盖新档案', () => {
    const accountId = insertAccount('user-a')
    const created = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    const oldId = created.id
    const oldVersion = created.version
    svc.deleteProfile(accountId, { profileId: oldId, version: oldVersion })
    const recreated = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2001, month: 1, day: 1, isLeapMonth: null }),
    )
    expect(recreated.id).not.toBe(oldId)
    expectError(
      () =>
        svc.save(
          accountId,
          saveRequest(
            { profileId: oldId, version: oldVersion },
            { calendar: 'solar', year: 2002, month: 1, day: 1, isLeapMonth: null },
          ),
        ),
      'VERSION_CONFLICT',
    )
  })

  it('相同值不重复写：返回当前档案且 version 不递增', () => {
    const accountId = insertAccount('user-a')
    const created = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    const again = svc.save(
      accountId,
      saveRequest(
        { profileId: created.id, version: created.version },
        { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null },
      ),
    )
    expect(again.version).toBe(created.version)
  })

  it('未满 14 岁拒绝保存（UNDERAGE）', () => {
    const accountId = insertAccount('user-a')
    expectError(
      () =>
        svc.save(
          accountId,
          saveRequest(null, {
            calendar: 'solar',
            year: 2012,
            month: 9,
            day: 10,
            isLeapMonth: null,
          }),
        ),
      'UNDERAGE',
    )
    const ok = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2012, month: 9, day: 9, isLeapMonth: null }),
    )
    expect(ok.birthDate?.solarDate).toBe('2012-09-09')
  })

  it('告知未接受或版本不匹配拒绝（CONSENT_REQUIRED）', () => {
    const accountId = insertAccount('user-a')
    expectError(
      () =>
        svc.save(accountId, {
          expected: null,
          birthDate: { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null },
          consent: { accepted: false, policyVersion: SELF_PROFILE_POLICY_VERSION },
        } as unknown as SaveSelfProfileRequest),
      'CONSENT_REQUIRED',
    )
    expectError(
      () =>
        svc.save(accountId, {
          expected: null,
          birthDate: { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null },
          consent: { accepted: true, policyVersion: 'old-version' },
        }),
      'CONSENT_REQUIRED',
    )
  })

  it('字段组约束：公历保存时闰月字段为 NULL，农历为 0/1，均通过真实 CHECK', () => {
    // 公历：raw_is_leap_month 必须为 NULL
    const a = insertAccount('user-a')
    const createdSolar = svc.save(
      a,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    expect(createdSolar.birthDate?.raw.isLeapMonth).toBeNull()
    // 农历普通月：isLeapMonth=false → 0
    const b = insertAccount('user-b')
    const createdLunar = svc.save(
      b,
      saveRequest(null, { calendar: 'lunar', year: 2000, month: 1, day: 1, isLeapMonth: false }),
    )
    expect(createdLunar.birthDate?.raw.isLeapMonth).toBe(false)
    // 农历闰月：isLeapMonth=true → 1（2000 年无闰二月，改用 2023 闰二月）
    const c = insertAccount('user-c')
    const createdLeap = svc.save(
      c,
      saveRequest(null, { calendar: 'lunar', year: 2004, month: 2, day: 1, isLeapMonth: true }),
    )
    expect(createdLeap.birthDate?.raw.isLeapMonth).toBe(true)
  })

  it('字段组约束：公历与农历都可更新，占位符与列顺序一致', () => {
    const a = insertAccount('user-a')
    const created = svc.save(
      a,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    // 更新为农历（布尔）
    const updated = svc.save(
      a,
      saveRequest(
        { profileId: created.id, version: created.version },
        { calendar: 'lunar', year: 2000, month: 1, day: 1, isLeapMonth: false },
      ),
    )
    expect(updated.version).toBe(created.version + 1)
    expect(updated.birthDate?.raw.calendar).toBe('lunar')
    // 再更新为公历
    const updated2 = svc.save(
      a,
      saveRequest(
        { profileId: updated.id, version: updated.version },
        { calendar: 'solar', year: 2001, month: 2, day: 3, isLeapMonth: null },
      ),
    )
    expect(updated2.birthDate?.raw.calendar).toBe('solar')
    expect(updated2.birthDate?.solarDate).toBe('2001-02-03')
  })

  it('字段组约束：solar 非 null 闰月、lunar null 或 2 均被数据库 CHECK 拒绝', () => {
    const a = insertAccount('user-a')
    // solar 带非 null 闰月：服务 dateParams 会写 null，但直接破坏 CHECK 应被拒绝
    svc.save(
      a,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    expect(() =>
      db.run(
        'UPDATE self_profiles SET raw_calendar = ?, raw_is_leap_month = ? WHERE account_id = ?',
        ['solar', 1, a],
      ),
    ).toThrow()
    // lunar 闰月为 2：CHECK IN (0,1) 拒绝
    const b = insertAccount('user-b')
    svc.save(
      b,
      saveRequest(null, { calendar: 'lunar', year: 2000, month: 1, day: 1, isLeapMonth: false }),
    )
    expect(() =>
      db.run('UPDATE self_profiles SET raw_is_leap_month = ? WHERE account_id = ?', [2, b]),
    ).toThrow()
  })

  it('字段组约束：混合半空（部分字段非 NULL）被 CHECK 拒绝', () => {
    const accountId = insertAccount('user-a')
    svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    expect(() =>
      db.run('UPDATE self_profiles SET raw_calendar = NULL, raw_year = 2000 WHERE account_id = ?', [
        accountId,
      ]),
    ).toThrow()
  })

  it('字段组约束：raw_calendar=NULL 但其余公历字段完整必须拒绝（NULL 反例）', () => {
    const accountId = insertAccount('user-a')
    // 先保存合法公历，再把 calendar 置 NULL：其余公历字段仍完整，
    // 若 CHECK 用 raw_calendar='solar' 直接比较会得 NULL 而放行；显式 IS NOT NULL 后必须拒绝。
    svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    expect(() =>
      db.run(
        'UPDATE self_profiles SET raw_calendar = NULL, raw_is_leap_month = NULL WHERE account_id = ?',
        [accountId],
      ),
    ).toThrow()
    // 数据库内档案未被破坏（事务性检查由 UPDATE 抛错保证）
    expect(svc.get(accountId)?.birthDate?.solarDate).toBe('2000-01-01')
  })

  it('字段组约束：raw_calendar=NULL 但其余农历字段完整（含闰月 0/1）也必须拒绝', () => {
    const accountId = insertAccount('user-a')
    svc.save(
      accountId,
      saveRequest(null, { calendar: 'lunar', year: 2000, month: 1, day: 1, isLeapMonth: false }),
    )
    expect(() =>
      db.run('UPDATE self_profiles SET raw_calendar = NULL WHERE account_id = ?', [accountId]),
    ).toThrow()
    // 闰月为 1 的农历行同理
    const b = insertAccount('user-b')
    svc.save(
      b,
      saveRequest(null, { calendar: 'lunar', year: 2004, month: 2, day: 1, isLeapMonth: true }),
    )
    expect(() =>
      db.run('UPDATE self_profiles SET raw_calendar = NULL WHERE account_id = ?', [b]),
    ).toThrow()
  })

  it('字段组约束：lunar 行闰月为 NULL 也被拒绝（缺少闰月状态）', () => {
    const accountId = insertAccount('user-a')
    svc.save(
      accountId,
      saveRequest(null, { calendar: 'lunar', year: 2000, month: 1, day: 1, isLeapMonth: false }),
    )
    expect(() =>
      db.run('UPDATE self_profiles SET raw_is_leap_month = NULL WHERE account_id = ?', [accountId]),
    ).toThrow()
  })

  it('字段组约束：全空（删除出生日期后）允许且保留档案', () => {
    const accountId = insertAccount('user-a')
    const created = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    const after = svc.deleteBirthDate(accountId, {
      profileId: created.id,
      version: created.version,
    })
    expect(after.birthDate).toBeNull()
    expect(after.useAllowed).toBe(false)
    // 全空状态可被读取，不违反 CHECK
    expect(svc.get(accountId)?.birthDate).toBeNull()
  })

  it('失败凭证写入导致日期写入回滚', () => {
    const accountId = insertAccount('user-a')
    const failing = makeDeps()
    const originalRun = failing.run
    let failReceipt = false
    failing.run = (sql: string, params?: (string | number | null | undefined)[]) => {
      if (sql.includes('INSERT INTO consent_receipts') && failReceipt) {
        throw new Error('receipt insert failed')
      }
      return originalRun(sql, params)
    }
    const failingSvc = createSelfProfileService(failing)
    failReceipt = true
    expect(() =>
      failingSvc.save(
        accountId,
        saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
      ),
    ).toThrow()
    expect(db.exec(`SELECT * FROM self_profiles WHERE account_id = ${accountId}`).length).toBe(0)
  })

  it('删除失败回滚', () => {
    const accountId = insertAccount('user-a')
    const created = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    const failing = makeDeps()
    const originalRun = failing.run
    failing.run = (sql: string, params?: (string | number | null | undefined)[]) => {
      if (sql.includes('DELETE FROM self_profiles')) {
        throw new Error('delete failed')
      }
      return originalRun(sql, params)
    }
    const failingSvc = createSelfProfileService(failing)
    expect(() =>
      failingSvc.deleteProfile(accountId, { profileId: created.id, version: created.version }),
    ).toThrow()
    expect(svc.get(accountId)).not.toBeNull()
  })

  it('撤回使用后 summary 不可带入但日期保留；再授权需新版本确认', () => {
    const accountId = insertAccount('user-a')
    const created = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    const revoked = svc.setUsage(
      accountId,
      { profileId: created.id, version: created.version },
      false,
    )
    expect(revoked.useAllowed).toBe(false)
    expect(revoked.birthDate).not.toBeNull()
    const s = svc.summary(accountId)
    expect(s.canImport).toBe(false)
    expect(s.hasBirthDate).toBe(true)
    expectError(
      () =>
        svc.setUsage(
          accountId,
          { profileId: revoked.id, version: revoked.version },
          true,
          'old-version',
        ),
      'CONSENT_REQUIRED',
    )
    const allowed = svc.setUsage(
      accountId,
      { profileId: revoked.id, version: revoked.version },
      true,
      SELF_PROFILE_POLICY_VERSION,
    )
    expect(allowed.useAllowed).toBe(true)
  })

  it('删除出生日期保留档案与账号会话；删整档保留账号/会话及最小凭证', () => {
    const accountId = insertAccount('user-a')
    const created = svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    const afterDeleteDate = svc.deleteBirthDate(accountId, {
      profileId: created.id,
      version: created.version,
    })
    expect(afterDeleteDate.birthDate).toBeNull()
    expect(afterDeleteDate.useAllowed).toBe(false)
    expect(svc.get(accountId)).not.toBeNull()
    expect(db.exec(`SELECT * FROM accounts WHERE id = ${accountId}`).length).toBe(1)
    svc.deleteProfile(accountId, {
      profileId: afterDeleteDate.id,
      version: afterDeleteDate.version,
    })
    expect(svc.get(accountId)).toBeNull()
    expect(db.exec(`SELECT * FROM accounts WHERE id = ${accountId}`).length).toBe(1)
    expect(db.exec('SELECT * FROM consent_receipts').length).toBeGreaterThan(0)
  })

  it('DELETE accounts 真实 SQL 级联删除档案、凭证、会话，旧表不存在', () => {
    const accountId = insertAccount('user-a')
    svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    db.run('INSERT INTO sessions (account_id, token_hash) VALUES (?, ?)', [accountId, 'hash'])
    db.run('DELETE FROM accounts WHERE id = ?', [accountId])
    expect(db.exec(`SELECT * FROM self_profiles WHERE account_id = ${accountId}`).length).toBe(0)
    expect(db.exec(`SELECT * FROM consent_receipts WHERE account_id = ${accountId}`).length).toBe(0)
    expect(db.exec(`SELECT * FROM sessions WHERE account_id = ${accountId}`).length).toBe(0)
    expect(() => db.exec('SELECT * FROM profiles')).toThrow()
    expect(() => db.exec('SELECT * FROM divination_results')).toThrow()
  })

  it('receipt 与固定错误不包含出生值', () => {
    const accountId = insertAccount('user-a')
    svc.save(
      accountId,
      saveRequest(null, { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }),
    )
    const receipts = db.exec('SELECT * FROM consent_receipts')
    const columns = receipts[0].columns
    expect(columns).not.toContain('raw_year')
    expect(columns).not.toContain('solar_date')
    expect(columns).not.toContain('nickname')
    try {
      svc.save(accountId, {
        expected: null,
        birthDate: { calendar: 'solar', year: 2012, month: 9, day: 10, isLeapMonth: null },
        consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION },
      })
    } catch (e) {
      expect(String((e as Error).message)).not.toContain('2012')
    }
  })
})
