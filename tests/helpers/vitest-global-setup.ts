/**
 * Vitest 全局 setup：在测试工作进程加载任何数据库模块之前，把 DB_PATH 强制指向本轮唯一的
 * 操作系统临时目录，隔离 tests/server/divinations.test.ts 对真实 xuanxue.db 的直接初始化。
 *
 * 为什么必须放在 globalSetup：db.ts 在模块加载时把 DB_PATH 固定为 process.env.DB_PATH 或
 * 项目根 xuanxue.db；只有在本轮唯一临时目录创建并设置环境变量之后、任何测试工作进程 fork 之前
 * 生效，才能保证测试永不触碰真实数据库。teardown 放在 global teardown 是因为必须等所有测试
 * 工作进程结束后才能安全删除正在被使用的临时数据库文件。
 *
 * @author LiXinwen
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'

export default function setup(): () => void {
  // 保存进入 setup 前的 DB_PATH（可能不存在），供 teardown 恢复。
  const originalDbPath = process.env.DB_PATH

  // 创建本轮唯一临时目录；闭包持有该路径，teardown 只删除这一个目录。
  const tempDir = mkdtempSync(join(tmpdir(), 'xuanxue-vitest-'))
  const tempDbPath = resolve(tempDir, 'xuanxue.db')

  // 强制覆盖任何外部 DB_PATH；测试运行期间一律使用本轮独立临时库。
  process.env.DB_PATH = tempDbPath

  // 多个测试 worker 会共用同一个临时库路径，生产用的单实例锁会互相冲突。
  // 锁本身的正确性由 tests/server/utils/instance-lock.test.ts 用独立临时路径单独覆盖。
  process.env.XUANXUE_DISABLE_DB_LOCK = '1'

  return function teardown(): void {
    // 先校验目标确在 os.tmpdir() 之下，再精确递归删除本轮目录，避免误删其他路径。
    const tmpRoot = resolve(tmpdir())
    if (resolve(tempDir).startsWith(tmpRoot + sep)) {
      rmSync(tempDir, { recursive: true, force: true })
    }

    // 恢复原 DB_PATH；原值不存在则删除该键。
    if (originalDbPath === undefined) {
      delete process.env.DB_PATH
    } else {
      process.env.DB_PATH = originalDbPath
    }

    delete process.env.XUANXUE_DISABLE_DB_LOCK
  }
}
