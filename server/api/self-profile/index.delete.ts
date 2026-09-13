import { assertSameOriginMutation } from '../../utils/request-origin'
import {
  requireAccountId,
  readBoundedJsonBody,
  parseDeleteRequest,
  mapServiceError,
} from '../../utils/self-profile-request'
import { selfProfileService } from '../../services/self-profile'

// DELETE /api/self-profile：请求体 expected，调用 deleteProfile，成功返回 {success:true}。
// 不提供删除账号或旧历史的额外参数。
export default defineEventHandler(async event => {
  assertSameOriginMutation(event)
  const accountId = requireAccountId(event)
  const body = await readBoundedJsonBody(event)
  const request = parseDeleteRequest(body)
  try {
    return selfProfileService.deleteProfile(accountId, request.expected)
  } catch (err) {
    return mapServiceError(err)
  }
})
