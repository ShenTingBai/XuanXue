import { createHash } from 'node:crypto'
import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import {
  CREATE_PROFILES_TABLE,
  CREATE_SESSIONS_TABLE,
  CREATE_DIVINATION_TABLE,
  CREATE_SECURITY_LOG_TABLE,
  INDEX_SESSIONS_PROFILE,
  INDEX_SESSIONS_TOKEN_HASH,
  INDEX_DIVINATION_PROFILE,
  INDEX_DIVINATION_PROFILE_TYPE_CREATED,
  INDEX_SESSIONS_EXPIRES_AT,
  INDEX_SECURITY_LOG_PROFILE_TYPE_CREATED,
} from './schema'

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'xuanxue.db')

let SQL: SqlJsStatic | null = null
let db: SqlJsDatabase | null = null

let initStarted = false
let initComplete: Promise<void> | null = null

function getDbPath(): string {
  return DB_PATH
}

function loadFile(): Buffer | undefined {
  try {
    const data = fs.readFileSync(getDbPath())
    return Buffer.from(data)
  } catch {
    return undefined
  }
}

function saveFile(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(getDbPath(), buffer)
}

let saveScheduled = false
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
let lastSaveTime = 0
const MIN_SAVE_INTERVAL = 5000 // Minimum 5 seconds between writes

function scheduleSave(): void {
  if (saveScheduled) return
  saveScheduled = true

  const now = Date.now()
  const timeSinceLastSave = now - lastSaveTime

  if (timeSinceLastSave >= MIN_SAVE_INTERVAL) {
    // Enough time has passed — save immediately on next tick
    process.nextTick(() => {
      try {
        lastSaveTime = Date.now()
        saveFile()
      } catch (err) {
        console.error('数据库保存失败:', err)
      } finally {
        saveScheduled = false
      }
    })
  } else {
    // Throttle: wait until MIN_SAVE_INTERVAL has elapsed since last save
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
    const delay = MIN_SAVE_INTERVAL - timeSinceLastSave
    saveDebounceTimer = setTimeout(() => {
      try {
        lastSaveTime = Date.now()
        saveFile()
      } catch (err) {
        console.error('数据库保存失败:', err)
      } finally {
        saveScheduled = false
        saveDebounceTimer = null
      }
    }, delay)
  }
}

/** Force an immediate save — used for graceful shutdown */
function flushSave(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }
  try {
    lastSaveTime = Date.now()
    saveFile()
  } catch (err) {
    console.error('数据库保存失败:', err)
  }
  saveScheduled = false
}

export async function initDb(): Promise<void> {
  if (initComplete) return initComplete
  if (initStarted) return initComplete!

  initStarted = true
  initComplete = (async () => {
    SQL = await initSqlJs()
    const existing = loadFile()
    db = new SQL.Database(existing || undefined)

    db.run('PRAGMA journal_mode = WAL')
    db.run('PRAGMA synchronous = NORMAL')
    db.run('PRAGMA foreign_keys = ON')

    db.run(CREATE_PROFILES_TABLE)
    db.run(CREATE_SESSIONS_TABLE)

    // Hash any existing plaintext tokens in token_hash (48 hex chars = old randomBytes(24).toString('hex'))
    try {
      const rows = dbAll('SELECT id, token_hash FROM sessions') as { id: number; token_hash: string }[]
      for (const row of rows) {
        const token = row.token_hash
        if (token && token.length === 48) {
          const hashed = createHash('sha256').update(token).digest('hex')
          dbRun('UPDATE sessions SET token_hash = ? WHERE id = ?', [hashed, row.id])
        }
      }
    } catch (e) {
      console.error('Migration failed (hash existing tokens):', e)
    }

    db.run(CREATE_DIVINATION_TABLE)
    db.run(INDEX_SESSIONS_PROFILE)
    db.run(INDEX_SESSIONS_TOKEN_HASH)
    db.run(INDEX_SESSIONS_EXPIRES_AT)
    db.run(INDEX_DIVINATION_PROFILE)
    db.run(INDEX_DIVINATION_PROFILE_TYPE_CREATED)

    // Migration: remove pin CHECK(length(pin)=4) constraint for hashed PIN support
    try {
      const tableInfo = dbGet("SELECT sql FROM sqlite_master WHERE type='table' AND name='profiles'")
      if (tableInfo && (tableInfo.sql as string).includes('CHECK(length(pin) = 4)')) {
        db.run("BEGIN")
        db.run('ALTER TABLE profiles RENAME TO profiles_old')
        db.run(CREATE_PROFILES_TABLE)
        db.run(`INSERT INTO profiles (id, nickname, pin, birth_date, birth_calendar, birth_hour, birth_minute, gender, created_at, updated_at) SELECT id, nickname, pin, birth_date, birth_calendar, birth_hour, birth_minute, gender, created_at, updated_at FROM profiles_old`)
        db.run('DROP TABLE profiles_old')
        db.run("COMMIT")
      }
    } catch (e) {
      try { db.run("ROLLBACK") } catch {}
      console.error('Migration failed (profiles CHECK constraint):', e)
    }

    db.run(CREATE_SECURITY_LOG_TABLE)
    db.run(INDEX_SECURITY_LOG_PROFILE_TYPE_CREATED)
    db.run("DELETE FROM security_log WHERE created_at < datetime('now', '-90 days')")

    // Migration version tracking
    db.run(`CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)

    const migrations: { version: number; sql: string }[] = [
      {
        version: 3,
        sql: `ALTER TABLE profiles ADD COLUMN birth_place TEXT;
              ALTER TABLE profiles ADD COLUMN birth_longitude REAL;`,
      },
      {
        version: 4,
        sql: `ALTER TABLE profiles ADD COLUMN parent_profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE;`,
      },
    ]

    const appliedMigrations = new Set(
      dbAll('SELECT version FROM _migrations').map(r => r.version as number)
    )
    for (const m of migrations) {
      if (!appliedMigrations.has(m.version)) {
        db.run(m.sql)
        db.run('INSERT INTO _migrations (version) VALUES (?)', [m.version])
      }
    }

    process.on('SIGINT', () => { flushSave(); process.exit(0) })
    process.on('SIGTERM', () => { flushSave(); process.exit(0) })

    // Graceful shutdown: flush pending save before process exits
    process.on('beforeExit', () => { flushSave() })

    saveFile()
  })()

  return initComplete
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('System not ready — database unavailable')
  }
  return db
}

export function dbGet(sql: string, params: any[] = []): Record<string, any> | undefined {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const result = stmt.step() ? stmt.getAsObject() : undefined
  stmt.free()
  return result
}

export function dbAll(sql: string, params: any[] = []): Record<string, any>[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const results: Record<string, any>[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

export function dbRun(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  const database = getDb()
  database.run(sql, params)
  scheduleSave()

  const isInsert = /^\s*INSERT\b/i.test(sql.trim())
  const idResult = isInsert ? dbGet('SELECT last_insert_rowid() as id') : undefined
  return {
    lastInsertRowid: idResult?.id ?? 0,
    changes: database.getRowsModified(),
  }
}
