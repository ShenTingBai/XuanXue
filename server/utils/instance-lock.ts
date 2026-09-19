/**
 * 单实例文件锁（2026-09-15）。
 *
 * 背景：sql.js 把整个数据库放在进程内存里，`saveFile()` 每 5 秒整文件覆盖写。
 * 两个进程同时运行时各自持内存副本、互相覆盖，**后写者会抹掉前者的全部写入**。
 * 这是确定性的数据丢失，不是概率问题，因此必须显式拒绝启动第二个实例。
 *
 * 锁文件内容为持有者 PID；若锁文件存在但该进程已不存在（崩溃残留），则接管，
 * 避免一次异常退出就永久锁死。
 *
 * @author LiXinwen
 */

import fs from 'node:fs'
import path from 'node:path'

export interface InstanceLock {
  /** 锁文件绝对路径。 */
  path: string
  /** 释放锁：只删除仍属于本进程的锁文件，幂等。 */
  release(): void
}

/** 数据库已被其他存活进程占用。 */
export class InstanceLockError extends Error {
  readonly lockPath: string
  readonly holderPid: number

  constructor(lockPath: string, holderPid: number) {
    super(`数据库已被进程 ${holderPid} 占用，拒绝启动第二个实例（锁文件：${lockPath}）`)
    this.name = 'InstanceLockError'
    this.lockPath = lockPath
    this.holderPid = holderPid
  }
}

/**
 * 进程是否存活。
 * signal 0 只做存在性与权限检查，不实际发送信号。
 * EPERM 表示进程存在但当前用户无权限 —— 仍算存活，不能接管。
 */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException)?.code === 'EPERM'
  }
}

/** 读取锁文件中的持有者 PID；缺失、损坏或格式不符返回 null。 */
function readHolderPid(lockPath: string): number | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(lockPath, 'utf-8'))
    if (typeof parsed !== 'object' || parsed === null) return null
    const pid = (parsed as { pid?: unknown }).pid
    return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

function writeLock(lockPath: string, fd?: number): void {
  const payload = JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })
  if (fd === undefined) {
    fs.writeFileSync(lockPath, payload)
    return
  }
  fs.writeSync(fd, payload)
}

/**
 * 获取单实例锁。已被存活的其他进程持有时抛出 InstanceLockError。
 *
 * 用 `wx` 打开做原子创建：两个进程同时判定"无锁"时只有一个能创建成功，
 * 失败者再读一次锁文件判定存活，避免竞态双写。
 */
export function acquireInstanceLock(lockPath: string): InstanceLock {
  const absolute = path.resolve(lockPath)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })

  const existingPid = fs.existsSync(absolute) ? readHolderPid(absolute) : null
  if (existingPid !== null && existingPid !== process.pid && isProcessAlive(existingPid)) {
    throw new InstanceLockError(absolute, existingPid)
  }

  try {
    const fd = fs.openSync(absolute, 'wx')
    try {
      writeLock(absolute, fd)
    } finally {
      fs.closeSync(fd)
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== 'EEXIST') throw err
    // 竞态窗口：检查时不存在，此刻已被创建 —— 重新判定持有者。
    const holderPid = readHolderPid(absolute)
    if (holderPid !== null && holderPid !== process.pid && isProcessAlive(holderPid)) {
      throw new InstanceLockError(absolute, holderPid)
    }
    // 陈旧锁（持有进程已消失或文件损坏）：接管。
    writeLock(absolute)
  }

  let released = false
  return {
    path: absolute,
    release(): void {
      if (released) return
      released = true
      try {
        // 只删除仍属于自己的锁：若锁已被新持有者接管，不得误删。
        if (readHolderPid(absolute) === process.pid) fs.unlinkSync(absolute)
      } catch {
        // 释放失败不阻塞退出流程
      }
    },
  }
}
