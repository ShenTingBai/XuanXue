/**
 * 单实例文件锁（2026-09-15；2026-09-21 原子接管与 token 身份）。
 *
 * 背景：sql.js 把整个数据库放在进程内存里，`saveFile()` 每 5 秒整文件覆盖写。
 * 两个进程同时运行时各自持内存副本、互相覆盖，**后写者会抹掉前者的全部写入**。
 * 这是确定性的数据丢失，不是概率问题，因此必须显式拒绝启动第二个实例。
 *
 * 锁记录为 `{ pid, token, startedAt }`：
 * - **pid** 用于判断持有者是否仍存活；
 * - **token**（随机 UUID）用于区分同一 PID 的不同持有代际。仅凭 PID 无法区分
 *   "同一进程上一次持锁"与"当前持锁"，旧 handle 的 release 会误删新持有者的锁。
 *
 * 陈旧锁接管必须**原子**：先把原锁文件 `rename` 到一个唯一临时名（隔离），
 * 再回到 `open('wx')` 重新竞争创建。绝不能直接 `writeFileSync` 覆盖原路径——
 * 那会让两个同时判定"陈旧"的进程都写入成功，形成**双持有者**（实测复现）。
 *
 * @author LiXinwen
 */

import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export interface InstanceLock {
  /** 锁文件绝对路径。 */
  path: string
  /** 本次持有的随机 token，用于身份匹配与运维诊断。 */
  token: string
  /** 释放锁：只删除仍属于本进程**且 token 匹配**的锁文件，幂等。 */
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

/** 锁文件记录结构。 */
interface LockRecord {
  pid: number
  token: string
  startedAt: string
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

/**
 * 读取锁记录；缺失、损坏或格式不符返回 null。
 * 只有 pid 与 token 都是合法值才算有效记录（缺 token 的旧格式视为损坏，走陈旧接管）。
 */
function readLockRecord(lockPath: string): LockRecord | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(lockPath, 'utf-8'))
    if (typeof parsed !== 'object' || parsed === null) return null
    const { pid, token, startedAt } = parsed as Partial<LockRecord>
    if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) return null
    if (typeof token !== 'string' || token.length === 0) return null
    return {
      pid,
      token,
      startedAt: typeof startedAt === 'string' ? startedAt : '',
    }
  } catch {
    return null
  }
}

/** 写入锁记录（调用方保证已通过 `wx` 独占持有该路径）。 */
function writeLock(fd: number, record: LockRecord): void {
  fs.writeSync(fd, JSON.stringify(record))
}

/**
 * 原子隔离陈旧锁：把原锁文件 rename 到同目录唯一临时名。
 *
 * 为什么必须原子：若直接覆盖原路径，两个同时判定"陈旧"的进程会双双写入成功
 * （实测复现双持有者）。rename 是文件系统原子操作，只有一个进程能把该文件
 * 移走，另一个会因 ENOENT 失败，从而被迫重新走 `wx` 竞争。
 *
 * 隔离文件随后立即删除；失败路径也保证清理，不在锁目录留下垃圾。
 */
function isolateStaleLock(lockPath: string): void {
  const quarantined = `${lockPath}.stale-${process.pid}-${randomUUID()}`
  try {
    fs.renameSync(lockPath, quarantined)
  } catch (err) {
    // 已被别的进程移走/接管：让调用方重新走 wx 竞争即可，不算失败。
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return
    throw err
  }
  try {
    fs.unlinkSync(quarantined)
  } catch {
    // 隔离文件清理失败不阻塞接管；它带唯一后缀，不会与后续锁路径冲突
  }
}

/** 单次尝试创建锁文件；成功返回 token，EEXIST 返回 null。 */
function tryCreateLock(lockPath: string): string | null {
  const token = randomUUID()
  let fd: number
  try {
    fd = fs.openSync(lockPath, 'wx')
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'EEXIST') return null
    throw err
  }
  try {
    writeLock(fd, { pid: process.pid, token, startedAt: new Date().toISOString() })
  } finally {
    fs.closeSync(fd)
  }
  return token
}

/**
 * 获取单实例锁。已被存活的其他进程持有时抛出 InstanceLockError。
 *
 * 流程：
 * 1. 尝试 `wx` 原子创建（两进程同时判定"无锁"时只有一个能成功）；
 * 2. EEXIST 后读取记录：
 *    - 存活的其他 PID → 立即抛 InstanceLockError；
 *    - 死亡 PID 或损坏锁 → 原子隔离后回到第 1 步重新竞争；
 * 3. 反复失败（极端竞争）时按上限重试，最终抛 InstanceLockError。
 */
export function acquireInstanceLock(lockPath: string): InstanceLock {
  const absolute = path.resolve(lockPath)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })

  // 竞争可能持续若干轮（隔离后又被别人抢到），设上限避免无限循环。
  const MAX_ATTEMPTS = 8

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const token = tryCreateLock(absolute)
    if (token !== null) return createLockHandle(absolute, token)

    // 路径已被占用：读取当前持有者
    const record = readLockRecord(absolute)
    if (record === null) {
      // 损坏/空锁或写入进行中：短暂让出后重读一次，避免覆盖"刚创建尚未写完"的锁。
      if (waitAndRecheck(absolute)) continue
      isolateStaleLock(absolute)
      continue
    }
    if (record.pid !== process.pid && isProcessAlive(record.pid)) {
      throw new InstanceLockError(absolute, record.pid)
    }
    // 同 PID（本进程的上一代锁）或已死亡 PID：视为陈旧，原子隔离后重试
    isolateStaleLock(absolute)
  }

  // 极端竞争下仍无法取得：按占用报错，交由上层决策
  throw new InstanceLockError(absolute, readLockRecord(absolute)?.pid ?? 0)
}

/**
 * 损坏锁的宽限重读：等待极短时间后重读，确认它确实是陈旧而非"正在写入"。
 * 返回 true 表示重读拿到了有效记录（调用方应重新判定持有者）。
 */
function waitAndRecheck(lockPath: string): boolean {
  const deadline = Date.now() + 20
  // 同步忙等极短窗口：此处处于同步获取路径，不接受异步改造
  while (Date.now() < deadline) {
    if (readLockRecord(lockPath) !== null) return true
  }
  return false
}

/** 构造锁句柄；release 要求 pid 与 token 双重匹配。 */
function createLockHandle(absolute: string, token: string): InstanceLock {
  let released = false
  return {
    path: absolute,
    token,
    release(): void {
      if (released) return
      released = true
      try {
        // 双重身份匹配：仅 PID 相同不足以证明是本代锁（同 PID 可能已换代）。
        const record = readLockRecord(absolute)
        if (record !== null && record.pid === process.pid && record.token === token) {
          fs.unlinkSync(absolute)
        }
      } catch {
        // 释放失败不阻塞退出流程
      }
    },
  }
}
