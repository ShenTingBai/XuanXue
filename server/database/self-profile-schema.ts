/**
 * R4 本人档案数据库结构：只建设 self_profiles 与 consent_receipts 两张表及所需索引。
 * 不改 server/database/schema.ts 的 R2 账号定义；账号注销仍依赖 accounts 外键级联。
 *
 * 约束设计：
 * - self_profiles.account_id UNIQUE → 一个账号最多一份本人档案；
 * - id 为服务端 randomUUID，删除重建必须新 id，避免旧 expected 覆盖新档案；
 * - 日期组数据库约束「全 null 或完整」：solar 时闰月字段 null、lunar 时 0/1；
 * - consent_receipts 只记录用途/类别/动作/版本/状态，不含出生值、before/after JSON、
 *   完整 IP、昵称或 token；档案删除保留最小操作记录。
 */

export const CREATE_SELF_PROFILES_TABLE = `
CREATE TABLE IF NOT EXISTS self_profiles (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version >= 1),
  use_allowed INTEGER NOT NULL CHECK(use_allowed IN (0, 1)),
  raw_calendar TEXT,
  raw_year INTEGER,
  raw_month INTEGER,
  raw_day INTEGER,
  raw_is_leap_month INTEGER,
  solar_date TEXT,
  conversion_version TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    -- 全空：出生日期字段组整体未保存。
    (raw_calendar IS NULL AND raw_year IS NULL AND raw_month IS NULL AND raw_day IS NULL AND raw_is_leap_month IS NULL AND solar_date IS NULL AND conversion_version IS NULL AND confirmed_at IS NULL)
    OR
    -- 公历完整：显式 raw_calendar IS NOT NULL（防 NULL 比较产生 NULL 使 CHECK 放行），
    -- 闰月字段必须为 NULL（公历无闰月概念），其余日期字段非 NULL。
    (raw_calendar IS NOT NULL AND raw_calendar = 'solar' AND raw_year IS NOT NULL AND raw_month IS NOT NULL AND raw_day IS NOT NULL AND raw_is_leap_month IS NULL AND solar_date IS NOT NULL AND conversion_version IS NOT NULL AND confirmed_at IS NOT NULL)
    OR
    -- 农历完整：显式 raw_calendar IS NOT NULL，闰月字段必须为 0/1（普通月/闰月），其余日期字段非 NULL。
    (raw_calendar IS NOT NULL AND raw_calendar = 'lunar' AND raw_year IS NOT NULL AND raw_month IS NOT NULL AND raw_day IS NOT NULL AND raw_is_leap_month IS NOT NULL AND raw_is_leap_month IN (0, 1) AND solar_date IS NOT NULL AND conversion_version IS NOT NULL AND confirmed_at IS NOT NULL)
  )
)
`

export const CREATE_CONSENT_RECEIPTS_TABLE = `
CREATE TABLE IF NOT EXISTS consent_receipts (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  data_category TEXT NOT NULL,
  action TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
)
`

export const INDEX_SELF_PROFILES_ACCOUNT = `CREATE INDEX IF NOT EXISTS idx_self_profiles_account ON self_profiles(account_id)`
export const INDEX_CONSENT_RECEIPTS_ACCOUNT = `CREATE INDEX IF NOT EXISTS idx_consent_receipts_account ON consent_receipts(account_id, purpose, data_category, action)`
