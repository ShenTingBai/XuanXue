import { requireAccountId } from '../../utils/self-profile-request'
import { selfProfileService } from '../../services/self-profile'

// GET /api/self-profile/summary：返回无出生值的 SelfProfileSummary，供已登录生肖页
// 判断是否显示「从本人档案带入」按钮。无档案/无日期/撤回使用分别准确表达，不返回日期片段。
export default defineEventHandler(event => {
  const accountId = requireAccountId(event)
  const summary = selfProfileService.summary(accountId)
  return { summary }
})
