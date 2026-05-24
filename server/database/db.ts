import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { CREATE_PROFILES_TABLE, CREATE_SESSIONS_TABLE, CREATE_DIVINATION_TABLE } from './schema'

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
    saveFile()
    saveScheduled = false
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

    db.run(CREATE_PROFILES_TABLE)
    db.run(CREATE_SESSIONS_TABLE)
    db.run(CREATE_DIVINATION_TABLE)

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
