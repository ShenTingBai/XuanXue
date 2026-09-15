import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import {
  CREATE_ACCOUNTS_TABLE,
  CREATE_SESSIONS_TABLE,
  CREATE_SECURITY_LOG_TABLE,
  CREATE_MIGRATIONS_TABLE,
  INDEX_SESSIONS_ACCOUNT,
  INDEX_SESSIONS_TOKEN_HASH,
  INDEX_SESSIONS_EXPIRES_AT,
  INDEX_SECURITY_LOG_ACCOUNT_TYPE_CREATED,
} from './schema'
import {
  CREATE_SELF_PROFILES_TABLE,
  CREATE_CONSENT_RECEIPTS_TABLE,
  INDEX_SELF_PROFILES_ACCOUNT,
  INDEX_CONSENT_RECEIPTS_ACCOUNT,
} from './self-profile-schema'
import {
  CREATE_RESULT_SNAPSHOTS_TABLE,
  INDEX_RESULT_SNAPSHOTS_ACCOUNT_TOOL,
} from './result-history-schema'

/**
 * R2 默认数据库文件为独立新库（见下方 DB_PATH）。
 * 旧 xuanxue.db 继续作为离线只读备份保留，本模块不做任何读取、导入或迁移。
 * 显式 process.env.DB_PATH 仍然优先，供部署与测试覆盖。
 */
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'xuanxue-r2.db')

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
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
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

    // 只创建 R2 三张表和迁移记录，不读取、导入或探测 xuanxue.db。
    db.run(CREATE_ACCOUNTS_TABLE)
    db.run(CREATE_SESSIONS_TABLE)
    db.run(CREATE_SECURITY_LOG_TABLE)
    db.run(CREATE_MIGRATIONS_TABLE)

    db.run(INDEX_SESSIONS_ACCOUNT)
    db.run(INDEX_SESSIONS_TOKEN_HASH)
    db.run(INDEX_SESSIONS_EXPIRES_AT)
    db.run(INDEX_SECURITY_LOG_ACCOUNT_TYPE_CREATED)

    // R4 本人档案两表及索引：幂等 CREATE IF NOT EXISTS，初始化失败不把 R4 结构标为已完成。
    db.run(CREATE_SELF_PROFILES_TABLE)
    db.run(CREATE_CONSENT_RECEIPTS_TABLE)
    db.run(INDEX_SELF_PROFILES_ACCOUNT)
    db.run(INDEX_CONSENT_RECEIPTS_ACCOUNT)

    // 迁移记录版本 4：必须在两表和索引成功后的事务内写入，重复启动不重复记录。
    withTransaction(() => {
      const migrationV4 = dbGet('SELECT version FROM _migrations WHERE version = 4')
      if (!migrationV4) {
        dbRun('INSERT INTO _migrations (version) VALUES (4)')
      }
    })

    // R5 结果历史一表及索引：同样幂等 CREATE IF NOT EXISTS，失败不把 R5 结构标为已完成。
    db.run(CREATE_RESULT_SNAPSHOTS_TABLE)
    db.run(INDEX_RESULT_SNAPSHOTS_ACCOUNT_TOOL)

    // 迁移记录版本 5：与 R4 同样要求表与索引成功后再写入。
    withTransaction(() => {
      const migrationV5 = dbGet('SELECT version FROM _migrations WHERE version = 5')
      if (!migrationV5) {
        dbRun('INSERT INTO _migrations (version) VALUES (5)')
      }
    })

    // 清理 90 天前的过期安全日志，保持最小留存。
    db.run("DELETE FROM security_log WHERE created_at < datetime('now', '-90 days')")

    process.on('SIGINT', () => {
      flushSave()
      process.exit(0)
    })
    process.on('SIGTERM', () => {
      flushSave()
      process.exit(0)
    })

    // Graceful shutdown: flush pending save before process exits
    process.on('beforeExit', () => {
      flushSave()
    })

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

/**
 * 在单个事务中执行回调：BEGIN 后运行，成功 COMMIT，失败 ROLLBACK 并重新抛出。
 * 持久化调度只发生在成功提交之后，避免回滚状态落盘。
 * 只接受同步回调：返回 Promise 会在提交前被拒绝并回滚，保持同步事务语义。
 */
export function withTransaction<T>(fn: () => T): T {
  const database = getDb()
  database.run('BEGIN')
  transactionDepth++
  let committed = false
  try {
    const result = fn()
    // 泛型 T 未知具体形态，先转 unknown 再探测 then，避免 TS2352 误报；不改变运行时行为
    if (
      result !== null &&
      typeof result === 'object' &&
      typeof (result as unknown as Promise<unknown>).then === 'function'
    ) {
      throw new Error('withTransaction 回调必须同步完成，禁止返回 Promise')
    }
    database.run('COMMIT')
    committed = true
    return result
  } catch (err) {
    try {
      database.run('ROLLBACK')
    } catch {
      // ROLLBACK 失败不可恢复，保持抛出原错误
    }
    throw err
  } finally {
    transactionDepth--
    // 只有成功提交后才调度持久化；任何失败路径都在 finally 恢复深度。
    if (committed) {
      scheduleSave()
    }
  }
}

// 事务嵌套深度：大于 0 时 dbRun 不调度持久化，防止回滚状态落盘。
let transactionDepth = 0

export function dbGet(
  sql: string,
  params: (string | number | null | undefined)[] = [],
): Record<string, unknown> | undefined {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const result = stmt.step() ? stmt.getAsObject() : undefined
  stmt.free()
  return result
}

export function dbAll(
  sql: string,
  params: (string | number | null | undefined)[] = [],
): Record<string, unknown>[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const results: Record<string, unknown>[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

export function dbRun(
  sql: string,
  params: (string | number | null | undefined)[] = [],
): { lastInsertRowid: number; changes: number } {
  const database = getDb()
  database.run(sql, params)
  // 事务内不调度持久化：由 withTransaction 在成功 COMMIT 后统一调度。
  if (transactionDepth === 0) {
    scheduleSave()
  }

  const isInsert = /^\s*INSERT\b/i.test(sql.trim())
  const idResult = isInsert ? dbGet('SELECT last_insert_rowid() as id') : undefined
  return {
    lastInsertRowid: (idResult?.id as number) ?? 0,
    changes: database.getRowsModified(),
  }
}
