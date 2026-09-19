import { assertSameOriginMutation } from '../../utils/request-origin'
import {
  requireAccountId,
  readSelfProfileJsonBody,
  parseDeleteRequest,
  mapServiceError,
} from '../../utils/self-profile-request'
import { selfProfileService } from '../../services/self-profile'

// DELETE /api/self-profile/birth-date：请求体 expected 含 profileId/version，
// 调用 deleteBirthDate，返回保留 id 且 birthDate:null 的 {profile}。
export default defineEventHandler(async event => {
  assertSameOriginMutation(event)
  const accountId = requireAccountId(event)
  const body = await readSelfProfileJsonBody(event)
  const request = parseDeleteRequest(body)
  try {
    const profile = selfProfileService.deleteBirthDate(accountId, request.expected)
    return { profile }
  } catch (err) {
    return mapServiceError(err)
  }
})
