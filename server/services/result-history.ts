/**
 * 结果历史领域服务（R5）。
 *
 * 集中管理不可变结果快照的写入与读取；所有读写按可信 accountId 限定，不提供跨账号查询。
 * 公开 createResultHistoryService({get,all,run,transaction,now}) 依赖入口供独立内存 SQL 测试，
 * 并导出绑定现有 dbGet/dbAll/dbRun/withTransaction 的生产实例。
 *
 * 关键语义：
 * - **幂等**：同一 (accountId, toolId, resultId) 重复保存在数据库层被 UNIQUE 约束与
 *   `ON CONFLICT DO NOTHING` 拦下，只产生一条记录，并且**不覆盖**已存在的快照；
 * - **不可变**：本服务不提供任何更新快照内容的方法，只有删除；
 * - **不区分"不存在"与"非本人"**：读取与删除都按 accountId 限定，未命中统一返回
 *   null / 0，避免用错误码枚举他人记录 id。
 *
 * @author LiXinwen
 */

import { randomUUID } from 'node:crypto'
import { BAZI_HISTORY_NAME_PREFIX, BAZI_TOOL_ID } from '~/constants/bazi-rules'
import type {
  BaziDomainResult,
  BaziInputOrigin,
  BaziNormalizedInput,
  BaziRawDate,
  BaziRuleStatus,
  ResultSnapshotRecord,
  ResultSnapshotSummary,
} from '~/types/bazi'
import type { ToolResultFailureCategory } from '~/types/tool-result'
import { dbAll, dbGet, dbRun, withTransaction } from '../database/db'
import { safeJsonParse } from '../utils/json'

/** 服务依赖入口：可注入真实 sql.js 或测试内存库。 */
export interface ResultHistoryDb {
  get(
    sql: string,
    params?: (string | number | null | undefined)[],
  ): Record<string, unknown> | undefined
  all(sql: string, params?: (string | number | null | undefined)[]): Record<string, unknown>[]
  run(
    sql: string,
    params?: (string | number | null | undefined)[],
  ): { lastInsertRowid: number; changes: number }
  transaction<T>(fn: () => T): T
}

/** 服务依赖：数据库入口 + 服务端时钟（快照时间由服务端生成，不接受客户端覆盖）。 */
export interface ResultHistoryServiceDeps extends ResultHistoryDb {
  now: () => Date
}

/** 服务错误码（接口层据此映射 HTTP 状态，不使用自然语言错误串做判定）。 */
export const RESULT_HISTORY_ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  SAVE_FAILED: 'SAVE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
} as const

export type ResultHistoryErrorCode =
  (typeof RESULT_HISTORY_ERROR_CODES)[keyof typeof RESULT_HISTORY_ERROR_CODES]

/** 结果历史服务错误；信息不含出生日期或快照正文。 */
export class ResultHistoryServiceError extends Error {
  code: ResultHistoryErrorCode
  constructor(code: ResultHistoryErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'ResultHistoryServiceError'
    this.code = code
  }
}

/** 工具 → 历史中性名称前缀（数据规范 §11.5；不使用姓名或结论式标题）。 */
const TOOL_HISTORY_NAME_PREFIX: Record<string, string> = {
  [BAZI_TOOL_ID]: BAZI_HISTORY_NAME_PREFIX,
}

/** 保存入参：字段值均由服务端从可信来源填充，不接受客户端提交的完整结果 JSON 作为历史。 */
export interface SaveSnapshotInput {
  accountId: number
  toolId: string
  resultId: string
  schemaVersion: number
  ruleVersion: string
  engineName: string
  engineVersion: string
  sourceSetVersion: string
  originalInput: BaziRawDate
  normalizedInput: BaziNormalizedInput
  phase: 'success' | 'failure'
  successQualifier: string | null
  failureCategory: ToolResultFailureCategory | null
  failureDetailCode: string | null
  resultSnapshot: BaziDomainResult
  limitations: string[]
  inputOrigin: BaziInputOrigin
  ruleStatus: BaziRuleStatus
  asOfDate: string
  generatedAt: string
}

interface SnapshotRow extends Record<string, unknown> {
  id: string
  account_id: number
  tool_id: string
  result_id: string
  schema_version: number
  rule_version: string
  engine_name: string
  engine_version: string
  source_set_version: string
  original_input_json: string
  normalized_input_json: string
  phase: string
  success_qualifier: string | null
  failure_category: string | null
  failure_detail_code: string | null
  result_snapshot_json: string
  limitations_json: string
  input_origin: string
  rule_status: string
  as_of_date: string
  generated_at: string
  created_at: string
}

function rowToRecord(row: SnapshotRow): ResultSnapshotRecord {
  return {
    recordId: row.id,
    toolId: row.tool_id,
    resultId: row.result_id,
    schemaVersion: row.schema_version,
    ruleVersion: row.rule_version,
    engineName: row.engine_name,
    engineVersion: row.engine_version,
    sourceSetVersion: row.source_set_version,
    // 解析失败时 safeJsonParse 返回原字符串：仍可读、可删除，不因旧结构抛错（治理规范 §12）。
    originalInput: safeJsonParse(row.original_input_json) as BaziRawDate,
    normalizedInput: safeJsonParse(row.normalized_input_json) as BaziNormalizedInput,
    phase: row.phase,
    successQualifier: row.success_qualifier,
    failureCategory: row.failure_category,
    failureDetailCode: row.failure_detail_code,
    resultSnapshot: safeJsonParse(row.result_snapshot_json) as BaziDomainResult,
    limitations: safeJsonParse(row.limitations_json) as string[],
    inputOrigin: row.input_origin as BaziInputOrigin,
    ruleStatus: row.rule_status as BaziRuleStatus,
    asOfDate: row.as_of_date,
    generatedAt: row.generated_at,
    savedAt: row.created_at,
  }
}

/** 行 → 列表摘要；不含精确出生日期与结果正文（安全摘要）。 */
function rowToSummary(row: SnapshotRow): ResultSnapshotSummary {
  const prefix = TOOL_HISTORY_NAME_PREFIX[row.tool_id] ?? row.tool_id
  return {
    recordId: row.id,
    resultId: row.result_id,
    displayNamePrefix: prefix,
    savedAt: row.created_at,
    asOfDate: row.as_of_date,
    phase: row.phase,
    successQualifier: row.success_qualifier,
    ruleVersion: row.rule_version,
    inputOrigin: row.input_origin as BaziInputOrigin,
  }
}

const SNAPSHOT_COLUMNS = `id, account_id, tool_id, result_id, schema_version, rule_version,
  engine_name, engine_version, source_set_version, original_input_json, normalized_input_json,
  phase, success_qualifier, failure_category, failure_detail_code, result_snapshot_json,
  limitations_json, input_origin, rule_status, as_of_date, generated_at, created_at`

export function createResultHistoryService(deps: ResultHistoryServiceDeps) {
  function loadRowById(accountId: number, recordId: string): SnapshotRow | undefined {
    return deps.get(
      `SELECT ${SNAPSHOT_COLUMNS} FROM result_snapshots WHERE account_id = ? AND id = ?`,
      [accountId, recordId],
    ) as SnapshotRow | undefined
  }

  function loadRowByResultId(
    accountId: number,
    toolId: string,
    resultId: string,
  ): SnapshotRow | undefined {
    return deps.get(
      `SELECT ${SNAPSHOT_COLUMNS} FROM result_snapshots
       WHERE account_id = ? AND tool_id = ? AND result_id = ?`,
      [accountId, toolId, resultId],
    ) as SnapshotRow | undefined
  }

  /**
   * 保存不可变快照。幂等：同一 (accountId, toolId, resultId) 已存在时返回既有记录且 created=false，
   * **不覆盖**原快照内容。
   */
  function saveSnapshot(input: SaveSnapshotInput): {
    record: ResultSnapshotRecord
    created: boolean
  } {
    const nowIso = deps.now().toISOString()
    return deps.transaction(() => {
      const recordId = randomUUID()
      const result = deps.run(
        `INSERT INTO result_snapshots (
           id, account_id, tool_id, result_id, schema_version, rule_version, engine_name,
           engine_version, source_set_version, original_input_json, normalized_input_json,
           phase, success_qualifier, failure_category, failure_detail_code, result_snapshot_json,
           limitations_json, input_origin, rule_status, as_of_date, generated_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id, tool_id, result_id) DO NOTHING`,
        [
          recordId,
          input.accountId,
          input.toolId,
          input.resultId,
          input.schemaVersion,
          input.ruleVersion,
          input.engineName,
          input.engineVersion,
          input.sourceSetVersion,
          JSON.stringify(input.originalInput),
          JSON.stringify(input.normalizedInput),
          input.phase,
          input.successQualifier,
          input.failureCategory,
          input.failureDetailCode,
          JSON.stringify(input.resultSnapshot),
          JSON.stringify(input.limitations),
          input.inputOrigin,
          input.ruleStatus,
          input.asOfDate,
          input.generatedAt,
          nowIso,
        ],
      )

      const created = result.changes === 1
      const row = created
        ? loadRowById(input.accountId, recordId)
        : loadRowByResultId(input.accountId, input.toolId, input.resultId)
      if (!row) throw new ResultHistoryServiceError('SAVE_FAILED', '保存失败，请稍后再试')
      return { record: rowToRecord(row), created }
    })
  }

  /** 列表摘要：按保存时间倒序；limit 由调用方限制上限。 */
  function listByTool(accountId: number, toolId: string, limit: number): ResultSnapshotSummary[] {
    const rows = deps.all(
      `SELECT ${SNAPSHOT_COLUMNS} FROM result_snapshots
       WHERE account_id = ? AND tool_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [accountId, toolId, limit],
    ) as SnapshotRow[]
    return rows.map(rowToSummary)
  }

  /** 详情：按 accountId 限定；未命中（不存在或非本人）返回 null。 */
  function getById(accountId: number, recordId: string): ResultSnapshotRecord | null {
    const row = loadRowById(accountId, recordId)
    return row ? rowToRecord(row) : null
  }

  /** 删除单条：返回受影响行数（0 表示不存在或非本人）。 */
  function deleteOne(accountId: number, recordId: string): number {
    return deps.transaction(() => {
      const result = deps.run('DELETE FROM result_snapshots WHERE account_id = ? AND id = ?', [
        accountId,
        recordId,
      ])
      return result.changes
    })
  }

  /** 按工具清空：在事务内删除该账号该工具的全部快照，返回删除条数。 */
  function deleteByTool(accountId: number, toolId: string): number {
    return deps.transaction(() => {
      const result = deps.run('DELETE FROM result_snapshots WHERE account_id = ? AND tool_id = ?', [
        accountId,
        toolId,
      ])
      return result.changes
    })
  }

  /**
   * 该账号某工具的快照条数。
   *
   * R5 说明：八字快照按定义都含出生输入（输入就是出生日期），因此"仍含出生输入的
   * 历史条数"等于本方法的返回值；`input_origin` 只区分来源（手填/档案带入），不参与计数。
   */
  function countByTool(accountId: number, toolId: string): number {
    const row = deps.get(
      'SELECT COUNT(*) AS total FROM result_snapshots WHERE account_id = ? AND tool_id = ?',
      [accountId, toolId],
    )
    return Number(row?.total ?? 0)
  }

  return {
    saveSnapshot,
    listByTool,
    getById,
    deleteOne,
    deleteByTool,
    countByTool,
  }
}

export type ResultHistoryService = ReturnType<typeof createResultHistoryService>

/** 绑定现有数据库入口的默认实例（生产路径）。 */
export const resultHistoryService = createResultHistoryService({
  get: dbGet,
  all: dbAll,
  run: dbRun,
  transaction: withTransaction,
  now: () => new Date(),
})
