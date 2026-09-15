/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// ============================================================================
// Hoisted mock factories — run before any imports
// ============================================================================

const mockGetHeader = vi.hoisted(() => vi.fn())
const mockReadRawBody = vi.hoisted(() => vi.fn())
const mockAssertSameOrigin = vi.hoisted(() => vi.fn())
vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getHeader: mockGetHeader,
  readRawBody: mockReadRawBody,
}))
// createError 替身返回带状态/数据的 Error（真实 h3 语义：调用方自行 throw）。
const mockCreateErrorFn = vi.hoisted(() =>
  vi.fn((args: any) =>
    Object.assign(new Error(args?.statusMessage ?? 'error'), {
      statusCode: args?.statusCode,
      statusMessage: args?.statusMessage,
      data: args?.data,
    }),
  ),
)

vi.hoisted(() => {
  vi.stubGlobal(
    'defineEventHandler',
    vi.fn((handler: any) => async (event: any) => handler(event)),
  )
  vi.stubGlobal('getHeader', mockGetHeader)
  vi.stubGlobal('readRawBody', mockReadRawBody)
  vi.stubGlobal('createError', mockCreateErrorFn)
})

// 服务 spy：明确 assert 未授权/超限/非法对象不调用写服务。
const serviceMock = vi.hoisted(() => ({
  get: vi.fn(),
  summary: vi.fn(),
  // R5：删除档案前需查询"仍含出生输入的历史条数"（默认 0 → 不要求 historyMode）。
  countHistoryWithBirthInput: vi.fn(() => 0),
  save: vi.fn(),
  deleteBirthDate: vi.fn(),
  deleteProfile: vi.fn(),
  setUsage: vi.fn(),
}))

// partial mock：保留真实 SelfProfileServiceError 类，仅替换 selfProfileService 实例，
// 使真实边界（self-profile-request 的 instanceof 检查）与生产行为一致。
vi.mock('~/server/services/self-profile', async importOriginal => {
  const actual = await importOriginal<typeof import('~/server/services/self-profile')>()
  return { ...actual, selfProfileService: serviceMock }
})

vi.mock('~/server/utils/request-origin', () => ({
  assertSameOriginMutation: mockAssertSameOrigin,
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { assertSameOriginMutation } from '~/server/utils/request-origin'
import { SelfProfileServiceError } from '~/server/services/self-profile'
import { SELF_PROFILE_POLICY_VERSION } from '~/constants/self-profile-policy'

/** 构造真实领域错误（instanceof 满足生产边界检查）。 */
function makeServiceError(
  code:
    | 'INVALID_INPUT'
    | 'UNDERAGE'
    | 'UNSUPPORTED_DATE'
    | 'VERSION_CONFLICT'
    | 'CONSENT_REQUIRED'
    | 'UNAUTHENTICATED'
    | 'SAVE_FAILED',
  field?: string,
): SelfProfileServiceError {
  const err = new SelfProfileServiceError(code, code, field)
  return err
}

function makeEvent(overrides: Record<string, unknown> = {}): H3Event {
  return { context: {}, method: 'GET', ...overrides } as H3Event
}

const validSolarBirth = { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null }
const validSaveBody = {
  expected: null,
  birthDate: validSolarBirth,
  consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION },
}

describe('R4 /api/self-profile 接口', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockAssertSameOrigin.mockImplementation(() => {})
    mockGetHeader.mockImplementation((_e: any, name: string) => {
      if (name?.toLowerCase() === 'content-length') return '100'
      return undefined
    })
    mockReadRawBody.mockResolvedValue(JSON.stringify(validSaveBody))
    serviceMock.get.mockReturnValue({
      id: 'p1',
      accountId: 1,
      version: 1,
      birthDate: null,
      useAllowed: true,
      createdAt: '',
      updatedAt: '',
    })
    serviceMock.summary.mockReturnValue({
      exists: false,
      profileId: null,
      version: null,
      hasBirthDate: false,
      canImport: false,
    })
    serviceMock.save.mockReturnValue({
      id: 'p1',
      accountId: 1,
      version: 1,
      birthDate: null,
      useAllowed: true,
      createdAt: '',
      updatedAt: '',
    })
    serviceMock.deleteBirthDate.mockReturnValue({
      id: 'p1',
      accountId: 1,
      version: 2,
      birthDate: null,
      useAllowed: false,
      createdAt: '',
      updatedAt: '',
    })
    serviceMock.deleteProfile.mockReturnValue({ success: true })
    serviceMock.setUsage.mockReturnValue({
      id: 'p1',
      accountId: 1,
      version: 2,
      birthDate: null,
      useAllowed: false,
      createdAt: '',
      updatedAt: '',
    })
  })

  describe('GET /api/self-profile', () => {
    let handler: (...args: any[]) => any
    beforeEach(async () => {
      handler = (await import('~/server/api/self-profile/index.get')).default
    })

    it('仅当前账号返回 { profile }', async () => {
      const result = await handler(makeEvent({ context: { accountId: 3 } }))
      expect(result).toHaveProperty('profile')
      expect(serviceMock.get).toHaveBeenCalledWith(3)
      expect(result.profile).not.toHaveProperty('credential_hash')
    })

    it('无 accountId 返回 401', async () => {
      await expect(handler(makeEvent({ context: {} }))).rejects.toMatchObject({ statusCode: 401 })
    })

    it('不接受客户端 accountId/profile 路径 id 参数', async () => {
      await handler(makeEvent({ context: { accountId: 3 } }))
      expect(serviceMock.get).toHaveBeenCalledWith(3)
      expect(serviceMock.get).not.toHaveBeenCalledWith(999)
    })
  })

  describe('GET /api/self-profile/summary', () => {
    let handler: (...args: any[]) => any
    beforeEach(async () => {
      handler = (await import('~/server/api/self-profile/summary.get')).default
    })

    it('返回无出生值的 summary', async () => {
      const result = await handler(makeEvent({ context: { accountId: 3 } }))
      expect(result).toHaveProperty('summary')
      const body = JSON.stringify(result)
      expect(body).not.toContain('solarDate')
      expect(body).not.toContain('birthDate')
    })

    it('无 accountId 返回 401', async () => {
      await expect(handler(makeEvent({ context: {} }))).rejects.toMatchObject({ statusCode: 401 })
    })
  })

  describe('PUT /api/self-profile', () => {
    let handler: (...args: any[]) => any
    beforeEach(async () => {
      handler = (await import('~/server/api/self-profile/index.put')).default
    })

    it('先同源校验再保存并返回 { profile }', async () => {
      const result = await handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' }))
      expect(assertSameOriginMutation).toHaveBeenCalled()
      expect(serviceMock.save).toHaveBeenCalledWith(3, expect.objectContaining({ expected: null }))
      expect(result).toHaveProperty('profile')
    })

    it('匿名 401 且不调用写服务', async () => {
      await expect(handler(makeEvent({ context: {}, method: 'PUT' }))).rejects.toMatchObject({
        statusCode: 401,
      })
      expect(serviceMock.save).not.toHaveBeenCalled()
    })

    it('跨源 403 且不调用写服务', async () => {
      mockAssertSameOrigin.mockImplementation(() => {
        throw Object.assign(new Error('请求来源无效'), { statusCode: 403 })
      })
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })),
      ).rejects.toMatchObject({ statusCode: 403 })
      expect(serviceMock.save).not.toHaveBeenCalled()
    })

    it('未知字段/伪造 accountId 400 且不调用写服务', async () => {
      mockReadRawBody.mockResolvedValue(JSON.stringify({ ...validSaveBody, accountId: 999 }))
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })),
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(serviceMock.save).not.toHaveBeenCalled()
    })

    it('实际 body 超 4KB 即使无 Content-Length 仍 413', async () => {
      mockGetHeader.mockReturnValue(undefined)
      mockReadRawBody.mockResolvedValue(JSON.stringify({ big: 'x'.repeat(5000) }))
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })),
      ).rejects.toMatchObject({ statusCode: 413 })
      expect(serviceMock.save).not.toHaveBeenCalled()
    })

    it('非法日期 400 且不调用写服务', async () => {
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({
          expected: null,
          birthDate: { calendar: 'solar', year: '2000', month: 1, day: 1, isLeapMonth: null },
          consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION },
        }),
      )
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })),
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(serviceMock.save).not.toHaveBeenCalled()
    })

    it('consent 含未知字段 400 且不调用写服务', async () => {
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({
          expected: null,
          birthDate: validSolarBirth,
          consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION, nickname: 'hack' },
        }),
      )
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })),
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(serviceMock.save).not.toHaveBeenCalled()
    })

    it('缺 expected 400 且不调用写服务', async () => {
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({
          birthDate: validSolarBirth,
          consent: { accepted: true, policyVersion: SELF_PROFILE_POLICY_VERSION },
        }),
      )
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })),
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(serviceMock.save).not.toHaveBeenCalled()
    })

    it('未成年 403（真实 SelfProfileServiceError 映射）', async () => {
      serviceMock.save.mockImplementation(() => {
        throw makeServiceError('UNDERAGE')
      })
      const err: any = await handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })).catch(
        (e: any) => e,
      )
      expect(err.statusCode).toBe(403)
      expect(err.data).toEqual({ code: 'UNDERAGE' })
    })

    it('旧版本 409（真实 SelfProfileServiceError 映射，data.code=VERSION_CONFLICT）', async () => {
      serviceMock.save.mockImplementation(() => {
        throw makeServiceError('VERSION_CONFLICT')
      })
      const err: any = await handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })).catch(
        (e: any) => e,
      )
      expect(err.statusCode).toBe(409)
      expect(err.data).toEqual({ code: 'VERSION_CONFLICT' })
    })

    it('事务失败 500 且不泄露日期', async () => {
      serviceMock.save.mockImplementation(() => {
        throw new Error('db boom')
      })
      const err: any = await handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' })).catch(
        (e: any) => e,
      )
      expect(err.statusCode).toBe(500)
      expect(String(err.message)).not.toContain('2000-01-01')
    })

    it('成功 DTO 白名单：不返回账号内部字段', async () => {
      serviceMock.save.mockReturnValue({
        id: 'p1',
        accountId: 3,
        version: 1,
        birthDate: {
          raw: validSolarBirth,
          solarDate: '2000-01-01',
          conversionVersion: 'v',
          confirmedAt: 't',
        },
        useAllowed: true,
        createdAt: '',
        updatedAt: '',
      })
      const result = await handler(makeEvent({ context: { accountId: 3 }, method: 'PUT' }))
      const body = JSON.stringify(result)
      expect(body).not.toContain('credential_hash')
      expect(body).not.toContain('nickname')
    })
  })

  describe('DELETE /api/self-profile/birth-date', () => {
    let handler: (...args: any[]) => any
    beforeEach(async () => {
      handler = (await import('~/server/api/self-profile/birth-date.delete')).default
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({ expected: { profileId: 'p1', version: 1 } }),
      )
    })

    it('先同源校验再删除并返回保留 id 的 {profile}', async () => {
      const result = await handler(makeEvent({ context: { accountId: 3 }, method: 'DELETE' }))
      expect(assertSameOriginMutation).toHaveBeenCalled()
      expect(serviceMock.deleteBirthDate).toHaveBeenCalledWith(3, { profileId: 'p1', version: 1 })
      expect(result.profile.birthDate).toBeNull()
    })

    it('无 expected 400 且不调用写服务', async () => {
      mockReadRawBody.mockResolvedValue(JSON.stringify({}))
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'DELETE' })),
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(serviceMock.deleteBirthDate).not.toHaveBeenCalled()
    })

    it('匿名 401', async () => {
      await expect(handler(makeEvent({ context: {}, method: 'DELETE' }))).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })

  describe('DELETE /api/self-profile', () => {
    let handler: (...args: any[]) => any
    beforeEach(async () => {
      handler = (await import('~/server/api/self-profile/index.delete')).default
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({ expected: { profileId: 'p1', version: 1 } }),
      )
    })

    it('删除整档返回 { success: true }', async () => {
      const result = await handler(makeEvent({ context: { accountId: 3 }, method: 'DELETE' }))
      expect(result).toEqual({ success: true })
      expect(serviceMock.deleteProfile).toHaveBeenCalledWith(3, { profileId: 'p1', version: 1 })
    })

    it('不提供删除账号或旧历史的额外参数', async () => {
      await handler(makeEvent({ context: { accountId: 3 }, method: 'DELETE' }))
      const calls = serviceMock.deleteProfile.mock.calls
      expect(calls[0][1]).not.toHaveProperty('deleteAccount')
      expect(calls[0][1]).not.toHaveProperty('deleteHistory')
    })
  })

  describe('PATCH /api/self-profile/usage', () => {
    let handler: (...args: any[]) => any
    beforeEach(async () => {
      handler = (await import('~/server/api/self-profile/usage.patch')).default
    })

    it('停止使用：expected+allowed=false 调用 setUsage', async () => {
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({ expected: { profileId: 'p1', version: 1 }, allowed: false }),
      )
      const result = await handler(makeEvent({ context: { accountId: 3 }, method: 'PATCH' }))
      expect(serviceMock.setUsage).toHaveBeenCalledWith(
        3,
        { profileId: 'p1', version: 1 },
        false,
        undefined,
      )
      expect(result).toHaveProperty('profile')
    })

    it('重新允许必须 consentVersion，缺失 400', async () => {
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({ expected: { profileId: 'p1', version: 1 }, allowed: true }),
      )
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PATCH' })),
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(serviceMock.setUsage).not.toHaveBeenCalled()
    })

    it('allowed 非严格布尔 400', async () => {
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({ expected: { profileId: 'p1', version: 1 }, allowed: 'yes' }),
      )
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PATCH' })),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('allowed=false 带未知字段（如 accountId）仍 400 且不调用写服务', async () => {
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({
          expected: { profileId: 'p1', version: 1 },
          allowed: false,
          accountId: 999,
        }),
      )
      await expect(
        handler(makeEvent({ context: { accountId: 3 }, method: 'PATCH' })),
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(serviceMock.setUsage).not.toHaveBeenCalled()
    })

    it('usage 服务抛 VERSION_CONFLICT 映射为 409 且 data.code 固定', async () => {
      mockReadRawBody.mockResolvedValue(
        JSON.stringify({ expected: { profileId: 'p1', version: 1 }, allowed: false }),
      )
      serviceMock.setUsage.mockImplementation(() => {
        throw makeServiceError('VERSION_CONFLICT', 'version')
      })
      const err: any = await handler(
        makeEvent({ context: { accountId: 3 }, method: 'PATCH' }),
      ).catch((e: any) => e)
      expect(err.statusCode).toBe(409)
      expect(err.data).toEqual({ code: 'VERSION_CONFLICT', field: 'version' })
    })
  })

  describe('GET summary 不含日期', () => {
    it('即使服务返回 hasBirthDate=true，summary 响应也不含日期字段', async () => {
      serviceMock.summary.mockReturnValue({
        exists: true,
        profileId: 'p1',
        version: 2,
        hasBirthDate: true,
        canImport: true,
      })
      const handler = (await import('~/server/api/self-profile/summary.get')).default
      const result = await handler(makeEvent({ context: { accountId: 3 } }))
      const body = JSON.stringify(result)
      expect(body).toContain('hasBirthDate')
      expect(body).not.toContain('solarDate')
      expect(body).not.toContain('raw_calendar')
      expect(body).not.toContain('raw_year')
    })
  })
})
