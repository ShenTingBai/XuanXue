import { requireAccountId } from '../../utils/self-profile-request'
import { selfProfileService } from '../../services/self-profile'

// GET /api/self-profile/summary：返回无出生值的 SelfProfileSummary，供已登录生肖页
// 判断是否显示「从本人档案带入」按钮。无档案/无日期/撤回使用分别准确表达，不返回日期片段。
//
// R5 追加：同时返回仍含出生输入的结果历史条数，供档案删除流程在删除前展示并提供选择
// （交付规范 §7.5、数据规范 §13）。该数值是计数，不含任何出生数据。
export default defineEventHandler(event => {
  const accountId = requireAccountId(event)
  const summary = selfProfileService.summary(accountId)
  const historyWithBirthInputCount = selfProfileService.countHistoryWithBirthInput(accountId)
  return { summary, historyWithBirthInputCount }
})
