// 旧本人档案接口在 R4 前统一返回 410，不访问数据库、不限流、不读取请求正文。
export default defineEventHandler(async () => {
  throw createError({ statusCode: 410, statusMessage: '本人档案将在后续阶段开放' })
})
