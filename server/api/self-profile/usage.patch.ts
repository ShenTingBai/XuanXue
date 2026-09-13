import { assertSameOriginMutation } from '../../utils/request-origin'
import {
  requireAccountId,
  readBoundedJsonBody,
  parseUsageRequest,
  mapServiceError,
} from '../../utils/self-profile-request'
import { selfProfileService } from '../../services/self-profile'

// PATCH /api/self-profile/usage：请求体 expected、allowed:boolean、重新允许时 consentVersion。
// 调用 setUsage，成功返回 {profile}；明确停止后续使用不等于删除已保存日期。
export default defineEventHandler(async event => {
  assertSameOriginMutation(event)
  const accountId = requireAccountId(event)
  const body = await readBoundedJsonBody(event)
  const request = parseUsageRequest(body)
  try {
    const profile = selfProfileService.setUsage(
      accountId,
      request.expected,
      request.allowed,
      request.consentVersion,
    )
    return { profile }
  } catch (err) {
    return mapServiceError(err)
  }
})
