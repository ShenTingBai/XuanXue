import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname } from 'node:path'
import { initDb, dbRun } from '../../../server/database/db'

// sql.js 持久化契约：写入必须是「临时文件 + rename」的原子替换。
// 旧实现直接 writeFileSync 覆盖目标文件，写入中崩溃会留下截断文件，
// 账号 / 会话 / 档案一次性损毁且无可回退副本。
function dbPath(): string {
  const value = process.env.DB_PATH
  expect(value, 'DB_PATH 必须由 globalSetup 注入').toBeDefined()
  return value as string
}

/** 等待 scheduleSave 的 nextTick 落盘。 */
function flushTick(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve))
}

describe('sql.js 持久化原子性', () => {
  beforeAll(async () => {
    await initDb()
  })

  it('初始化后目标库文件存在且非空', () => {
    const target = dbPath()
    expect(existsSync(target)).toBe(true)
    expect(statSync(target).size).toBeGreaterThan(0)
  })

  it('落盘后目录内不残留 .tmp 临时文件', async () => {
    const target = dbPath()
    dbRun('INSERT OR IGNORE INTO _migrations (version) VALUES (9901)')
    await flushTick()

    const leftovers = readdirSync(dirname(target)).filter(name => name.endsWith('.tmp'))
    expect(leftovers).toEqual([])
  })

  it('覆盖写之前保留 .bak 回退副本', async () => {
    const target = dbPath()
    dbRun('INSERT OR IGNORE INTO _migrations (version) VALUES (9902)')
    await flushTick()

    expect(existsSync(`${target}.bak`)).toBe(true)
    expect(statSync(`${target}.bak`).size).toBeGreaterThan(0)
  })
})
