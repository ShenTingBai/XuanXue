/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

/**
 * `/api/result-history` 接口测试。
 *
 * 手法与 R4 的接口测试一致：hoisted mock 掉 h3 的请求读取函数与 createError，
 * 保留真实的 `ResultHistoryServiceError` 类（让错误映射的 instanceof 走真实路径），
 * 仅替换服务实例；随后动态导入端点模块。
 *
 * 覆盖：未认证 401、未授权（白名单未配置）403、体积 413、结构 400、限流 429、
 * **复算不一致 409 且不落库**、幂等重试只写一次、列表只回安全摘要、清空需 confirm、
 * 详情与单条删除的归属语义。
 *
 * 服务端复算与客户端摘要**都来自真实领域引擎**（不 mock），因此这条用例同时验证
 * "服务端不接受客户端提交的结果作为可信历史"。
 */

const mockGetHeader = vi.hoisted(() => vi.fn((): string | undefined => undefined))
const mockReadRawBody = vi.hoisted(() => vi.fn())
const mockGetRequestWebStream = vi.hoisted(() => vi.fn())
const mockGetQuery = vi.hoisted(() => vi.fn(() => ({})))
const mockGetRouterParam = vi.hoisted(() => vi.fn())
const mockCreateError = vi.hoisted(() =>
  vi.fn((args: any) =>
    Object.assign(new Error(args?.statusMessage ?? 'error'), {
      statusCode: args?.statusCode,
      statusMessage: args?.statusMessage,
      data: args?.data,
    }),
  ),
)

// 2026-09-20：请求体读取改走 getRequestWebStream 流式累计，故一并替换该导出。
vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getHeader: mockGetHeader,
  readRawBody: mockReadRawBody,
  getRequestWebStream: mockGetRequestWebStream,
  getQuery: mockGetQuery,
  getRouterParam: mockGetRouterParam,
}))

vi.hoisted(() => {
  vi.stubGlobal(
    'defineEventHandler',
    vi.fn((handler: any) => async (event: any) => handler(event)),
  )
  vi.stubGlobal('createError', mockCreateError)
})

const serviceMock = vi.hoisted(() => ({
  saveSnapshot: vi.fn(),
  listByTool: vi.fn(),
  getById: vi.fn(),
  deleteOne: vi.fn(),
  deleteByTool: vi.fn(),
  countByTool: vi.fn(),
}))

vi.mock('~/server/services/result-history', async importOriginal => {
  const actual = await importOriginal<typeof import('~/server/services/result-history')>()
  return { ...actual, resultHistoryService: serviceMock }
})

const checkRateLimitMock = vi.hoisted(() => vi.fn(() => true))
vi.mock('~/server/utils/rateLimit', () => ({ checkRateLimit: checkRateLimitMock }))

const mockAssertSameOrigin = vi.hoisted(() => vi.fn())
vi.mock('~/server/utils/request-origin', () => ({
  assertSameOriginMutation: mockAssertSameOrigin,
}))

import { ResultHistoryServiceError } from '~/server/services/result-history'
import { calculateBazi, resultDigest } from '~/utils/bazi/engine'
import type { BaziRawDate } from '~/types/bazi'

const ACCOUNT_ID = 7
const RAW: BaziRawDate = { calendar: 'solar', year: 2026, month: 9, day: 14, isLeapMonth: null }
const AS_OF = '2026-09-14'

const ENV_KEY = 'XUANXUE_INTERNAL_TOOLS'
const originalEnv = process.env[ENV_KEY]

/** 真实引擎产出的结果摘要（含五行字段，服务端解析时只取干支）。 */
function realDigest() {
  const outcome = calculateBazi({ raw: RAW, asOfDate: AS_OF })
  if (outcome.state.phase !== 'success' || !outcome.result) throw new Error('engine failed')
  return resultDigest(outcome.result)
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    toolId: 'bazi',
    resultId: 'result-1',
    asOfDate: AS_OF,
    originalInput: RAW,
    inputOrigin: 'manual',
    clientDigest: realDigest(),
    ...overrides,
  }
}

function authorizedEvent(method: string = 'POST'): H3Event {
  return { context: { accountId: ACCOUNT_ID }, method } as unknown as H3Event
}

let postHandler: any
let listHandler: any
let clearHandler: any
let detailHandler: any
let deleteHandler: any

/** 记录超限时 reader.cancel() 是否被调用。 */
const streamCancel = { called: false }

/**
 * 由 `mockReadRawBody` 提供文本、按 256 字节分块投递的流。
 * `getRequestWebStream` 在生产端是同步函数，mock 必须同步返回流对象。
 */
function deferredRawTextStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const raw = await mockReadRawBody()
      const bytes = new TextEncoder().encode(raw ?? '')
      for (let offset = 0; offset < bytes.length; offset += 256) {
        controller.enqueue(bytes.slice(offset, offset + 256))
      }
      controller.close()
    },
    cancel() {
      streamCancel.called = true
    },
  })
}

/** 无 Content-Length 的 chunked 超限流：不依赖单个巨大字符串。 */
function oversizedChunkedStream(totalBytes: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const chunk = new TextEncoder().encode('x'.repeat(512))
      for (let sent = 0; sent < totalBytes; sent += chunk.byteLength) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
    cancel() {
      streamCancel.called = true
    },
  })
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  streamCancel.called = false
  mockGetHeader.mockReturnValue(undefined)
  mockGetQuery.mockReturnValue({})
  mockGetRouterParam.mockReturnValue(undefined)
  mockGetRequestWebStream.mockImplementation(() => deferredRawTextStream())
  checkRateLimitMock.mockReturnValue(true)
  process.env[ENV_KEY] = `bazi:${ACCOUNT_ID}`
  mockAssertSameOrigin.mockReturnValue(undefined as never)

  postHandler = (await import('~/server/api/result-history/index.post')).default
  listHandler = (await import('~/server/api/result-history/index.get')).default
  clearHandler = (await import('~/server/api/result-history/index.delete')).default
  detailHandler = (await import('~/server/api/result-history/[id].get')).default
  deleteHandler = (await import('~/server/api/result-history/[id].delete')).default
})

afterEach(() => {
  if (originalEnv === undefined) delete process.env[ENV_KEY]
  else process.env[ENV_KEY] = originalEnv
})

describe('POST /api/result-history', () => {
  it('未认证返回 401 且不写库', async () => {
    mockReadRawBody.mockResolvedValue(JSON.stringify(validBody()))
    await expect(postHandler({ context: {} })).rejects.toMatchObject({ statusCode: 401 })
    expect(serviceMock.saveSnapshot).not.toHaveBeenCalled()
  })

  it('白名单未配置时即使已登录也返回 403（客户端判定不是安全边界）', async () => {
    delete process.env[ENV_KEY]
    mockReadRawBody.mockResolvedValue(JSON.stringify(validBody()))
    await expect(postHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 403 })
    expect(serviceMock.saveSnapshot).not.toHaveBeenCalled()
  })

  it('请求体超过上限返回 413', async () => {
    mockGetHeader.mockReturnValue(String(8192 + 1))
    mockReadRawBody.mockResolvedValue('{}')
    await expect(postHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 413 })
  })

  it('无 Content-Length 的 chunked 超限在流读取阶段被截断并取消流，且不调用服务层', async () => {
    // 真实读取器路径：累计超限必须立即 cancel 流，而不是先缓冲完整 body 再判定。
    mockGetRequestWebStream.mockReturnValue(oversizedChunkedStream(64 * 1024))
    await expect(postHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 413 })
    expect(streamCancel.called).toBe(true)
    expect(serviceMock.saveSnapshot).not.toHaveBeenCalled()
  })

  it('结构非法返回 400（额外字段、toolId 非 bazi、摘要形状错误）', async () => {
    for (const body of [
      { ...validBody(), accountId: 99 },
      validBody({ toolId: 'zeji' }),
      validBody({ clientDigest: { solarDate: '2026-09-14', successQualifier: 'partial' } }),
      validBody({ originalInput: { ...RAW, extra: 1 } }),
    ]) {
      mockReadRawBody.mockResolvedValue(JSON.stringify(body))
      await expect(postHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 400 })
    }
    expect(serviceMock.saveSnapshot).not.toHaveBeenCalled()
  })

  it('限流命中返回 429 且不写库', async () => {
    checkRateLimitMock.mockReturnValue(false)
    mockReadRawBody.mockResolvedValue(JSON.stringify(validBody()))
    await expect(postHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 429 })
    expect(serviceMock.saveSnapshot).not.toHaveBeenCalled()
  })

  it('复算不一致返回 409 且**不落库**', async () => {
    const tampered = realDigest()
    tampered.dayPillar = { ...tampered.dayPillar, branch: '子' }
    mockReadRawBody.mockResolvedValue(JSON.stringify(validBody({ clientDigest: tampered })))
    await expect(postHandler(authorizedEvent())).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'RESULT_MISMATCH' },
    })
    expect(serviceMock.saveSnapshot).not.toHaveBeenCalled()
  })

  it('成功保存时用服务端复算结果写入，并返回 created 标记', async () => {
    serviceMock.saveSnapshot.mockReturnValue({
      created: true,
      record: { recordId: 'rec-1', resultId: 'result-1', savedAt: '2026-09-14T12:00:00.000Z' },
    })
    mockReadRawBody.mockResolvedValue(JSON.stringify(validBody()))

    const result = await postHandler(authorizedEvent())
    expect(result).toMatchObject({ recordId: 'rec-1', resultId: 'result-1', created: true })

    const arg = serviceMock.saveSnapshot.mock.calls[0][0]
    expect(arg.accountId).toBe(ACCOUNT_ID)
    expect(arg.toolId).toBe('bazi')
    expect(arg.inputOrigin).toBe('manual')
    // 写入的是服务端复算结果，而不是客户端摘要。
    expect(arg.resultSnapshot.dayPillar.stem).toBe(realDigest().dayPillar.stem)
    expect(arg.successQualifier).toBe('partial')
  })

  it('幂等重试（同一 resultId）第二次返回 created=false', async () => {
    serviceMock.saveSnapshot
      .mockReturnValueOnce({
        created: true,
        record: { recordId: 'rec-1', resultId: 'result-1', savedAt: 't1' },
      })
      .mockReturnValueOnce({
        created: false,
        record: { recordId: 'rec-1', resultId: 'result-1', savedAt: 't1' },
      })
    mockReadRawBody.mockResolvedValue(JSON.stringify(validBody()))

    const first = await postHandler(authorizedEvent())
    const second = await postHandler(authorizedEvent())
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.recordId).toBe('rec-1')
  })

  it('服务层失败映射为固定错误，不回显正文', async () => {
    serviceMock.saveSnapshot.mockImplementation(() => {
      throw new ResultHistoryServiceError('SAVE_FAILED')
    })
    mockReadRawBody.mockResolvedValue(JSON.stringify(validBody()))
    await expect(postHandler(authorizedEvent())).rejects.toMatchObject({
      statusCode: 500,
      data: { code: 'SAVE_FAILED' },
    })
  })
})

describe('GET /api/result-history', () => {
  it('未认证 401；tool 非 bazi 返回 400', async () => {
    await expect(listHandler({ context: {} })).rejects.toMatchObject({ statusCode: 401 })
    mockGetQuery.mockReturnValue({ tool: 'zeji' })
    await expect(listHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 400 })
  })

  it('返回服务层给出的安全摘要，且传递 limit', async () => {
    mockGetQuery.mockReturnValue({ tool: 'bazi', limit: '5' })
    serviceMock.listByTool.mockReturnValue([
      { recordId: 'rec-1', displayNamePrefix: '八字基础排盘' },
    ])
    const result = await listHandler(authorizedEvent())
    expect(result.items).toHaveLength(1)
    expect(serviceMock.listByTool).toHaveBeenCalledWith(ACCOUNT_ID, 'bazi', 5)
  })

  it('limit 越界返回 400', async () => {
    mockGetQuery.mockReturnValue({ tool: 'bazi', limit: '999' })
    await expect(listHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('DELETE /api/result-history（清空）', () => {
  it('缺少 confirm 返回 400', async () => {
    mockGetQuery.mockReturnValue({ tool: 'bazi' })
    await expect(clearHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 400 })
    expect(serviceMock.deleteByTool).not.toHaveBeenCalled()
  })

  it('confirm 与实际条数不符返回 409，不删除', async () => {
    mockGetQuery.mockReturnValue({ tool: 'bazi', confirm: '3' })
    serviceMock.countByTool.mockReturnValue(5)
    await expect(clearHandler(authorizedEvent())).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'COUNT_MISMATCH' },
    })
    expect(serviceMock.deleteByTool).not.toHaveBeenCalled()
  })

  it('confirm 一致时执行清空并返回行数', async () => {
    mockGetQuery.mockReturnValue({ tool: 'bazi', confirm: '2' })
    serviceMock.countByTool.mockReturnValue(2)
    serviceMock.deleteByTool.mockReturnValue(2)
    await expect(clearHandler(authorizedEvent())).resolves.toEqual({ deleted: 2 })
  })
})

describe('GET/DELETE /api/result-history/[id]', () => {
  const RECORD_ID = '1f0f2a3c-0000-4000-8000-000000000000'

  it('id 形状非法返回 400', async () => {
    mockGetRouterParam.mockReturnValue('not-an-id')
    await expect(detailHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 400 })
    await expect(deleteHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 400 })
  })

  it('详情未命中（不存在或非本人）返回 403 且不含内容', async () => {
    mockGetRouterParam.mockReturnValue(RECORD_ID)
    serviceMock.getById.mockReturnValue(null)
    await expect(detailHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 403 })
  })

  it('详情命中返回完整快照', async () => {
    mockGetRouterParam.mockReturnValue(RECORD_ID)
    serviceMock.getById.mockReturnValue({ recordId: RECORD_ID, resultId: 'result-1' })
    await expect(detailHandler(authorizedEvent())).resolves.toMatchObject({
      record: { recordId: RECORD_ID },
    })
    expect(serviceMock.getById).toHaveBeenCalledWith(ACCOUNT_ID, RECORD_ID)
  })

  it('单条删除：未命中 404，命中返回行数', async () => {
    mockGetRouterParam.mockReturnValue(RECORD_ID)
    serviceMock.deleteOne.mockReturnValue(0)
    await expect(deleteHandler(authorizedEvent())).rejects.toMatchObject({ statusCode: 404 })

    serviceMock.deleteOne.mockReturnValue(1)
    await expect(deleteHandler(authorizedEvent())).resolves.toEqual({ deleted: 1 })
  })
})
