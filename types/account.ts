/**
 * R2 客户端安全账号类型。
 * Account 与未来 SelfProfile 保持独立：此处只暴露账号字段，不出现出生资料或档案命名。
 * @author LiXinwen
 */

/** 对外暴露的安全账号 DTO：不含 credentialHash、token、出生字段或 profile 命名。 */
export interface Account {
  id: number
  nickname: string
  status: 'active'
  /** 已满十四周岁确认时间（ISO 8601）。 */
  ageConfirmedAt: string
  /** 注册时确认的隐私政策版本。 */
  privacyPolicyVersion: string
  /** 注册时确认的服务规则版本。 */
  serviceTermsVersion: string
  createdAt: string
  updatedAt: string
}

/** 认证状态三态：恢复结束前不得闪现游客入口或错误跳转。 */
export type AuthStatus = 'restoring' | 'guest' | 'authenticated'

/** 注册请求：只接受账号最小字段。 */
export interface RegisterRequest {
  nickname: string
  password: string
  /** 必须严格为 true，由服务端校验。 */
  ageConfirmed: true
  privacyPolicyVersion: string
  serviceTermsVersion: string
}

/** 登录请求：密码不 trim。 */
export interface LoginRequest {
  nickname: string
  password: string
}
