/**
 * 工具复算注册表（R5 只注册 bazi）。
 *
 * 交付规范 §7.3/§7.4 要求：用户请求保存时，服务端必须用**同一领域规则**重新计算并核对，
 * 不接受客户端提交的结果 JSON 作为可信历史。本模块把这个"同一领域规则"集中到一处：
 * 服务端复算直接复用 `utils/bazi/engine.ts`，与页面计算是同一份实现，不会两边漂移。
 *
 * 复算失败的两种情形都必须让调用方拒绝保存：
 * - 未注册的工具（返回 null）；
 * - 复算得不到成功结果（例如输入已越界或依赖异常，返回 null）。
 *
 * @author LiXinwen
 */

import {
  BAZI_ENGINE_NAME,
  BAZI_ENGINE_VERSION,
  BAZI_RESULT_SCHEMA_VERSION,
  BAZI_RULE_VERSION,
  BAZI_SOURCE_SET_VERSION,
  BAZI_TOOL_ID,
} from '~/constants/bazi-rules'
import type {
  BaziDomainResult,
  BaziNormalizedInput,
  BaziRawDate,
  BaziResultDigest,
} from '~/types/bazi'
import { calculateBazi, resultDigest } from '~/utils/bazi/engine'

/** 复算入参：只接受原始输入与显式的产品"今天"，不接受任何客户端结果。 */
export interface ToolRecomputeInput {
  raw: BaziRawDate
  asOfDate: string
}

/** 复算产物：摘要（用于比对）、规范化输入与完整结果（用于写入快照）、版本集合。 */
export interface ToolRecomputeOutcome {
  digest: BaziResultDigest
  normalizedInput: BaziNormalizedInput
  result: BaziDomainResult
  versions: {
    schemaVersion: number
    ruleVersion: string
    engineName: string
    engineVersion: string
    sourceSetVersion: string
  }
}

export type ToolRecomputeFn = (input: ToolRecomputeInput) => ToolRecomputeOutcome | null

/** 八字复算：调用领域引擎；非成功结果一律返回 null（由调用方拒绝保存）。 */
const recomputeBazi: ToolRecomputeFn = input => {
  const outcome = calculateBazi({ raw: input.raw, asOfDate: input.asOfDate })
  if (outcome.state.phase !== 'success' || !outcome.result) return null

  const result = outcome.result
  return {
    digest: resultDigest(result),
    normalizedInput: {
      raw: input.raw,
      solarDate: result.dateComparison.normalizedSolar,
      lunar: result.dateComparison.lunar,
      conversionVersion: result.dateComparison.conversionVersion,
    },
    result,
    versions: {
      schemaVersion: BAZI_RESULT_SCHEMA_VERSION,
      ruleVersion: BAZI_RULE_VERSION,
      engineName: BAZI_ENGINE_NAME,
      engineVersion: BAZI_ENGINE_VERSION,
      sourceSetVersion: BAZI_SOURCE_SET_VERSION,
    },
  }
}

/** 工具 → 复算实现；新增工具时在此登记，未登记的工具不可保存历史。 */
const RECOMPUTE_REGISTRY: Record<string, ToolRecomputeFn> = {
  [BAZI_TOOL_ID]: recomputeBazi,
}

/** 该工具是否具备服务端复算能力。 */
export function isRecomputableTool(toolId: string): boolean {
  return typeof RECOMPUTE_REGISTRY[toolId] === 'function'
}

/** 执行服务端复算；未登记或复算失败返回 null。 */
export function recomputeToolResult(
  toolId: string,
  input: ToolRecomputeInput,
): ToolRecomputeOutcome | null {
  const recompute = RECOMPUTE_REGISTRY[toolId]
  if (!recompute) return null
  try {
    return recompute(input)
  } catch {
    // 依赖异常一律视为不可复算：不落库、不暴露异常细节。
    return null
  }
}
