/**
 * 本人档案策略常量（R4）。
 *
 * 只承载档案边界：用途/数据类别/动作枚举、告知与转换版本、最小年龄与请求体积。
 * 不包含生肖或八字规则，也不修改账号注册隐私/服务版本。
 *
 * @author LiXinwen
 */

/** 当前档案长期保存告知版本：保存/重新允许时必须提交同值并由服务端精确校验。 */
export const SELF_PROFILE_POLICY_VERSION = '2026-09-09'

/** 公历→农历换算规则/依赖版本（lunar-javascript 1.7.7 + 本模块自校口径）。 */
export const SELF_PROFILE_CONVERSION_VERSION = 'lunar-javascript 1.7.7 / self-profile-date-v1'

/** 规范化公历日期最小下界（契约 §6.2/§8.3；1901 下界对应的农历可为 1900 年）。 */
export const SELF_PROFILE_MIN_SOLAR_DATE = '1901-01-01'

/** 建档最低年龄：服务端按完整公历生日周年比较，未满 14 岁拒绝保存。 */
export const SELF_PROFILE_MIN_AGE = 14

/** 请求体最大字节数：按真实 UTF-8 字节校验，不信任 Content-Length。 */
export const SELF_PROFILE_MAX_REQUEST_BYTES = 4096

/** 本人档案用途标识（授权凭证）。 */
export const SELF_PROFILE_PURPOSE = 'self_profile'

/** 本人档案数据类别（授权凭证，不记录具体字段值）。 */
export const SELF_PROFILE_DATA_CATEGORY = 'birth_date'

/** 授权凭证动作集合（create/update/delete_birth_date/delete_profile/revoke_use/allow_use）。 */
export const SELF_PROFILE_ACTIONS = [
  'create',
  'update',
  'delete_birth_date',
  'delete_profile',
  'revoke_use',
  'allow_use',
] as const
export type SelfProfileAction = (typeof SELF_PROFILE_ACTIONS)[number]
