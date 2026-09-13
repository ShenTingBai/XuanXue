import { requireAccountId } from '../../utils/self-profile-request'
import { selfProfileService } from '../../services/self-profile'

// GET /api/self-profile：仅当前账号，返回 { profile: SelfProfile | null }。
// 档案页用户主动访问或工具明确读取时调用；不把完整 DTO 并入 auth/me 或布局 SSR。
export default defineEventHandler(event => {
  const accountId = requireAccountId(event)
  const profile = selfProfileService.get(accountId)
  return { profile }
})
