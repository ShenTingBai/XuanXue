import 'dotenv/config'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Vitest global setup — loads .env for server-side tests

// CI fallback: .env is not committed to repo, GitHub Actions has no .env file
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'vitest-fallback-secret-not-for-production'
}

/**
 * 每个测试 worker 独占一个数据库文件（2026-09-15）。
 *
 * 此前 globalSetup 只注入**一个**临时库路径，而 `tests/server/divinations.test.ts` 与
 * `tests/server/utils/auth.test.ts` 都会调用真实 `initDb()` 并落盘；Vitest 默认
 * `fileParallelism: true`，两个文件落在不同进程时会对同一 sqlite 文件并发读改写，
 * 造成丢更新与偶发失败，且两侧都用 `LIKE 'test_%'` 清库、互为对方的外部状态。
 *
 * `server/database/db.ts` 在**模块加载时**固定 `DB_PATH`，而 setupFiles 在每个 worker
 * 中先于任何测试模块执行，因此这里是唯一能按 worker 隔离注入的时机。
 * 每 worker 的库仍位于 globalSetup 建的临时根目录之下，teardown 会一并清理，
 * 两个测试文件中的「DB_PATH 必须位于 os.tmpdir() 之下」断言继续成立。
 *
 * 前提：Vitest 3 默认 pool 为 `forks`（每 worker 独立进程），`process.env` 修改不跨 worker。
 * 若将来改用 worker_threads，需改回由 globalSetup 按文件分配路径。
 */
const baseDbPath = process.env.DB_PATH
if (baseDbPath) {
  const perWorkerDbPath = join(dirname(baseDbPath), `worker-${process.pid}`, 'xuanxue.db')
  mkdirSync(dirname(perWorkerDbPath), { recursive: true })
  process.env.DB_PATH = perWorkerDbPath
}
