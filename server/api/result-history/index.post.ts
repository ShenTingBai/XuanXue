import { assertSameOriginMutation } from '../../utils/request-origin'
import {
  assertInternalAccessIfNotPublic,
  mapHistoryError,
  parseSaveSnapshotRequest,
  readBoundedHistoryBody,
  requireHistoryAccountId,
} from '../../utils/result-history-request'
import { recomputeToolResult } from '../../services/tool-recompute'
import { resultHistoryService } from '../../services/result-history'
import { canCreateHistory } from '../../../constants/tool-catalog'
import { checkRateLimit } from '../../utils/rateLimit'
import { digestsMatch } from '~/utils/bazi/engine'

// POST /api/result-history：显式保存本次结果。
// 顺序固定为：同源 → 身份 → 体积与结构 → 限流 → 工具获准创建历史 → **服务端复算** →
// 与客户端摘要比对 → 幂等写入。复算不一致一律拒绝且**不落库**（交付规范 §7.3/§7.4）。
export default defineEventHandler(async event => {
  assertSameOriginMutation(event)
  const accountId = requireHistoryAccountId(event)
  const body = await readBoundedHistoryBody(event)
  const request = parseSaveSnapshotRequest(body)

  // 服务端独立校验授权内部验证（客户端判定不是安全边界）。
  assertInternalAccessIfNotPublic(request.toolId, accountId)

  if (!checkRateLimit(`result-history:${accountId}`, 10, 60_000)) {
    throw createError({ statusCode: 429, statusMessage: '操作过于频繁，请稍后再试' })
  }

  // 历史创建默认拒绝：工具目录是客户端与服务端共同使用的单一状态来源。
  if (!canCreateHistory(request.toolId)) {
    throw createError({ statusCode: 403, statusMessage: '当前不支持保存历史' })
  }

  // 服务端用同一领域规则复算；不复用客户端提交的结果正文作为可信历史。
  const recomputed = recomputeToolResult(request.toolId, {
    raw: request.originalInput,
    asOfDate: request.asOfDate,
  })
  if (!recomputed) {
    throw createError({
      statusCode: 409,
      statusMessage: '服务端未能复算本次结果，未保存',
      data: { code: 'RESULT_MISMATCH' },
    })
  }
  if (!digestsMatch(request.clientDigest, recomputed.digest)) {
    throw createError({
      statusCode: 409,
      statusMessage: '结果与服务端复算不一致，未保存',
      data: { code: 'RESULT_MISMATCH' },
    })
  }

  try {
    const saved = resultHistoryService.saveSnapshot({
      accountId,
      toolId: request.toolId,
      resultId: request.resultId,
      schemaVersion: recomputed.versions.schemaVersion,
      ruleVersion: recomputed.versions.ruleVersion,
      engineName: recomputed.versions.engineName,
      engineVersion: recomputed.versions.engineVersion,
      sourceSetVersion: recomputed.versions.sourceSetVersion,
      originalInput: request.originalInput,
      normalizedInput: recomputed.normalizedInput,
      phase: 'success',
      successQualifier: recomputed.digest.successQualifier,
      failureCategory: null,
      failureDetailCode: null,
      resultSnapshot: recomputed.result,
      limitations: recomputed.result.limitations,
      inputOrigin: request.inputOrigin,
      ruleStatus: 'current',
      asOfDate: request.asOfDate,
      generatedAt: new Date().toISOString(),
    })
    return {
      recordId: saved.record.recordId,
      resultId: saved.record.resultId,
      savedAt: saved.record.savedAt,
      created: saved.created,
    }
  } catch (err) {
    return mapHistoryError(err)
  }
})
