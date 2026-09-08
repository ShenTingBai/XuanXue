/**
 * R2 干净数据库结构：只建设 Account、Session 与最小安全事件日志。
 * 不创建 SelfProfile、ConsentReceipt、ResultSnapshot、内容偏好或任何工具历史表。
 */

export const CREATE_ACCOUNTS_TABLE = `
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  credential_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active')),
  age_confirmed_at TEXT NOT NULL,
  privacy_policy_version TEXT NOT NULL,
  service_terms_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
)
`

export const CREATE_SECURITY_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS security_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_hint TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const INDEX_SESSIONS_ACCOUNT = `CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id)`
export const INDEX_SESSIONS_TOKEN_HASH = `CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)`
export const INDEX_SESSIONS_EXPIRES_AT = `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`
export const INDEX_SECURITY_LOG_ACCOUNT_TYPE_CREATED = `CREATE INDEX IF NOT EXISTS idx_security_log_account_type_created ON security_log(account_id, event_type, created_at)`

/** 迁移元数据表：记录已应用的 schema 版本。 */
export const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`
