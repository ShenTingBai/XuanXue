import type { Account } from '../../types/account'
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
} from '../../constants/account-policy'

/** 数据库 Account 行原始字段。 */
export interface AccountRow extends Record<string, unknown> {
  id: number
  nickname: string
  credential_hash: string
  status: 'active'
  age_confirmed_at: string
  privacy_policy_version: string
  service_terms_version: string
  created_at: string
  updated_at: string
}

/**
 * 白名单字段映射：任何 credential_hash 和数据库内部字段都不得扩散到响应。
 * 只保留计划约定的安全字段，未来新增内部字段需显式加入白名单。
 */
export function toSafeAccount(row: Record<string, unknown> | undefined): Account {
  if (!row) throw new Error('Account row is undefined')
  return {
    id: row.id as number,
    nickname: row.nickname as string,
    status: row.status as 'active',
    ageConfirmedAt: row.age_confirmed_at as string,
    privacyPolicyVersion: row.privacy_policy_version as string,
    serviceTermsVersion: row.service_terms_version as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/** 昵称 NFC 规范化。 */
export function normalizeNickname(raw: string): string {
  return raw.normalize('NFC')
}

/** 昵称校验：NFC 规范化后 2–20 字符，且只允许中文、字母、数字、下划线、连字符。 */
export function isValidNickname(raw: string): boolean {
  const normalized = normalizeNickname(raw)
  if (normalized.length < NICKNAME_MIN_LENGTH || normalized.length > NICKNAME_MAX_LENGTH) {
    return false
  }
  return NICKNAME_PATTERN.test(normalized)
}
