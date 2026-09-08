// 旧档案兼容读取在 R4 前统一返回 410，不读取路由参数也不访问数据库。
export default defineEventHandler(async () => {
  throw createError({ statusCode: 410, statusMessage: '本人档案将在后续阶段开放' })
})
