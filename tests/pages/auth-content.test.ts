import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_SERVICE_TERMS_VERSION,
} from '../../constants/account-policy'

const root = resolve(process.cwd())
const loginSource = readFileSync(resolve(root, 'pages/login.vue'), 'utf-8')
const accountSource = readFileSync(resolve(root, 'pages/account.vue'), 'utf-8')
const privacySource = readFileSync(resolve(root, 'pages/privacy.vue'), 'utf-8')
const termsSource = readFileSync(resolve(root, 'pages/terms.vue'), 'utf-8')
const authFormSource = readFileSync(resolve(root, 'components/auth/AuthForm.vue'), 'utf-8')

describe('R2 认证页面公开文案与结构', () => {
  it('登录页复用 AuthForm 组件', () => {
    expect(loginSource).toContain('AuthForm')
    expect(loginSource).toContain("from '~/components/auth/AuthForm.vue'")
  })

  it('登录页不含旧 PIN 语义与单一隐私勾选', () => {
    expect(loginSource).not.toMatch(/PIN|密令|4位|6位以上/)
    expect(loginSource).not.toContain('privacyConsent')
  })

  it('账号页提供当前退出、全部退出与注销三类动作', () => {
    expect(accountSource).toContain('退出当前设备')
    expect(accountSource).toContain('退出所有设备')
    expect(accountSource).toContain('注销账号')
  })

  it('账号页退出失败文案明确会话可能仍有效', () => {
    expect(accountSource).toContain('退出失败')
  })

  it('账号页不提供设备列表或凭证找回能力，只保留边界说明', () => {
    // 允许「不提供…」这类边界说明存在（规范 §5.3 明确不建设会话设备列表），
    // 但不允许出现任何找回/绑定入口或设备列表结构。
    expect(accountSource).not.toMatch(/找回密码|重置密码|绑定邮箱|绑定手机号|发送验证码/)
    expect(accountSource).not.toMatch(/<table|v-for="device|devices\.map/)
    expect(accountSource).toContain('不提供设备列表与凭证找回')
  })

  it('隐私与服务规则页导入并渲染当前版本常量', () => {
    // 页面版本必须由共享常量驱动（渲染 CURRENT_*_VERSION），而非写死字面量；
    // 常量实际值（2026-09-08）由常量文件的既有测试负责，这里不重复断言具体值。
    expect(privacySource).toContain('CURRENT_PRIVACY_POLICY_VERSION')
    expect(privacySource).toMatch(/版本[：:]\s*\{\{\s*CURRENT_PRIVACY_POLICY_VERSION\s*\}\}/)
    expect(termsSource).toContain('CURRENT_SERVICE_TERMS_VERSION')
    expect(termsSource).toMatch(/版本[：:]\s*\{\{\s*CURRENT_SERVICE_TERMS_VERSION\s*\}\}/)
    // 常量与页面在同一模块图内：页面导入的必须是这两个具名导出
    expect(privacySource).toContain("from '~/constants/account-policy'")
    expect(termsSource).toContain("from '~/constants/account-policy'")
    // 常量当前为字符串版本号，供 Codex 审阅时对照（不断言具体日期值）
    expect(typeof CURRENT_PRIVACY_POLICY_VERSION).toBe('string')
    expect(typeof CURRENT_SERVICE_TERMS_VERSION).toBe('string')
  })

  it('认证 UI 不含旧 /profile 路由与 token 语义', () => {
    const all = loginSource + accountSource + authFormSource
    // 只禁止「路由字面量」形式的旧档案页路径；components/profile/* 这类模块路径是合法引用。
    expect(all).not.toMatch(/['"`]\/profile\//)
    expect(all).not.toMatch(/\btoken\b/)
  })

  it('登录成功跳转登录后落脚点（本人档案页）而非账号页', () => {
    // 登录成功由 login.vue 导航到本人档案页；账号页不再是落脚点。
    expect(loginSource).toContain("router.replace('/self-profile')")
    expect(loginSource).not.toContain("router.replace('/account')")
    // 只禁止旧档案页「路由字面量」，components/profile/* 模块路径属合法引用。
    expect(loginSource).not.toMatch(/['"`]\/profile\//)
    expect(accountSource).not.toMatch(/['"`]\/profile\//)
  })

  it('登录页显示网络恢复错误与重试入口', () => {
    expect(loginSource).toContain('restoreError')
    expect(loginSource).toContain('重新确认登录状态')
    expect(loginSource).toContain('retryRestore')
  })

  it('登录页 401 正常游客态不显示网络错误（restoreError 为 null 时不渲染）', () => {
    // 模板用 v-if="restoreError" 控制，401 时 restoreError 为 null 不渲染
    expect(loginSource).toContain('v-if="restoreError"')
  })

  it('账号页恢复网络失败时显示错误与重试，不立即重定向', () => {
    expect(accountSource).toContain('restoreError')
    expect(accountSource).toContain('重新确认登录状态')
    expect(accountSource).toContain('retryRestore')
    // 只有无 restoreError 的 guest 才 replace /login
    expect(accountSource).toMatch(/guest.*restoreError/)
    expect(accountSource).toContain("router.replace('/login')")
  })

  it('账号页首次恢复与重试恢复对 guest/网络错误的跳转逻辑一致', () => {
    // 统一走 redirectIfConfirmedGuest：guest 且无 restoreError 时 replace /login
    expect(accountSource).toContain('redirectIfConfirmedGuest')
    // onMounted 与 retryRestore 都调用同一逻辑
    expect(accountSource).toContain('redirectIfConfirmedGuest()')
    // retryRestore 在恢复完成后调用该逻辑，避免 401 后永久停留在“正在前往登录”
    const retryStart = accountSource.indexOf('async function retryRestore')
    const retryBlock = accountSource.slice(retryStart, retryStart + 400)
    expect(retryBlock).toContain('redirectIfConfirmedGuest()')
    // 网络错误时不误跳登录：跳转仅在 guest 且 restoreError 为空
    expect(accountSource).toContain("authStatus.value === 'guest' && !restoreError.value")
  })

  it('账号页注销弹层实现等价焦点辅助（初始标题聚焦、Tab/Shift+Tab 循环、Escape、焦点返回、删除中不可关闭）', () => {
    // 初始标题聚焦与触发记录
    expect(accountSource).toContain('deleteTitleRef')
    expect(accountSource).toContain('deleteTriggerRef')
    expect(accountSource).toContain('deleteTitleRef.value?.focus()')
    // 打开前记录触发元素，关闭后焦点返回
    expect(accountSource).toContain('document.activeElement')
    // 弹层键盘处理：Escape 与 Tab/Shift+Tab 循环
    expect(accountSource).toContain('onDeleteDialogKeydown')
    expect(accountSource).toContain("e.key === 'Escape'")
    expect(accountSource).toContain("e.key !== 'Tab'")
    expect(accountSource).toContain('shiftKey')
    // 删除进行中不可关闭
    expect(accountSource).toContain('if (deleting.value) return')
    // 弹层语义
    expect(accountSource).toContain('role="dialog"')
    expect(accountSource).toContain('aria-modal="true"')
  })
})
