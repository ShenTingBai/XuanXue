import { assertSameOriginMutation } from '../../utils/request-origin'
import {
  requireAccountId,
  readBoundedJsonBody,
  parseSaveRequest,
  mapServiceError,
} from '../../utils/self-profile-request'
import { selfProfileService } from '../../services/self-profile'

// PUT /api/self-profile：接收 SaveSelfProfileRequest，仅差异确认后调用，服务端重校验并保存。
// 首次/更新均走该接口；不能凭客户端 normalized 字段保存。
export default defineEventHandler(async event => {
  assertSameOriginMutation(event)
  const accountId = requireAccountId(event)
  const body = await readBoundedJsonBody(event)
  const request = parseSaveRequest(body)
  try {
    const profile = selfProfileService.save(accountId, request)
    return { profile }
  } catch (err) {
    return mapServiceError(err)
  }
})
