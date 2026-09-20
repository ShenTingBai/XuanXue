import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  acquireInstanceLock,
  isProcessAlive,
  InstanceLockError,
} from '~/server/utils/instance-lock'

/**
 * 单实例锁的正确性。
 *
 * sql.js 每 5 秒整文件覆盖写，两个实例会互相抹掉写入 —— 必须拒绝第二个实例。
 *
 * 本文件除单进程用例（原有一组 + token 身份用例）外，还包含**真实多进程竞态**：
 * 用 `node --experimental-strip-types` 拉起两个子进程同时争抢同一临时锁，
 * 断言最多一个成为持有者。仅在一个进程里顺序调用两次 acquire 无法证明原子性。
 */
let dir: string
let lockPath: string

/** 读取锁记录（pid + token）；损坏返回 null。 */
function readRecord(path: string): { pid: number; token?: string } | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'))
    if (typeof parsed !== 'object' || parsed === null) return null
    const { pid, token } = parsed as { pid?: unknown; token?: unknown }
    return typeof pid === 'number'
      ? { pid, token: typeof token === 'string' ? token : undefined }
      : null
  } catch {
    return null
  }
}

function readPid(path: string): number | null {
  return readRecord(path)?.pid ?? null
}

/**
 * 子进程脚本：加载**生产模块**争抢锁，把结果以 JSON 写到 stdout。
 *
 * 用 Node 24 原生 `--experimental-strip-types` 直接加载 .ts（仓库无 jiti/tsx 依赖）。
 * `readyDelayMs` 让两个子进程尽量在同一时刻发起竞争。
 */
function childScript(lockPathArg: string, readyDelayMs: number): string {
  return `
    const { acquireInstanceLock, InstanceLockError } = await import(
      ${JSON.stringify(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '../../../server/utils/instance-lock.ts')).href)}
    )
    await new Promise(r => setTimeout(r, ${readyDelayMs}))
    const out = (o) => { process.stdout.write(JSON.stringify(o)) }
    try {
      const lock = acquireInstanceLock(${JSON.stringify(lockPathArg)})
      out({ ok: true, pid: process.pid, token: lock.token })
      // 持有片刻再释放，确保竞争窗口覆盖两个子进程
      setTimeout(() => { lock.release(); process.exit(0) }, 300)
    } catch (err) {
      out({ ok: false, pid: process.pid, name: err?.name ?? 'Error', code: err?.code ?? null })
      process.exit(err instanceof InstanceLockError ? 3 : 4)
    }
  `
}

interface ChildResult {
  ok: boolean
  pid: number
  token?: string
  name?: string
  code?: string | null
}

/** 拉起一个子进程并解析其 JSON 结果。 */
function runChild(script: string): Promise<{ result: ChildResult; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '-e', script],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', d => {
      stdout += String(d)
    })
    child.stderr.on('data', d => {
      stderr += String(d)
    })
    child.on('error', reject)
    child.on('close', code => {
      try {
        resolve({ result: JSON.parse(stdout) as ChildResult, exitCode: code ?? -1 })
      } catch {
        reject(new Error(`子进程输出无法解析：stdout=${stdout} stderr=${stderr}`))
      }
    })
  })
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'xuanxue-lock-'))
  lockPath = join(dir, 'xuanxue.db.lock')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('isProcessAlive', () => {
  it('本进程存活，非法 PID 判定为不存在', () => {
    expect(isProcessAlive(process.pid)).toBe(true)
    expect(isProcessAlive(0)).toBe(false)
    expect(isProcessAlive(-1)).toBe(false)
    expect(isProcessAlive(1.5)).toBe(false)
    // 远超系统 PID 上限，必定不存在
    expect(isProcessAlive(99999999)).toBe(false)
  })
})

describe('acquireInstanceLock', () => {
  it('无锁文件时创建锁并写入本进程 PID 与 token', () => {
    const lock = acquireInstanceLock(lockPath)
    expect(existsSync(lockPath)).toBe(true)
    const record = readRecord(lockPath)
    expect(record?.pid).toBe(process.pid)
    // token 必须落盘，否则 release 无法做代际身份匹配
    expect(record?.token).toBe(lock.token)
    expect(lock.token).toMatch(/^[0-9a-f-]{36}$/)
    expect(lock.path).toBe(lockPath)
    lock.release()
  })

  it('release 删除锁文件，且可重复调用', () => {
    const lock = acquireInstanceLock(lockPath)
    lock.release()
    expect(existsSync(lockPath)).toBe(false)
    expect(() => lock.release()).not.toThrow()
  })

  it('锁文件损坏（非 JSON）时视为陈旧锁并接管', () => {
    writeFileSync(lockPath, 'not-json-at-all')
    const lock = acquireInstanceLock(lockPath)
    expect(readPid(lockPath)).toBe(process.pid)
    lock.release()
  })

  it('锁由已消失的进程持有时可接管（崩溃残留不会永久锁死）', () => {
    writeFileSync(lockPath, JSON.stringify({ pid: 99999999, token: 'dead-token' }))
    const lock = acquireInstanceLock(lockPath)
    expect(readPid(lockPath)).toBe(process.pid)
    lock.release()
  })

  it('锁由存活的其他进程持有时拒绝获取', () => {
    const otherPid = process.ppid
    // 若运行环境无法提供另一个存活进程，则该断言不适用（跳过而非假通过）。
    if (otherPid === process.pid || !isProcessAlive(otherPid)) return
    // 完整锁记录（pid + token）：缺 token 会被视为损坏锁而走陈旧接管路径
    writeFileSync(lockPath, JSON.stringify({ pid: otherPid, token: 'other-token' }))
    expect(() => acquireInstanceLock(lockPath)).toThrow(InstanceLockError)
  })

  it('拒绝时携带锁路径与持有者 PID，便于运维定位', () => {
    const otherPid = process.ppid
    if (otherPid === process.pid || !isProcessAlive(otherPid)) return
    writeFileSync(lockPath, JSON.stringify({ pid: otherPid, token: 'other-token' }))
    try {
      acquireInstanceLock(lockPath)
      expect.unreachable('应当抛出 InstanceLockError')
    } catch (err) {
      expect(err).toBeInstanceOf(InstanceLockError)
      expect((err as InstanceLockError).lockPath).toBe(lockPath)
      expect((err as InstanceLockError).holderPid).toBe(otherPid)
    }
  })

  it('释放时不误删已被他人接管的锁', () => {
    const lock = acquireInstanceLock(lockPath)
    // 模拟锁被另一进程接管
    writeFileSync(lockPath, JSON.stringify({ pid: 99999999, token: 'other-token' }))
    lock.release()
    expect(existsSync(lockPath)).toBe(true)
    expect(readPid(lockPath)).toBe(99999999)
  })

  it('同 PID 不同 token 的旧 handle release 不删除新代锁', () => {
    // 场景：同一进程先持锁（代 A），锁被释放后又被本进程重新获取（代 B）。
    // 旧 handle（代 A）的 release 绝不能删除代 B 的锁。
    const first = acquireInstanceLock(lockPath)
    const firstToken = first.token

    // 模拟"锁被重新接管为同 PID 的新代际"：直接改写为同 pid、不同 token
    writeFileSync(lockPath, JSON.stringify({ pid: process.pid, token: 'newer-generation-token' }))

    first.release()
    // 仅 PID 相同的旧实现会在此误删；token 匹配后必须保留
    expect(existsSync(lockPath)).toBe(true)
    expect(readRecord(lockPath)?.token).toBe('newer-generation-token')
    expect(readRecord(lockPath)?.token).not.toBe(firstToken)
  })

  it('递归创建锁文件所在目录', () => {
    const nested = join(dir, 'a', 'b', 'xuanxue.db.lock')
    const lock = acquireInstanceLock(nested)
    expect(existsSync(nested)).toBe(true)
    lock.release()
  })

  it('接管陈旧锁后不在锁目录留下隔离文件', () => {
    writeFileSync(lockPath, JSON.stringify({ pid: 99999999, token: 'dead-token' }))
    const lock = acquireInstanceLock(lockPath)
    lock.release()
    // 隔离用的临时文件必须清理干净
    const leftovers = readdirSync(dir).filter(f => f.includes('.stale-'))
    expect(leftovers).toEqual([])
  })
})

describe('acquireInstanceLock 真实多进程竞态', () => {
  it('两个子进程同时争抢空锁路径：恰好一个持有', async () => {
    const script = (delay: number) => childScript(lockPath, delay)
    const [a, b] = await Promise.all([runChild(script(0)), runChild(script(0))])

    const winners = [a, b].filter(r => r.result.ok)
    const losers = [a, b].filter(r => !r.result.ok)

    // 核心断言：最多一个持有者（v1 的覆盖实现会让两个都成功）
    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)
    // 失败者必须给出可解释的拒绝（InstanceLockError 或明确错误）
    expect(losers[0].result.name).toBe('InstanceLockError')
    expect(losers[0].exitCode).toBe(3)
    // 获胜者拿到了有效 token；失败者没有 token
    expect(winners[0].result.token).toMatch(/^[0-9a-f-]{36}$/)
    expect(losers[0].result.token).toBeUndefined()
  }, 20000)

  it('预置死亡 PID 后两个子进程同时接管：仍只有一个持有', async () => {
    // 陈旧锁：两个子进程都会看到它，必须通过原子隔离 + 重新 wx 决出唯一持有者
    writeFileSync(lockPath, JSON.stringify({ pid: 99999999, token: 'dead-token' }))

    const [a, b] = await Promise.all([
      runChild(childScript(lockPath, 0)),
      runChild(childScript(lockPath, 0)),
    ])

    const winners = [a, b].filter(r => r.result.ok)
    const losers = [a, b].filter(r => !r.result.ok)
    expect(winners).toHaveLength(1)
    // 陈旧接管路径同样不得双持有：失败者必须是明确的拒绝
    expect(losers).toHaveLength(1)
    expect(losers[0].result.name).toBe('InstanceLockError')
    // 隔离文件清理干净
    expect(readdirSync(dir).filter(f => f.includes('.stale-'))).toEqual([])
  }, 20000)

  it('子进程持有期间父进程拒绝获取；子进程释放后可获取', async () => {
    // 子进程拿到锁后写入"就绪"标记文件并保持持有，父进程据此在持有期内检查。
    // 不能等子进程 close：那已经是释放之后，锁文件自然不存在。
    const readyFile = join(dir, 'child-ready.json')
    const releaseFile = join(dir, 'child-release')

    const child = spawn(
      process.execPath,
      [
        '--experimental-strip-types',
        '--input-type=module',
        '-e',
        `
        const { writeFileSync, existsSync } = await import('node:fs')
        const { acquireInstanceLock } = await import(
          ${JSON.stringify(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '../../../server/utils/instance-lock.ts')).href)}
        )
        const lock = acquireInstanceLock(${JSON.stringify(lockPath)})
        writeFileSync(${JSON.stringify(readyFile)}, JSON.stringify({ pid: process.pid, token: lock.token }))
        // 轮询等待父进程发出释放信号，保持持有
        const wait = setInterval(() => {
          if (existsSync(${JSON.stringify(releaseFile)})) {
            clearInterval(wait)
            lock.release()
            process.exit(0)
          }
        }, 20)
        `,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )

    try {
      // 等子进程确认持有
      await waitForFile(readyFile)
      const childInfo = JSON.parse(readFileSync(readyFile, 'utf-8')) as { pid: number }

      // 子进程仍持有：落盘记录必须属于子进程，且父进程被拒绝
      expect(readPid(lockPath)).toBe(childInfo.pid)
      expect(() => acquireInstanceLock(lockPath)).toThrow(InstanceLockError)

      // 通知子进程释放，并等它退出
      writeFileSync(releaseFile, 'go')
      await new Promise<void>(resolve => child.on('close', () => resolve()))

      // 子进程释放后，父进程应能获取
      const parentLock = acquireInstanceLock(lockPath)
      expect(readPid(lockPath)).toBe(process.pid)
      parentLock.release()
    } finally {
      if (!child.killed) child.kill()
    }
  }, 20000)
})

/** 轮询等待文件出现（最多 timeoutMs）。 */
async function waitForFile(path: string, timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (existsSync(path)) return
    await new Promise(r => setTimeout(r, 20))
  }
  throw new Error(`等待文件超时：${path}`)
}
