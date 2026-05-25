export const CREATE_PROFILES_TABLE = `
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  birth_date TEXT,
  birth_calendar TEXT CHECK(birth_calendar IS NULL OR birth_calendar IN ('solar', 'lunar')),
  birth_hour INTEGER CHECK(birth_hour IS NULL OR (birth_hour >= 0 AND birth_hour <= 23)),
  birth_minute INTEGER CHECK(birth_minute IS NULL OR (birth_minute >= 0 AND birth_minute <= 59)),
  gender TEXT CHECK(gender IS NULL OR gender IN ('男', '女')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
)
`

export const CREATE_DIVINATION_TABLE = `
CREATE TABLE IF NOT EXISTS divination_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  input_data TEXT NOT NULL,
  result_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const INDEX_SESSIONS_PROFILE = `CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id)`
export const INDEX_DIVINATION_PROFILE = `CREATE INDEX IF NOT EXISTS idx_divination_profile ON divination_results(profile_id)`

export const CREATE_SECURITY_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS security_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  ip TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const INDEX_SECURITY_LOG_PROFILE = `CREATE INDEX IF NOT EXISTS idx_security_log_profile ON security_log(profile_id)`
export const INDEX_SECURITY_LOG_TYPE = `CREATE INDEX IF NOT EXISTS idx_security_log_type ON security_log(event_type)`
