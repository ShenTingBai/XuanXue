/**
 * 本人档案领域服务（R4）。
 *
 * 集中管理档案读取与所有写入；所有读取/写入按可信 accountId 限定，不提供他人 id 查询。
 * 公开 createSelfProfileService({get,run,transaction,now}) 依赖入口供独立内存 SQL 测试，
 * 并导出绑定现有 dbGet/dbRun/withTransaction 的实例。业务 DTO 禁止携带 SQL 或依赖对象。
 *
 * 并发与原子性：所有保存/删除/授权变更在单一同步事务内完成；服务端并发以数据库唯一
 * 约束与条件更新兜底，删除后重建的旧 expected 永远不能覆盖新档案。时间与 id 由服务端
 * 生成，用户不能覆盖 accountId/id/version/confirmedAt/solarDate。
 *
 * @author LiXinwen
 */

import { randomUUID } from 'node:crypto'
import type {
  SelfProfile,
  SelfProfileSummary,
  SaveSelfProfileRequest,
  RawBirthDate,
  SelfProfileErrorCode,
} from '~/types/self-profile'
import {
  SELF_PROFILE_POLICY_VERSION,
  SELF_PROFILE_PURPOSE,
  SELF_PROFILE_DATA_CATEGORY,
} from '~/constants/self-profile-policy'
import { normalizeBirthDate, isAtLeastFourteen } from '~/utils/self-profile/birth-date'
import { BAZI_TOOL_ID } from '~/constants/bazi-rules'
import { dbGet, dbRun, withTransaction } from '../database/db'
import { resultHistoryService } from './result-history'

/** 领域服务依赖入口：可注入真实 sql.js 或测试内存库。 */
export interface SelfProfileDb {
  get(
    sql: string,
    params?: (string | number | null | undefined)[],
  ): Record<string, unknown> | undefined
  run(
    sql: string,
    params?: (string | number | null | undefined)[],
  ): { lastInsertRowid: number; changes: number }
  transaction<T>(fn: () => T): T
}

/** 领域服务错误：携带固定 code 与可选字段键，错误信息不含日期值或完整对象。 */
export class SelfProfileServiceError extends Error {
  code: SelfProfileErrorCode
  field?: string
  constructor(code: SelfProfileErrorCode, message?: string, field?: string) {
    super(message ?? code)
    this.name = 'SelfProfileServiceError'
    this.code = code
    this.field = field
  }
}

/** 服务端时间提供者：返回当前时间；校验当日按 Asia/Shanghai 取。 */
export interface SelfProfileServiceDeps extends SelfProfileDb {
  now: () => Date
  /**
   * 统计仍含出生输入的结果历史条数（可选）。
   * 未注入时视为 0：不关心历史的调用方与既有测试保持原行为。
   */
  countHistoryWithBirthInput?: (accountId: number) => number
  /**
   * 在**调用方事务内**删除该账号全部结果快照并返回删除行数（可选）。
   * 不自开事务——嵌套 BEGIN 会失败，事务边界由 deleteProfile 统一负责。
   * 未注入时禁止按"同时删除"执行，避免假装删除成功。
   */
  deleteHistoryRows?: (accountId: number) => number
}

/**
 * 删除档案时缺少历史处置选择。
 *
 * 不复用 `SelfProfileErrorCode`：该联合类型定义在 types/self-profile.ts，
 * 且语义上这是"缺少必要决策"而非输入非法。由删除端点单独映射为 409。
 */
export class HistoryModeRequiredError extends Error {
  code = 'HISTORY_MODE_REQUIRED' as const
  historyCount: number
  constructor(historyCount: number) {
    super('请先选择历史记录的处置方式')
    this.name = 'HistoryModeRequiredError'
    this.historyCount = historyCount
  }
}

interface ProfileRow extends Record<string, unknown> {
  id: string
  account_id: number
  version: number
  use_allowed: number
  raw_calendar: string | null
  raw_year: number | null
  raw_month: number | null
  raw_day: number | null
  raw_is_leap_month: number | null
  solar_date: string | null
  conversion_version: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

/** 校验当日：Asia/Shanghai 民用日期，不作为客户端上报的年龄或规范化日期。 */
function getShanghaiToday(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** 行 → 白名单 SelfProfile DTO；不扩散数据库内部字段。 */
function rowToProfile(row: ProfileRow): SelfProfile {
  const hasDate = row.raw_calendar != null
  return {
    id: row.id,
    accountId: row.account_id,
    version: row.version,
    birthDate: hasDate
      ? {
          raw:
            row.raw_calendar === 'lunar'
              ? {
                  calendar: 'lunar',
                  year: row.raw_year as number,
                  month: row.raw_month as number,
                  day: row.raw_day as number,
                  isLeapMonth: (row.raw_is_leap_month as number) === 1,
                }
              : {
                  calendar: 'solar',
                  year: row.raw_year as number,
                  month: row.raw_month as number,
                  day: row.raw_day as number,
                  isLeapMonth: null,
                },
          solarDate: row.solar_date as string,
          conversionVersion: row.conversion_version as string,
          confirmedAt: row.confirmed_at as string,
        }
      : null,
    useAllowed: row.use_allowed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** 行 → 无出生值的最小摘要；无行返回 exists=false。 */
function rowToSummary(row: ProfileRow | undefined): SelfProfileSummary {
  if (!row) {
    return { exists: false, profileId: null, version: null, hasBirthDate: false, canImport: false }
  }
  const hasDate = row.raw_calendar != null
  return {
    exists: true,
    profileId: row.id,
    version: row.version,
    hasBirthDate: hasDate,
    canImport: hasDate && row.use_allowed === 1,
  }
}

/** 撤回该账号全部活跃档案用途凭证，并写入一条当前动作的凭证。 */
function writeConsentReceipt(
  db: SelfProfileDb,
  accountId: number,
  action: string,
  policyVersion: string,
  nowIso: string,
): void {
  db.run(
    'UPDATE consent_receipts SET status = ?, revoked_at = ? WHERE account_id = ? AND purpose = ? AND status = ?',
    ['revoked', nowIso, accountId, SELF_PROFILE_PURPOSE, 'active'],
  )
  db.run(
    'INSERT INTO consent_receipts (id, account_id, purpose, data_category, action, policy_version, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      randomUUID(),
      accountId,
      SELF_PROFILE_PURPOSE,
      SELF_PROFILE_DATA_CATEGORY,
      action,
      policyVersion,
      'active',
      nowIso,
    ],
  )
}

const DATE_COLUMNS =
  'raw_calendar, raw_year, raw_month, raw_day, raw_is_leap_month, solar_date, conversion_version, confirmed_at'

/** 行值赋值左侧：SET (raw_calendar, ...) = (?, ...)，占位符与 dateParams 顺序一致。 */
const DATE_COLUMNS_PAREN = `(${DATE_COLUMNS})`

/** 字段组 → 数据库列值（全 null 表示无日期）。 */
function dateParams(birthDate: SelfProfile['birthDate']): (string | number | null)[] {
  if (!birthDate) {
    return [null, null, null, null, null, null, null, null]
  }
  const r = birthDate.raw
  return [
    r.calendar,
    r.year,
    r.month,
    r.day,
    r.calendar === 'lunar' ? (r.isLeapMonth ? 1 : 0) : null,
    birthDate.solarDate,
    birthDate.conversionVersion,
    birthDate.confirmedAt,
  ]
}

/** 服务端校验保存值是否与原字段组完全一致：一致时返回当前档案，不制造新版本/重复授权。 */
function sameDateValue(
  current: ProfileRow,
  candidate: { raw: RawBirthDate; solarDate: string; conversionVersion: string },
): boolean {
  if (current.raw_calendar === null) return false
  const r = candidate.raw
  if (current.raw_calendar !== r.calendar || current.raw_year !== r.year) return false
  if (current.raw_month !== r.month || current.raw_day !== r.day) return false
  const storedLeap = current.raw_is_leap_month === 1
  const candidateLeap = r.calendar === 'lunar' ? r.isLeapMonth : false
  if (storedLeap !== candidateLeap) return false
  return (
    current.solar_date === candidate.solarDate &&
    current.conversion_version === candidate.conversionVersion
  )
}

export function createSelfProfileService(deps: SelfProfileServiceDeps) {
  const { get, run, transaction, now } = deps

  function loadRow(accountId: number): ProfileRow | undefined {
    return get('SELECT * FROM self_profiles WHERE account_id = ?', [accountId]) as
      | ProfileRow
      | undefined
  }

  /** 读取当前账号本人档案（无档案返回 null）。 */
  function getProfile(accountId: number): SelfProfile | null {
    const row = loadRow(accountId)
    return row ? rowToProfile(row) : null
  }

  /** 无出生值的最小摘要。 */
  function summary(accountId: number): SelfProfileSummary {
    return rowToSummary(loadRow(accountId))
  }

  /**
   * 仍含出生输入的结果历史条数。
   * R5 说明：八字快照按定义都含出生输入，因此该值即该账号的八字快照总数。
   */
  function countHistoryWithBirthInput(accountId: number): number {
    return deps.countHistoryWithBirthInput ? deps.countHistoryWithBirthInput(accountId) : 0
  }

  /** 首次创建或更新（差异确认后）。 */
  function save(accountId: number, request: SaveSelfProfileRequest): SelfProfile {
    const account = get('SELECT status, age_confirmed_at FROM accounts WHERE id = ?', [accountId])
    if (!account || account.status !== 'active' || !account.age_confirmed_at) {
      throw new SelfProfileServiceError('UNAUTHENTICATED', '无效的会话')
    }
    if (!request.consent || request.consent.accepted !== true) {
      throw new SelfProfileServiceError('CONSENT_REQUIRED', '请先确认长期保存告知')
    }
    if (request.consent.policyVersion !== SELF_PROFILE_POLICY_VERSION) {
      throw new SelfProfileServiceError('CONSENT_REQUIRED', '档案告知版本已更新，请重新确认')
    }

    const today = getShanghaiToday(now())
    const normalized = normalizeBirthDate(request.birthDate, today)
    if (!normalized.ok) {
      throw new SelfProfileServiceError(
        normalized.error.code === 'UNSUPPORTED_DATE' ? 'UNSUPPORTED_DATE' : 'INVALID_INPUT',
        normalized.error.code === 'UNSUPPORTED_DATE' ? '出生日期超出支持范围' : '出生日期无效',
        normalized.error.field,
      )
    }
    if (!isAtLeastFourteen(normalized.birthDate.solarDate, today)) {
      throw new SelfProfileServiceError('UNDERAGE', '未满十四周岁不能保存本人档案')
    }
    const birthDate = normalized.birthDate

    const existing = loadRow(accountId)

    if (request.expected === null) {
      // 首次创建：已有行返回 409（不能隐式覆盖）。
      if (existing) {
        throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已存在，请刷新后重试')
      }
      const id = randomUUID()
      const nowIso = now().toISOString()
      const confirmedAt = nowIso
      const params = dateParams({
        raw: birthDate.raw,
        solarDate: birthDate.solarDate,
        conversionVersion: birthDate.conversionVersion,
        confirmedAt,
      })
      return transaction(() => {
        run(
          `INSERT INTO self_profiles (id, account_id, version, use_allowed, ${DATE_COLUMNS}, created_at, updated_at)
           VALUES (?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, accountId, ...params, nowIso, nowIso],
        )
        writeConsentReceipt(deps, accountId, 'create', SELF_PROFILE_POLICY_VERSION, nowIso)
        const row = loadRow(accountId)
        if (!row) throw new SelfProfileServiceError('SAVE_FAILED', '保存失败，请稍后再试')
        return rowToProfile(row)
      })
    }

    // 更新：必须 id+version 匹配；id 不匹配或缺档统一 VERSION_CONFLICT，不能隐式新建。
    const expected = request.expected
    if (!existing || existing.id !== expected.profileId) {
      throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已变更，请重新读取后重试')
    }
    if (existing.version !== expected.version) {
      throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已被其他页面修改，请重新确认')
    }
    // 相同值且授权未改变（save 不改 use_allowed）：返回当前档案，不制造新版本或重复授权。
    if (sameDateValue(existing, birthDate)) {
      return rowToProfile(existing)
    }

    const nowIso = now().toISOString()
    const params = dateParams({
      raw: birthDate.raw,
      solarDate: birthDate.solarDate,
      conversionVersion: birthDate.conversionVersion,
      confirmedAt: nowIso,
    })
    return transaction(() => {
      const result = run(
        `UPDATE self_profiles SET ${DATE_COLUMNS_PAREN} = (?, ?, ?, ?, ?, ?, ?, ?),
           version = version + 1, updated_at = ?
         WHERE account_id = ? AND id = ? AND version = ?`,
        [...params, nowIso, accountId, existing.id, existing.version],
      )
      if (result.changes !== 1) {
        throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已被其他页面修改，请重新确认')
      }
      writeConsentReceipt(deps, accountId, 'update', SELF_PROFILE_POLICY_VERSION, nowIso)
      const row = loadRow(accountId)
      if (!row) throw new SelfProfileServiceError('SAVE_FAILED', '保存失败，请稍后再试')
      return rowToProfile(row)
    })
  }

  /** 删除出生日期字段组：整组归 null，保留档案 id 并递增 version，关闭使用授权。 */
  function deleteBirthDate(
    accountId: number,
    expected: { profileId: string; version: number },
  ): SelfProfile {
    const existing = loadRow(accountId)
    if (!existing || existing.id !== expected.profileId || existing.version !== expected.version) {
      throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已变更，请重新读取后重试')
    }
    const nowIso = now().toISOString()
    return transaction(() => {
      const result = run(
        `UPDATE self_profiles SET raw_calendar = NULL, raw_year = NULL, raw_month = NULL, raw_day = NULL,
           raw_is_leap_month = NULL, solar_date = NULL, conversion_version = NULL, confirmed_at = NULL,
           use_allowed = 0, version = version + 1, updated_at = ?
         WHERE account_id = ? AND id = ? AND version = ?`,
        [nowIso, accountId, existing.id, existing.version],
      )
      if (result.changes !== 1) {
        throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已变更，请重新读取后重试')
      }
      writeConsentReceipt(deps, accountId, 'delete_birth_date', SELF_PROFILE_POLICY_VERSION, nowIso)
      const row = loadRow(accountId)
      if (!row) throw new SelfProfileServiceError('SAVE_FAILED', '删除失败，请稍后再试')
      return rowToProfile(row)
    })
  }

  /**
   * 删除整份档案：撤回凭证、保留最小删除凭证后删档；不删除 Account/Session。
   *
   * 交付规范 §7.5 + 数据规范 §13：删除本人档案前必须已显示"仍含出生输入的历史条数"，
   * 并由用户明确选择保留还是同时删除。有条数而**未给出选择时拒绝执行**，不设默认值；
   * `historyMode === 'delete'` 时在同一事务内先删快照再删档案，任一步失败整体回滚。
   */
  function deleteProfile(
    accountId: number,
    expected: { profileId: string; version: number },
    historyMode?: 'keep' | 'delete',
  ): { success: true } {
    const existing = loadRow(accountId)
    if (!existing || existing.id !== expected.profileId || existing.version !== expected.version) {
      throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已变更，请重新读取后重试')
    }

    const historyCount = countHistoryWithBirthInput(accountId)
    const hasMode = historyMode === 'keep' || historyMode === 'delete'
    if (historyCount > 0 && !hasMode) {
      throw new HistoryModeRequiredError(historyCount)
    }
    if (historyMode === 'delete' && !deps.deleteHistoryRows) {
      // 未注入删除能力：宁可失败，也不返回"已删除"却留下快照。
      throw new SelfProfileServiceError('SAVE_FAILED', '删除失败，请稍后再试')
    }

    const nowIso = now().toISOString()
    return transaction(() => {
      if (historyMode === 'delete' && deps.deleteHistoryRows) {
        deps.deleteHistoryRows(accountId)
      }
      writeConsentReceipt(deps, accountId, 'delete_profile', SELF_PROFILE_POLICY_VERSION, nowIso)
      const result = run(
        'DELETE FROM self_profiles WHERE account_id = ? AND id = ? AND version = ?',
        [accountId, existing.id, existing.version],
      )
      if (result.changes !== 1) {
        throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已变更，请重新读取后重试')
      }
      return { success: true }
    })
  }

  /**
   * 使用授权变更。setUsage(false) 保留长期日期但停止后续档案带入；
   * setUsage(true) 必须新的明确版本确认，字段为空时拒绝允许。
   */
  function setUsage(
    accountId: number,
    expected: { profileId: string; version: number },
    allowed: boolean,
    consentVersion?: string,
  ): SelfProfile {
    const existing = loadRow(accountId)
    if (!existing || existing.id !== expected.profileId || existing.version !== expected.version) {
      throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已变更，请重新读取后重试')
    }
    if (allowed) {
      if (!existing.raw_calendar) {
        throw new SelfProfileServiceError('CONSENT_REQUIRED', '尚无出生日期，无法重新允许带入')
      }
      if (consentVersion !== SELF_PROFILE_POLICY_VERSION) {
        throw new SelfProfileServiceError('CONSENT_REQUIRED', '请重新确认档案告知后允许带入')
      }
    }
    const nowIso = now().toISOString()
    return transaction(() => {
      const result = run(
        `UPDATE self_profiles SET use_allowed = ?, version = version + 1, updated_at = ?
         WHERE account_id = ? AND id = ? AND version = ?`,
        [allowed ? 1 : 0, nowIso, accountId, existing.id, existing.version],
      )
      if (result.changes !== 1) {
        throw new SelfProfileServiceError('VERSION_CONFLICT', '档案已变更，请重新读取后重试')
      }
      writeConsentReceipt(
        deps,
        accountId,
        allowed ? 'allow_use' : 'revoke_use',
        SELF_PROFILE_POLICY_VERSION,
        nowIso,
      )
      const row = loadRow(accountId)
      if (!row) throw new SelfProfileServiceError('SAVE_FAILED', '操作失败，请稍后再试')
      return rowToProfile(row)
    })
  }

  return {
    get: getProfile,
    summary,
    countHistoryWithBirthInput,
    save,
    deleteBirthDate,
    deleteProfile,
    setUsage,
  }
}

export type SelfProfileService = ReturnType<typeof createSelfProfileService>

/**
 * 绑定现有数据库入口的默认实例（生产路径）。
 *
 * 档案与结果历史的联动（D5）在此绑定：计数走结果历史服务，删除走**原始 run**
 * 以便在 deleteProfile 自己的事务内执行（嵌套事务会失败）。
 */
export const selfProfileService = createSelfProfileService({
  get: dbGet,
  run: dbRun,
  transaction: withTransaction,
  now: () => new Date(),
  countHistoryWithBirthInput: accountId =>
    resultHistoryService.countByTool(accountId, BAZI_TOOL_ID),
  deleteHistoryRows: accountId =>
    dbRun('DELETE FROM result_snapshots WHERE account_id = ? AND tool_id = ?', [
      accountId,
      BAZI_TOOL_ID,
    ]).changes,
})
