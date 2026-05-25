import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import {
  CREATE_PROFILES_TABLE,
  CREATE_SESSIONS_TABLE,
  CREATE_DIVINATION_TABLE,
  CREATE_SECURITY_LOG_TABLE,
  INDEX_SESSIONS_PROFILE,
  INDEX_SESSIONS_TOKEN,
  INDEX_DIVINATION_PROFILE,
  INDEX_SECURITY_LOG_PROFILE,
  INDEX_SECURITY_LOG_TYPE,
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
function scheduleSave(): void {
  if (saveScheduled) return
  saveScheduled = true
  process.nextTick(() => {
    try {
      saveFile()
    } catch (err) {
      console.error('数据库保存失败:', err)
    } finally {
      saveScheduled = false
    }
  })
}

export async function initDb(): Promise<void> {
  if (initComplete) return initComplete
  if (initStarted) return initComplete!

  initStarted = true
  initComplete = (async () => {
    SQL = await initSqlJs()
    const existing = loadFile()
    db = new SQL.Database(existing || undefined)

    db.run('PRAGMA journal_mode = MEMORY')
    db.run('PRAGMA foreign_keys = ON')

    db.run(CREATE_PROFILES_TABLE)
    db.run(CREATE_SESSIONS_TABLE)
    db.run(CREATE_DIVINATION_TABLE)
    db.run(INDEX_SESSIONS_PROFILE)
    db.run(INDEX_SESSIONS_TOKEN)
    db.run(INDEX_DIVINATION_PROFILE)

    // Phase 2 migrations
    // Migration: add expires_at column if it doesn't exist
    try { db.run("ALTER TABLE sessions ADD COLUMN expires_at TEXT") } catch { /* already exists */ }

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
    db.run(INDEX_SECURITY_LOG_PROFILE)
    db.run(INDEX_SECURITY_LOG_TYPE)
    db.run(INDEX_SECURITY_LOG_PROFILE_TYPE_CREATED)

    process.on('SIGINT', () => { saveFile(); process.exit(0) })
    process.on('SIGTERM', () => { saveFile(); process.exit(0) })

    saveFile()
  })()

  return initComplete
}

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized yet')
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

  const idResult = dbGet('SELECT last_insert_rowid() as id')
  return {
    lastInsertRowid: idResult?.id ?? 0,
    changes: database.getRowsModified(),
  }
}
