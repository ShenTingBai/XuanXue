import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

/**
 * 有界请求体读取的流式回归测试。
 *
 * 关键点：超限必须在**流读取阶段**被截断，而不是整包缓冲后判定。
 * 因此测试用真实 ReadableStream 夹具逐块投递，并断言 reader.cancel 被调用，
 * 而不是把完整巨大字符串交给 mock 冒充流式保护。
 */

const mockGetHeader = vi.hoisted(() => vi.fn())
const mockGetRequestWebStream = vi.hoisted(() => vi.fn())
const mockReadRawBody = vi.hoisted(() => vi.fn())
const mockCreateError = vi.hoisted(() =>
  vi.fn((args: any) =>
    Object.assign(new Error(args?.statusMessage ?? 'error'), {
      statusCode: args?.statusCode,
      statusMessage: args?.statusMessage,
    }),
  ),
)

vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getHeader: mockGetHeader,
  getRequestWebStream: mockGetRequestWebStream,
  readRawBody: mockReadRawBody,
}))

// Nuxt 自动导入的 createError 在单元测试中不存在，按项目既有手法注入替身。
vi.hoisted(() => {
  vi.stubGlobal('createError', mockCreateError)
})

import { readBoundedRawBody } from '~/server/utils/bounded-request-body'
import { readBoundedJsonBody } from '~/server/utils/bounded-json-body'

/** 记录夹具流的读取与取消次数。 */
interface StreamProbe {
  pulls: number
  cancelled: boolean
  cancelledReason?: unknown
}

/** 按固定块大小投递字节的流，并记录 pull/cancel。 */
function makeStream(chunks: Uint8Array[], probe: StreamProbe): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      probe.pulls += 1
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(chunks[index])
      index += 1
    },
    cancel(reason) {
      probe.cancelled = true
      probe.cancelledReason = reason
    },
  })
}

/** 把文本切成固定大小的块。 */
function chunked(bytes: Uint8Array, chunkSize: number): Uint8Array[] {
  const chunks: Uint8Array[] = []
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(bytes.slice(offset, offset + chunkSize))
  }
  return chunks.length > 0 ? chunks : [new Uint8Array(0)]
}

function makeEvent(overrides: Record<string, unknown> = {}): H3Event {
  return { method: 'POST', context: {}, ...overrides } as unknown as H3Event
}

// ============================================================================
// Node Readable 夹具（v2：Node 直读路径）
// ============================================================================

/**
 * 可控的 Node 请求替身：只实现 helper 依赖的 on/off/resume 与事件派发。
 *
 * 用它驱动 Node 直读路径，并记录：
 * - `resumeCalls`：超限后是否排空剩余请求体（连接能否复用取决于此）；
 * - `listeners`：helper 是否清理了自身注册的全部监听。
 */
class FakeNodeRequest {
  resumeCalls = 0
  /** 请求体是否已读完（Node 语义）；v3 用它判定"已结束请求"。 */
  readableEnded?: boolean
  /** 整个 HTTP message 是否已完整接收。 */
  complete?: boolean
  /** 当前仍挂着的监听器，按事件名分组。 */
  readonly listeners = new Map<string, Set<(...args: unknown[]) => void>>()

  on(event: string, listener: (...args: unknown[]) => void): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener)
    return this
  }

  off(event: string, listener: (...args: unknown[]) => void): this {
    this.listeners.get(event)?.delete(listener)
    return this
  }

  resume(): this {
    this.resumeCalls += 1
    return this
  }

  emit(event: string, ...args: unknown[]): void {
    // 复制一份再派发：监听器可能在回调内被移除
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      listener(...args)
    }
  }

  /** 仍注册的监听器总数（helper 应清理到 0）。 */
  listenerCount(): number {
    let count = 0
    for (const set of this.listeners.values()) count += set.size
    return count
  }
}

/** 构造走 Node 直读路径的事件。 */
function makeNodeEvent(req: FakeNodeRequest): H3Event {
  return { method: 'POST', context: {}, node: { req } } as unknown as H3Event
}

describe('readBoundedRawBody（Node 直读与连接生命周期）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Node 正常多块：按字节累计并返回完整 UTF-8 原文', async () => {
    const req = new FakeNodeRequest()
    const text = '中文😀测试'
    const promise = readBoundedRawBody(makeNodeEvent(req), 1024)

    req.emit('data', Buffer.from(text.slice(0, 2), 'utf-8'))
    req.emit('data', Buffer.from(text.slice(2), 'utf-8'))
    req.emit('end')

    await expect(promise).resolves.toBe(text)
    expect(req.listenerCount()).toBe(0)
    expect(req.resumeCalls).toBe(0)
  })

  it('Node 恰好等于上限：放行且不排空', async () => {
    const req = new FakeNodeRequest()
    const bytes = Buffer.alloc(1024, 120)
    const promise = readBoundedRawBody(makeNodeEvent(req), 1024)

    req.emit('data', bytes)
    req.emit('end')

    await expect(promise).resolves.toHaveLength(1024)
    expect(req.resumeCalls).toBe(0)
  })

  it('Node 超限：立即 413、调用 resume 排空、清理全部自身监听、不再缓存后续数据', async () => {
    const req = new FakeNodeRequest()
    const promise = readBoundedRawBody(makeNodeEvent(req), 1000)

    req.emit('data', Buffer.alloc(600, 120))
    // 第二块使累计超过上限 → 立即拒绝
    req.emit('data', Buffer.alloc(600, 120))

    await expect(promise).rejects.toMatchObject({ statusCode: 413 })
    // 关键：必须排空剩余请求体，否则未消费数据会占住 keep-alive socket
    expect(req.resumeCalls).toBe(1)
    // 关键：helper 注册的监听必须全部移除，避免晚到事件二次 settle
    expect(req.listenerCount()).toBe(0)

    // 晚到的 data/end 不得重新缓存或二次 settle（无监听即无副作用）
    req.emit('data', Buffer.alloc(600, 120))
    req.emit('end')
    expect(req.listenerCount()).toBe(0)
  })

  it('Node 空体：返回 null', async () => {
    const req = new FakeNodeRequest()
    const promise = readBoundedRawBody(makeNodeEvent(req), 1024)

    req.emit('end')

    await expect(promise).resolves.toBeNull()
    expect(req.listenerCount()).toBe(0)
  })

  it('Node error 事件：清理监听并原样传播错误', async () => {
    const req = new FakeNodeRequest()
    const promise = readBoundedRawBody(makeNodeEvent(req), 1024)

    req.emit('error', new Error('socket reset'))

    await expect(promise).rejects.toThrow('socket reset')
    expect(req.listenerCount()).toBe(0)
    expect(req.resumeCalls).toBe(0)
  })

  it('Node aborted 事件：清理监听并拒绝', async () => {
    const req = new FakeNodeRequest()
    const promise = readBoundedRawBody(makeNodeEvent(req), 1024)

    req.emit('aborted')

    await expect(promise).rejects.toThrow('请求已中止')
    expect(req.listenerCount()).toBe(0)
  })

  it('Node 路径不经过 h3 包装流（不调用 getRequestWebStream）', async () => {
    const req = new FakeNodeRequest()
    const promise = readBoundedRawBody(makeNodeEvent(req), 1024)

    req.emit('data', Buffer.from('{}'))
    req.emit('end')
    await promise

    // Node 直读路径完全绕开包装流，因此不应触碰该导出
    expect(mockGetRequestWebStream).not.toHaveBeenCalled()
  })
})

// ============================================================================
// v3：h3 预缓冲来源与已结束请求（回归 v2 引入的兼容性缺口）
// ============================================================================

describe('readBoundedRawBody（h3 预缓冲兼容）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 预缓冲分支委托给 h3 readRawBody 转换；用替身复现其"值→Buffer"语义
    mockReadRawBody.mockImplementation(async (event: any) => {
      const value =
        event?._requestBody ??
        event?.web?.request?.body ??
        event?.node?.req?.[Symbol.for('h3RawBody')] ??
        event?.node?.req?.rawBody ??
        event?.node?.req?.body
      if (value === undefined) return undefined
      if (Buffer.isBuffer(value)) return value
      if (value?.constructor === Object) return Buffer.from(JSON.stringify(value))
      return Buffer.from(String(value))
    })
  })

  it('event._requestBody 预缓冲 Buffer：上限内返回原文', async () => {
    const req = new FakeNodeRequest()
    const event = {
      method: 'POST',
      context: {},
      node: { req },
      _requestBody: Buffer.from('{"a":1}'),
    } as unknown as H3Event

    await expect(readBoundedRawBody(event, 1024)).resolves.toBe('{"a":1}')
    // 预缓冲路径不注册 socket 监听（无 live 读取）
    expect(req.listenerCount()).toBe(0)
    expect(mockGetRequestWebStream).not.toHaveBeenCalled()
  })

  it('预缓冲对象按 h3 语义序列化为 JSON 文本', async () => {
    const req = new FakeNodeRequest()
    const event = {
      method: 'POST',
      context: {},
      node: { req },
      _requestBody: { x: 1 },
    } as unknown as H3Event

    await expect(readBoundedRawBody(event, 1024)).resolves.toBe('{"x":1}')
  })

  it('req.rawBody 预缓冲且请求已结束：仍可取到内容（不永久 pending）', async () => {
    const req = new FakeNodeRequest()
    req.readableEnded = true
    req.complete = true
    ;(req as unknown as { rawBody: Buffer }).rawBody = Buffer.from('{"b":2}')

    const event = { method: 'POST', context: {}, node: { req } } as unknown as H3Event
    await expect(readBoundedRawBody(event, 1024)).resolves.toBe('{"b":2}')
  })

  it('已结束且无任何预缓冲体：返回 null，不注册永远等不到的监听', async () => {
    const req = new FakeNodeRequest()
    req.readableEnded = true
    req.complete = true

    const event = { method: 'POST', context: {}, node: { req } } as unknown as H3Event
    await expect(readBoundedRawBody(event, 1024)).resolves.toBeNull()
    // 关键：没有注册监听（v2 会在此永久 pending）
    expect(req.listenerCount()).toBe(0)
  })

  it('预缓冲体超过上限：返回 413', async () => {
    const req = new FakeNodeRequest()
    const event = {
      method: 'POST',
      context: {},
      node: { req },
      _requestBody: Buffer.alloc(5000, 120),
    } as unknown as H3Event

    await expect(readBoundedRawBody(event, 1024)).rejects.toMatchObject({ statusCode: 413 })
  })

  it('预缓冲 ReadableStream 不被当作普通 Buffer，仍走流式受限路径', async () => {
    const probe: StreamProbe = { pulls: 0, cancelled: false }
    const stream = makeStream(chunked(new Uint8Array(4096).fill(120), 512), probe)
    const req = new FakeNodeRequest()
    const event = {
      method: 'POST',
      context: {},
      node: { req },
      _requestBody: stream,
    } as unknown as H3Event

    await expect(readBoundedRawBody(event, 1024)).rejects.toMatchObject({ statusCode: 413 })
    // 关键：流被逐块读取并取消，而不是被 readRawBody 完整收集
    expect(probe.cancelled).toBe(true)
    expect(mockReadRawBody).not.toHaveBeenCalled()
  })

  it('live Node 请求（未结束、无预缓冲）不调用 readRawBody', async () => {
    const req = new FakeNodeRequest()
    const promise = readBoundedRawBody(makeNodeEvent(req), 1024)

    req.emit('data', Buffer.from('{"live":1}'))
    req.emit('end')

    await expect(promise).resolves.toBe('{"live":1}')
    // 关键：live/chunked 路径绝不能先调用 readRawBody（否则退回完整缓冲）
    expect(mockReadRawBody).not.toHaveBeenCalled()
  })
})

// ============================================================================
// v4：空预缓冲选择与 complete/readableEnded 边界
// ============================================================================

describe('readBoundedRawBody（live 状态边界）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadRawBody.mockImplementation(async (event: any) => {
      const value = event?._requestBody
      if (!value) return undefined
      if (Buffer.isBuffer(value)) return value
      if (value?.constructor === Object) return Buffer.from(JSON.stringify(value))
      return Buffer.from(String(value))
    })
  })

  it('空字符串 _requestBody 不触发 readRawBody，live Node 数据仍被读取', async () => {
    const req = new FakeNodeRequest()
    // 空串在 h3 里不是有效预缓冲值（truthy 链），必须继续走 live 直读
    const event = {
      method: 'POST',
      context: {},
      node: { req },
      _requestBody: '',
    } as unknown as H3Event

    const promise = readBoundedRawBody(event, 1024)
    req.emit('data', Buffer.from('{"live":1}'))
    req.emit('end')

    await expect(promise).resolves.toBe('{"live":1}')
    // 关键：空预缓冲绝不能触发 readRawBody 去重新完整读取 socket
    expect(mockReadRawBody).not.toHaveBeenCalled()
  })

  it('complete=true 但 readableEnded=false：仍直读缓冲数据，不返回假 null', async () => {
    const req = new FakeNodeRequest()
    // 实测语义：HTTP message 收完（complete）时数据可能仍在 readable 缓冲区
    req.complete = true
    req.readableEnded = false

    const promise = readBoundedRawBody(makeNodeEvent(req), 1024)
    req.emit('data', Buffer.from('{"buffered":2}'))
    req.emit('end')

    await expect(promise).resolves.toBe('{"buffered":2}')
    expect(mockReadRawBody).not.toHaveBeenCalled()
  })

  it('readableEnded=true 且无预缓冲体：立即返回 null，不注册监听', async () => {
    const req = new FakeNodeRequest()
    req.readableEnded = true
    req.complete = true

    await expect(readBoundedRawBody(makeNodeEvent(req), 1024)).resolves.toBeNull()
    expect(req.listenerCount()).toBe(0)
    expect(mockReadRawBody).not.toHaveBeenCalled()
  })

  it('complete=true 且存在有效预缓冲体：优先取预缓冲值', async () => {
    const req = new FakeNodeRequest()
    req.complete = true
    const event = {
      method: 'POST',
      context: {},
      node: { req },
      _requestBody: Buffer.from('{"pre":3}'),
    } as unknown as H3Event

    await expect(readBoundedRawBody(event, 1024)).resolves.toBe('{"pre":3}')
  })
})

describe('readBoundedRawBody（流式字节上限）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('多块累计刚超过上限时返回 413 并取消流（不在超限后继续读完整包）', async () => {
    const probe: StreamProbe = { pulls: 0, cancelled: false }
    // 上限 1000，投递 4 × 512 = 2048 字节：第 2 块后即超限
    mockGetRequestWebStream.mockReturnValue(
      makeStream(chunked(new Uint8Array(2048).fill(120), 512), probe),
    )

    await expect(readBoundedRawBody(makeEvent(), 1000)).rejects.toMatchObject({ statusCode: 413 })
    expect(probe.cancelled).toBe(true)
    // 关键断言：没有把全部 4 块读完（若读完则 pulls 会到 4 或 5）
    expect(probe.pulls).toBeLessThan(4)
  })

  it('恰好等于上限的内容放行，且多字节 UTF-8 原文完整保留', async () => {
    const text = '中文😀测试' // 4 个多字节字符 + emoji，字节数远大于字符数
    const bytes = new TextEncoder().encode(text)
    const probe: StreamProbe = { pulls: 0, cancelled: false }
    mockGetRequestWebStream.mockReturnValue(makeStream(chunked(bytes, 3), probe))

    const raw = await readBoundedRawBody(makeEvent(), bytes.byteLength)
    expect(raw).toBe(text)
    expect(probe.cancelled).toBe(false)
  })

  it('空流返回 null，不产生空字符串假体', async () => {
    const probe: StreamProbe = { pulls: 0, cancelled: false }
    mockGetRequestWebStream.mockReturnValue(makeStream([], probe))

    await expect(readBoundedRawBody(makeEvent(), 100)).resolves.toBeNull()
  })

  it('底层流错误原样传播，不被伪装成 413', async () => {
    const failing = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error('socket reset'))
      },
    })
    mockGetRequestWebStream.mockReturnValue(failing)

    await expect(readBoundedRawBody(makeEvent(), 100)).rejects.toThrow('socket reset')
  })

  it('无可用请求流（合成事件）返回 null，交由调用方按空体处理', async () => {
    mockGetRequestWebStream.mockReturnValue(undefined)
    await expect(readBoundedRawBody(makeEvent(), 100)).resolves.toBeNull()
  })

  it('非请求体方法沿用 h3 的 405 断言', async () => {
    mockGetRequestWebStream.mockReturnValue(makeStream([], { pulls: 0, cancelled: false }))
    await expect(readBoundedRawBody(makeEvent({ method: 'GET' }), 100)).rejects.toMatchObject({
      statusCode: 405,
    })
  })
})

describe('readBoundedJsonBody（Content-Length 预检 + 流式兜底）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Content-Length 声明超限时在读流前拒绝（不消费请求体）', async () => {
    mockGetHeader.mockReturnValue('999999')
    mockGetRequestWebStream.mockReturnValue(
      makeStream(chunked(new TextEncoder().encode('{"a":1}'), 4), { pulls: 0, cancelled: false }),
    )

    await expect(readBoundedJsonBody(makeEvent(), 1024)).rejects.toMatchObject({ statusCode: 413 })
    // 快速失败路径：请求流根本没有被请求，更没有读取或取消
    expect(mockGetRequestWebStream).not.toHaveBeenCalled()
  })

  it('无 Content-Length 时按流式累计真实字节拒绝超限', async () => {
    const probe: StreamProbe = { pulls: 0, cancelled: false }
    mockGetHeader.mockReturnValue(undefined)
    mockGetRequestWebStream.mockReturnValue(
      makeStream(chunked(new TextEncoder().encode('x'.repeat(4096)), 256), probe),
    )

    await expect(readBoundedJsonBody(makeEvent(), 1024)).rejects.toMatchObject({ statusCode: 413 })
    expect(probe.cancelled).toBe(true)
  })

  it('上限内的合法 JSON 正常解析；顶层非对象仍返回 {}', async () => {
    mockGetHeader.mockReturnValue(undefined)
    mockGetRequestWebStream.mockReturnValue(
      makeStream(chunked(new TextEncoder().encode('{"nickname":"abc"}'), 5), {
        pulls: 0,
        cancelled: false,
      }),
    )
    await expect(readBoundedJsonBody(makeEvent(), 1024)).resolves.toEqual({ nickname: 'abc' })

    mockGetRequestWebStream.mockReturnValue(
      makeStream(chunked(new TextEncoder().encode('[1,2,3]'), 2), { pulls: 0, cancelled: false }),
    )
    await expect(readBoundedJsonBody(makeEvent(), 1024)).resolves.toEqual({})
  })

  it('非法 JSON 返回固定 400；空体返回 {}', async () => {
    mockGetHeader.mockReturnValue(undefined)
    mockGetRequestWebStream.mockReturnValue(
      makeStream(chunked(new TextEncoder().encode('not-json'), 3), { pulls: 0, cancelled: false }),
    )
    await expect(readBoundedJsonBody(makeEvent(), 1024)).rejects.toMatchObject({ statusCode: 400 })

    mockGetRequestWebStream.mockReturnValue(makeStream([], { pulls: 0, cancelled: false }))
    await expect(readBoundedJsonBody(makeEvent(), 1024)).resolves.toEqual({})
  })
})
