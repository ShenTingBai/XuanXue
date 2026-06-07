export const CREATE_PROFILES_TABLE = `
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  pin TEXT,
  birth_date TEXT,
  birth_calendar TEXT CHECK(birth_calendar IS NULL OR birth_calendar IN ('solar', 'lunar')),
  birth_hour INTEGER CHECK(birth_hour IS NULL OR (birth_hour >= 0 AND birth_hour <= 23)),
  birth_minute INTEGER CHECK(birth_minute IS NULL OR (birth_minute >= 0 AND birth_minute <= 59)),
  gender TEXT CHECK(gender IS NULL OR gender IN ('男', '女')),
  birth_place TEXT,
  birth_longitude REAL,
  parent_profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
)
`

export const CREATE_DIVINATION_TABLE = `
CREATE TABLE IF NOT EXISTS divination_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('shengxiao','constellation','bazi','yijing','ziwei','cezi','hehun','name-test','zeji','guming','meihua')),
  input_data TEXT NOT NULL,
  result_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const INDEX_SESSIONS_PROFILE = `CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id)`
export const INDEX_SESSIONS_TOKEN_HASH = `CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)`
export const INDEX_DIVINATION_PROFILE = `CREATE INDEX IF NOT EXISTS idx_divination_profile ON divination_results(profile_id)`
export const INDEX_DIVINATION_PROFILE_TYPE_CREATED = `
  CREATE INDEX IF NOT EXISTS idx_divination_profile_type_created
  ON divination_results(profile_id, type, created_at DESC)
`
export const INDEX_SESSIONS_EXPIRES_AT = `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`

export const CREATE_SECURITY_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS security_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const INDEX_SECURITY_LOG_PROFILE_TYPE_CREATED = `CREATE INDEX IF NOT EXISTS idx_security_log_profile_type_created ON security_log(profile_id, event_type, created_at)`
