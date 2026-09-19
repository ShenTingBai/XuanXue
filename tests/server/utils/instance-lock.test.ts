import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  acquireInstanceLock,
  isProcessAlive,
  InstanceLockError,
} from '~/server/utils/instance-lock'

// 单实例锁的正确性：
// sql.js 每 5 秒整文件覆盖写，两个实例会互相抹掉写入 —— 必须拒绝第二个实例。
let dir: string
let lockPath: string

function readPid(path: string): number | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'))
    return typeof parsed === 'object' && parsed !== null
      ? ((parsed as { pid?: number }).pid ?? null)
      : null
  } catch {
    return null
  }
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
  it('无锁文件时创建锁并写入本进程 PID', () => {
    const lock = acquireInstanceLock(lockPath)
    expect(existsSync(lockPath)).toBe(true)
    expect(readPid(lockPath)).toBe(process.pid)
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
    writeFileSync(lockPath, JSON.stringify({ pid: 99999999 }))
    const lock = acquireInstanceLock(lockPath)
    expect(readPid(lockPath)).toBe(process.pid)
    lock.release()
  })

  it('锁由存活的其他进程持有时拒绝获取', () => {
    const otherPid = process.ppid
    // 若运行环境无法提供另一个存活进程，则该断言不适用（跳过而非假通过）。
    if (otherPid === process.pid || !isProcessAlive(otherPid)) return
    writeFileSync(lockPath, JSON.stringify({ pid: otherPid }))
    expect(() => acquireInstanceLock(lockPath)).toThrow(InstanceLockError)
  })

  it('拒绝时携带锁路径与持有者 PID，便于运维定位', () => {
    const otherPid = process.ppid
    if (otherPid === process.pid || !isProcessAlive(otherPid)) return
    writeFileSync(lockPath, JSON.stringify({ pid: otherPid }))
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
    writeFileSync(lockPath, JSON.stringify({ pid: 99999999 }))
    lock.release()
    expect(existsSync(lockPath)).toBe(true)
    expect(readPid(lockPath)).toBe(99999999)
  })

  it('递归创建锁文件所在目录', () => {
    const nested = join(dir, 'a', 'b', 'xuanxue.db.lock')
    const lock = acquireInstanceLock(nested)
    expect(existsSync(nested)).toBe(true)
    lock.release()
  })
})
