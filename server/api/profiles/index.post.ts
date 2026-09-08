// 旧主档案/亲友子档案创建在 R4 前统一返回 410，禁止任何隐式建档。
export default defineEventHandler(async () => {
  throw createError({ statusCode: 410, statusMessage: '本人档案将在后续阶段开放' })
})
