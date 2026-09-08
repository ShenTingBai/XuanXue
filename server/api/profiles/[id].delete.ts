// 旧档案删除在 R4 前统一返回 410；旧档案与旧数据库不得由新注销流程删除。
export default defineEventHandler(async () => {
  throw createError({ statusCode: 410, statusMessage: '本人档案将在后续阶段开放' })
})
