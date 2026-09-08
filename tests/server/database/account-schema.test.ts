import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// 该回归只检查 R2 schema 源码与临时数据库结构，绝不接触 xuanxue.db。
describe('R2 账号数据库结构', () => {
  const root = resolve(process.cwd())
  const schemaSource = readFileSync(resolve(root, 'server/database/schema.ts'), 'utf-8')

  it('只创建 accounts/sessions/security_log 与迁移元数据表', () => {
    expect(schemaSource).toContain('CREATE TABLE IF NOT EXISTS accounts')
    expect(schemaSource).toContain('CREATE TABLE IF NOT EXISTS sessions')
    expect(schemaSource).toContain('CREATE TABLE IF NOT EXISTS security_log')
    expect(schemaSource).toContain('CREATE TABLE IF NOT EXISTS _migrations')
  })

  it('不含旧 profiles、divination_results 与未来 self_profile 表', () => {
    expect(schemaSource).not.toContain('CREATE TABLE IF NOT EXISTS profiles')
    expect(schemaSource).not.toContain('CREATE TABLE IF NOT EXISTS divination_results')
    expect(schemaSource).not.toContain('CREATE TABLE IF NOT EXISTS self_profiles')
    expect(schemaSource).not.toContain('CREATE TABLE IF NOT EXISTS consent_receipts')
    expect(schemaSource).not.toContain('CREATE TABLE IF NOT EXISTS result_snapshots')
  })

  it('accounts 字段为不可修改唯一昵称、凭证哈希与确认版本', () => {
    expect(schemaSource).toContain('nickname TEXT NOT NULL UNIQUE')
    expect(schemaSource).toContain('credential_hash TEXT NOT NULL')
    expect(schemaSource).toContain("status TEXT NOT NULL DEFAULT 'active'")
    expect(schemaSource).toContain('age_confirmed_at TEXT NOT NULL')
    expect(schemaSource).toContain('privacy_policy_version TEXT NOT NULL')
    expect(schemaSource).toContain('service_terms_version TEXT NOT NULL')
  })

  it('accounts 不包含出生字段、pin 或 profile 命名', () => {
    expect(schemaSource).not.toContain('birth_date')
    expect(schemaSource).not.toContain('pin TEXT')
    expect(schemaSource).not.toContain('parent_profile_id')
  })

  it('sessions 使用 account_id 外键并级联删除', () => {
    expect(schemaSource).toContain(
      'account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE',
    )
    expect(schemaSource).toContain('token_hash TEXT NOT NULL UNIQUE')
  })

  it('security_log 使用可空 account_id 与 ip_hint', () => {
    expect(schemaSource).toContain('account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL')
    expect(schemaSource).toContain('ip_hint TEXT')
  })
})
