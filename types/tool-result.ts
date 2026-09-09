/**
 * 全局统一结果状态（工具统一体验与内容治理规范 §7）。
 *
 * 状态由四个互不替代的维度组成：阶段 phase、成功限定 successQualifier、
 * 结果新旧 freshness、失败类别 failureCategory，并允许附加领域失败详细代码。
 * 单项工具不得把这些字段压缩成另一套并列总状态。
 *
 * @author LiXinwen
 */

export type ToolResultPhase = 'idle' | 'editing' | 'ready' | 'processing' | 'success' | 'failure'

export type ToolResultSuccessQualifier = 'unique' | 'partial' | 'candidate' | 'empty'

export type ToolResultFreshness = 'current' | 'stale'

export type ToolResultFailureCategory =
  | 'invalid_input'
  | 'missing_required_input'
  | 'unsupported_input'
  | 'engine_error'
  | 'network_error'

/**
 * 用判别联合约束成功与失败字段：
 * - successQualifier 只在 phase = success 时存在；
 * - freshness 只在页面仍持有结果时存在（成功与保留的失败结果都可有）；
 * - failureCategory 只在 phase = failure 时存在；
 * - failureDetailCode 由单项工具定义，表达 UNSUPPORTED_DATE 等领域细节，不替代公共失败类别。
 */
export type ToolResultState =
  | {
      phase: Exclude<ToolResultPhase, 'success' | 'failure'>
    }
  | {
      phase: 'success'
      successQualifier: ToolResultSuccessQualifier
      freshness?: ToolResultFreshness
    }
  | {
      phase: 'failure'
      failureCategory: ToolResultFailureCategory
      failureDetailCode?: string
      freshness?: ToolResultFreshness
    }
