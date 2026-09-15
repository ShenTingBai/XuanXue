import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import initSqlJs, { type Database } from 'sql.js'
import {
  CREATE_ACCOUNTS_TABLE,
  CREATE_SESSIONS_TABLE,
  CREATE_SECURITY_LOG_TABLE,
} from '~/server/database/schema'
import {
  CREATE_CONSENT_RECEIPTS_TABLE,
  CREATE_SELF_PROFILES_TABLE,
} from '~/server/database/self-profile-schema'
import { CREATE_RESULT_SNAPSHOTS_TABLE } from '~/server/database/result-history-schema'
import { HistoryModeRequiredError, createSelfProfileService } from '~/server/services/self-profile'
import { SELF_PROFILE_POLICY_VERSION } from '~/constants/self-profile-policy'

/**
 * 档案删除与结果历史的联动测试（D5）。
 *
 * 交付规范 §7.5 + 数据规范 §13：删除本人档案前必须已展示"仍含出生输入的历史条数"，
 * 并由用户明确选择保留还是同时删除；没有选择时不得执行，也不得设置默认值。
 *
 * 用真实 sql.js 内存库与真实 DDL（含 result_snapshots），通过依赖注入绑定
 * 参数化 get/run/transaction，并按生产实例的方式注入历史计数与删除原语。
 */

let SQL: Awaited<ReturnType<typeof initSqlJs>>
let db: Database

const FIXED_NOW = new Date('2026-09-14T12:00:00Z')

function makeDeps(options: { failProfileDelete?: boolean } = {}) {
  const run = (
    sql: string,
    params: (string | number | null | undefined)[] = [],
  ): { lastInsertRowid: number; changes: number } => {
    if (options.failProfileDelete && sql.trim().startsWith('DELETE FROM self_profiles')) {
      throw new Error('simulated failure')
    }
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
  return {
    get,
    run,
    transaction,
    now: () => FIXED_NOW,
    countHistoryWithBirthInput: (accountId: number) =>
      Number(
        get('SELECT COUNT(*) AS total FROM result_snapshots WHERE account_id = ? AND tool_id = ?', [
          accountId,
          'bazi',
        ])?.total ?? 0,
      ),
    // 与生产实例一致：在调用方事务内执行，不自开事务。
    deleteHistoryRows: (accountId: number) =>
      run('DELETE FROM result_snapshots WHERE account_id = ? AND tool_id = ?', [accountId, 'bazi'])
        .changes,
  }
}

function insertAccount(nickname: string): number {
  db.run(
    'INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, ?, ?, ?, ?)',
    [nickname, 'hash', 'active', '2026-09-01T00:00:00Z', '2026-09-08', '2026-09-08'],
  )
  const row = db.exec('SELECT last_insert_rowid() AS id')
  return Number(row[0].values[0][0])
}

function insertSnapshot(accountId: number, resultId: string): void {
  db.run(
    `INSERT INTO result_snapshots (id, account_id, tool_id, result_id, schema_version, rule_version,
       engine_name, engine_version, source_set_version, original_input_json, normalized_input_json,
       phase, success_qualifier, result_snapshot_json, limitations_json, input_origin, rule_status,
       as_of_date, generated_at, created_at)
     VALUES (?, ?, 'bazi', ?, 1, 'v', 'lunar-javascript', '1.7.7', 'v', '{}', '{}',
             'success', 'partial', '{}', '[]', 'manual', 'current', '2026-09-14', 'x', 'x')`,
    [`snap-${resultId}`, accountId, resultId],
  )
}

function snapshotCount(accountId: number): number {
  const row = db.exec(`SELECT COUNT(*) FROM result_snapshots WHERE account_id = ${accountId}`)
  return Number(row[0].values[0][0])
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
  db.run(CREATE_RESULT_SNAPSHOTS_TABLE)
})

afterEach(() => {
  db.close()
})

/** 建好一份档案并返回 service、accountId 与 expected。 */
function setupProfile(snapshotCountToCreate = 0) {
  const service = createSelfProfileService(makeDeps())
  const accountId = insertAccount(`u${snapshotCountToCreate}`)
  const profile = service.save(accountId, {
    expected: null,
    birthDate: { calendar: 'solar', year: 2000, month: 8, day: 7, isLeapMonth: null },
    consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION },
  })
  for (let i = 0; i < snapshotCountToCreate; i += 1) insertSnapshot(accountId, `r${i}`)
  return { service, accountId, expected: { profileId: profile.id, version: profile.version } }
}

describe('删除档案与历史联动', () => {
  it('有待处理历史但未给 historyMode 时拒绝执行，且不删任何数据', () => {
    const { service, accountId, expected } = setupProfile(2)
    expect(service.countHistoryWithBirthInput(accountId)).toBe(2)

    let caught: unknown
    try {
      service.deleteProfile(accountId, expected)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(HistoryModeRequiredError)
    expect((caught as HistoryModeRequiredError).historyCount).toBe(2)
    // 拒绝时档案与历史都必须原样保留。
    expect(service.get(accountId)).not.toBeNull()
    expect(snapshotCount(accountId)).toBe(2)
  })

  it("historyMode='delete' 在同一事务内同时删除档案与快照", () => {
    const { service, accountId, expected } = setupProfile(2)
    expect(service.deleteProfile(accountId, expected, 'delete')).toEqual({ success: true })
    expect(service.get(accountId)).toBeNull()
    expect(snapshotCount(accountId)).toBe(0)
    // 最小删除凭证保留（不含出生值）。
    const receipts = db.exec('SELECT action FROM consent_receipts ORDER BY created_at')
    expect(receipts[0].values.map((row: unknown[]) => row[0])).toContain('delete_profile')
  })

  it("historyMode='keep' 只删档案、保留快照", () => {
    const { service, accountId, expected } = setupProfile(2)
    service.deleteProfile(accountId, expected, 'keep')
    expect(service.get(accountId)).toBeNull()
    expect(snapshotCount(accountId)).toBe(2)
  })

  it('没有历史时不需要 historyMode（保持既有行为）', () => {
    const { service, accountId, expected } = setupProfile(0)
    expect(service.countHistoryWithBirthInput(accountId)).toBe(0)
    expect(service.deleteProfile(accountId, expected)).toEqual({ success: true })
    expect(service.get(accountId)).toBeNull()
  })

  it('版本冲突在事务之前拦截，历史不受影响', () => {
    const { service, accountId, expected } = setupProfile(1)
    expect(() =>
      service.deleteProfile(accountId, { ...expected, version: expected.version + 1 }, 'delete'),
    ).toThrow()
    expect(snapshotCount(accountId)).toBe(1)
  })

  it('事务内失败时历史删除一并回滚', () => {
    const { accountId, expected } = setupProfile(1)
    const failing = createSelfProfileService(makeDeps({ failProfileDelete: true }))
    expect(() => failing.deleteProfile(accountId, expected, 'delete')).toThrow()
    // 档案删除失败 → 快照删除必须回滚。
    expect(snapshotCount(accountId)).toBe(1)
  })

  it('未注入删除原语时禁止按"同时删除"执行，不假装成功', () => {
    const accountId = insertAccount('no-primitive')
    const deps = makeDeps()
    const service = createSelfProfileService({
      get: deps.get,
      run: deps.run,
      transaction: deps.transaction,
      now: deps.now,
      countHistoryWithBirthInput: deps.countHistoryWithBirthInput,
      // 故意不注入 deleteHistoryRows
    })
    const profile = service.save(accountId, {
      expected: null,
      birthDate: { calendar: 'solar', year: 2000, month: 8, day: 7, isLeapMonth: null },
      consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION },
    })
    insertSnapshot(accountId, 'r0')

    expect(() =>
      service.deleteProfile(
        accountId,
        { profileId: profile.id, version: profile.version },
        'delete',
      ),
    ).toThrow()
    expect(snapshotCount(accountId)).toBe(1)
    expect(service.get(accountId)).not.toBeNull()
  })
})
