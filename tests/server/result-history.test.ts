import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import initSqlJs, { type Database } from 'sql.js'
import {
  CREATE_ACCOUNTS_TABLE,
  CREATE_SESSIONS_TABLE,
  CREATE_SECURITY_LOG_TABLE,
} from '~/server/database/schema'
import { CREATE_RESULT_SNAPSHOTS_TABLE } from '~/server/database/result-history-schema'
import { createResultHistoryService } from '~/server/services/result-history'
import type { SaveSnapshotInput } from '~/server/services/result-history'
import { BAZI_RULE_VERSION, BAZI_SOURCE_SET_VERSION } from '~/constants/bazi-rules'
import type { BaziDomainResult, BaziPillar } from '~/types/bazi'

/**
 * 结果历史领域服务测试。
 *
 * 使用新的 sql.js 内存库与真实 DDL，通过 createResultHistoryService 依赖入口绑定
 * 参数化 get/all/run/transaction；不调用项目 initDb、不落盘、不共享数据库文件。
 *
 * 覆盖：幂等（同一 resultId 只一条且不覆盖）、不同 resultId 并存、账号隔离、
 * 列表排序与上限、安全摘要不含出生输入与结果正文、删除行数、计数、级联删除、
 * 枚举约束、以及旧结构解析失败时仍可读可删。
 */

let SQL: Awaited<ReturnType<typeof initSqlJs>>
let db: Database

const FIXED_NOW = new Date('2026-09-14T12:00:00Z')

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
  const all = (
    sql: string,
    params: (string | number | null | undefined)[] = [],
  ): Record<string, unknown>[] => {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows: Record<string, unknown>[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
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
  return { get, all, run, transaction, now: () => FIXED_NOW }
}

function insertAccount(nickname: string): number {
  db.run(
    'INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, ?, ?, ?, ?)',
    [nickname, 'hash', 'active', '2026-09-01T00:00:00Z', '2026-09-08', '2026-09-08'],
  )
  const row = db.exec('SELECT last_insert_rowid() AS id')
  return Number(row[0].values[0][0])
}

function pillar(stem: string, branch: string): BaziPillar {
  return { stem, branch, stemElement: '木', branchElement: '水' }
}

function makeResult(dayStem = '辛'): BaziDomainResult {
  return {
    dayPillar: pillar(dayStem, '卯'),
    uniquePillars: { year: pillar('丙', '午'), month: pillar('丁', '酉') },
    scenarios: null,
    dateComparison: {
      originalExpression: '公历 2026-09-14',
      normalizedSolar: '2026-09-14',
      lunar: { year: 2026, month: 8, day: 4, isLeapMonth: false },
      conversionVersion: 'lunar-javascript 1.7.7',
    },
    dayMaster: dayStem,
    uncertainty: null,
    missingFields: ['hour_pillar'],
    completeness: { provided: 3, total: 4 },
    limitations: ['限制说明'],
    notOutput: ['时柱'],
    contentLabels: ['计算结果'],
    ruleVersion: BAZI_RULE_VERSION,
    sourceSetVersion: BAZI_SOURCE_SET_VERSION,
    engineName: 'lunar-javascript',
    engineVersion: '1.7.7',
  }
}

function makeInput(
  accountId: number,
  resultId: string,
  overrides: Partial<SaveSnapshotInput> = {},
) {
  return {
    accountId,
    toolId: 'bazi',
    resultId,
    schemaVersion: 1,
    ruleVersion: BAZI_RULE_VERSION,
    engineName: 'lunar-javascript',
    engineVersion: '1.7.7',
    sourceSetVersion: BAZI_SOURCE_SET_VERSION,
    originalInput: { calendar: 'solar', year: 2026, month: 9, day: 14, isLeapMonth: null },
    normalizedInput: {
      raw: { calendar: 'solar', year: 2026, month: 9, day: 14, isLeapMonth: null },
      solarDate: '2026-09-14',
      lunar: { year: 2026, month: 8, day: 4, isLeapMonth: false },
      conversionVersion: 'lunar-javascript 1.7.7',
    },
    phase: 'success',
    successQualifier: 'partial',
    failureCategory: null,
    failureDetailCode: null,
    resultSnapshot: makeResult(),
    limitations: ['限制说明'],
    inputOrigin: 'manual',
    ruleStatus: 'current',
    asOfDate: '2026-09-14',
    generatedAt: '2026-09-14T10:00:00Z',
    ...overrides,
  } satisfies SaveSnapshotInput
}

beforeEach(async () => {
  SQL = await initSqlJs()
  db = new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')
  db.run(CREATE_ACCOUNTS_TABLE)
  db.run(CREATE_SESSIONS_TABLE)
  db.run(CREATE_SECURITY_LOG_TABLE)
  db.run(CREATE_RESULT_SNAPSHOTS_TABLE)
})

afterEach(() => {
  db.close()
})

describe('resultHistoryService.saveSnapshot', () => {
  it('同一 resultId 重复保存只产生一条记录，且不覆盖既有快照', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')

    const first = service.saveSnapshot(makeInput(accountId, 'result-1'))
    expect(first.created).toBe(true)
    expect(first.record.recordId).toBeTruthy()
    expect(first.record.savedAt).toBe(FIXED_NOW.toISOString())

    // 第二次用不同内容但相同 resultId：必须返回既有记录，内容不变。
    const second = service.saveSnapshot(
      makeInput(accountId, 'result-1', {
        resultSnapshot: makeResult('甲'),
        inputOrigin: 'profile',
      }),
    )
    expect(second.created).toBe(false)
    expect(second.record.recordId).toBe(first.record.recordId)
    expect(second.record.resultSnapshot.dayMaster).toBe('辛')
    expect(second.record.inputOrigin).toBe('manual')
    expect(service.countByTool(accountId, 'bazi')).toBe(1)
  })

  it('不同 resultId 产生多条记录', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')
    service.saveSnapshot(makeInput(accountId, 'result-1'))
    service.saveSnapshot(makeInput(accountId, 'result-2'))
    expect(service.countByTool(accountId, 'bazi')).toBe(2)
  })

  it('快照往返保真（原始输入、规范化输入与结果 JSON）', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')
    const saved = service.saveSnapshot(makeInput(accountId, 'result-1'))
    const loaded = service.getById(accountId, saved.record.recordId)
    expect(loaded).not.toBeNull()
    expect(loaded?.originalInput).toEqual({
      calendar: 'solar',
      year: 2026,
      month: 9,
      day: 14,
      isLeapMonth: null,
    })
    expect(loaded?.normalizedInput.solarDate).toBe('2026-09-14')
    expect(loaded?.resultSnapshot.dayPillar.stem).toBe('辛')
    expect(loaded?.limitations).toEqual(['限制说明'])
  })
})

describe('resultHistoryService 账号隔离', () => {
  it('他人不可读取、不可删除、不计入计数', () => {
    const service = createResultHistoryService(makeDeps())
    const owner = insertAccount('owner')
    const other = insertAccount('other')
    const saved = service.saveSnapshot(makeInput(owner, 'result-1'))

    expect(service.getById(other, saved.record.recordId)).toBeNull()
    expect(service.deleteOne(other, saved.record.recordId)).toBe(0)
    expect(service.countByTool(other, 'bazi')).toBe(0)
    expect(service.listByTool(other, 'bazi', 20)).toEqual([])

    // 原记录仍在
    expect(service.getById(owner, saved.record.recordId)).not.toBeNull()
  })

  it('按工具隔离：其他工具的记录不进入列表与计数', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')
    service.saveSnapshot(makeInput(accountId, 'result-1'))
    service.saveSnapshot(makeInput(accountId, 'other-1', { toolId: 'zeji' }))
    expect(service.countByTool(accountId, 'bazi')).toBe(1)
    expect(service.listByTool(accountId, 'bazi', 20)).toHaveLength(1)
  })
})

describe('resultHistoryService 列表与摘要', () => {
  it('按保存时间倒序并遵守上限', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')
    // 直接指定不同 created_at，避免依赖同一毫秒内的插入顺序。
    for (const [resultId, savedAt] of [
      ['r1', '2026-09-01T00:00:00Z'],
      ['r2', '2026-09-03T00:00:00Z'],
      ['r3', '2026-09-02T00:00:00Z'],
    ] as const) {
      db.run(
        `INSERT INTO result_snapshots (id, account_id, tool_id, result_id, schema_version, rule_version,
           engine_name, engine_version, source_set_version, original_input_json, normalized_input_json,
           phase, success_qualifier, result_snapshot_json, limitations_json, input_origin, rule_status,
           as_of_date, generated_at, created_at)
         VALUES (?, ?, 'bazi', ?, 1, ?, 'lunar-javascript', '1.7.7', ?, '{}', '{}', 'success', 'partial', '{}', '[]', 'manual', 'current', '2026-09-14', '2026-09-14T00:00:00Z', ?)`,
        [resultId, accountId, resultId, BAZI_RULE_VERSION, BAZI_SOURCE_SET_VERSION, savedAt],
      )
    }

    const list = service.listByTool(accountId, 'bazi', 20)
    expect(list.map(item => item.resultId)).toEqual(['r2', 'r3', 'r1'])
    expect(service.listByTool(accountId, 'bazi', 2).map(item => item.resultId)).toEqual([
      'r2',
      'r3',
    ])
  })

  it('安全摘要不含出生输入与结果正文，且带中性名称前缀', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')
    service.saveSnapshot(makeInput(accountId, 'result-1'))
    const [summary] = service.listByTool(accountId, 'bazi', 20)
    expect(summary.displayNamePrefix).toBe('八字基础排盘')
    expect(Object.keys(summary).sort()).toEqual(
      [
        'asOfDate',
        'displayNamePrefix',
        'inputOrigin',
        'phase',
        'recordId',
        'resultId',
        'ruleVersion',
        'savedAt',
        'successQualifier',
      ].sort(),
    )
  })
})

describe('resultHistoryService 删除与约束', () => {
  it('删除单条与按工具清空返回受影响行数', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')
    const a = service.saveSnapshot(makeInput(accountId, 'result-1'))
    service.saveSnapshot(makeInput(accountId, 'result-2'))

    expect(service.deleteOne(accountId, a.record.recordId)).toBe(1)
    expect(service.countByTool(accountId, 'bazi')).toBe(1)
    expect(service.deleteByTool(accountId, 'bazi')).toBe(1)
    expect(service.countByTool(accountId, 'bazi')).toBe(0)
  })

  it('账号删除级联清除快照', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')
    service.saveSnapshot(makeInput(accountId, 'result-1'))
    db.run('DELETE FROM accounts WHERE id = ?', [accountId])
    const row = db.exec('SELECT COUNT(*) FROM result_snapshots')
    expect(Number(row[0].values[0][0])).toBe(0)
  })

  it('枚举约束拒绝非法 phase 与非法 input_origin', () => {
    const accountId = insertAccount('u1')
    const insert = (phase: string, origin: string) =>
      db.run(
        `INSERT INTO result_snapshots (id, account_id, tool_id, result_id, schema_version, rule_version,
           engine_name, engine_version, source_set_version, original_input_json, normalized_input_json,
           phase, success_qualifier, result_snapshot_json, limitations_json, input_origin, rule_status,
           as_of_date, generated_at, created_at)
         VALUES ('x', ?, 'bazi', 'r', 1, 'v', 'e', '1', 's', '{}', '{}', ?, NULL, '{}', '[]', ?, 'current', '2026-09-14', 'x', 'x')`,
        [accountId, phase, origin],
      )
    expect(() => insert('bogus', 'manual')).toThrow()
    expect(() => insert('success', 'bogus')).toThrow()
  })

  it('旧结构解析失败时仍可读取与删除，不抛错', () => {
    const service = createResultHistoryService(makeDeps())
    const accountId = insertAccount('u1')
    db.run(
      `INSERT INTO result_snapshots (id, account_id, tool_id, result_id, schema_version, rule_version,
         engine_name, engine_version, source_set_version, original_input_json, normalized_input_json,
         phase, success_qualifier, result_snapshot_json, limitations_json, input_origin, rule_status,
         as_of_date, generated_at, created_at)
       VALUES ('legacy-1', ?, 'bazi', 'legacy', 1, ?, 'e', '1', 's', 'not-json', 'not-json',
               'success', 'partial', 'not-json', 'not-json', 'manual', 'current', '2026-09-14', 'x', 'x')`,
      [accountId, BAZI_RULE_VERSION],
    )
    const record = service.getById(accountId, 'legacy-1')
    expect(record?.originalInput).toBe('not-json')
    expect(service.deleteOne(accountId, 'legacy-1')).toBe(1)
  })
})
