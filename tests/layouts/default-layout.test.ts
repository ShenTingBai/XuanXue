import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 全局布局（顶栏 / 移动抽屉）身份显示回归。
 *
 * 断言范围是源码声明层：guest 分支必须只呈现**一个**账户触发器（账户图形 + 「未登录」），
 * 点击进入登录；authenticated 分支必须继续使用真实 currentAccount.nickname 与退出入口。
 * 这里不渲染组件、不伪造几何或交互——真实会话生命周期由浏览器验收覆盖。
 */
const layoutSource = readFileSync(resolve(process.cwd(), 'layouts/default.vue'), 'utf-8')

/** 抽取 guest 状态的两个身份入口片段，避免断言被 authenticated 分支的文案满足。 */
const guestDesktopBranch = layoutSource.slice(
  layoutSource.indexOf("authStatus === 'guest'"),
  layoutSource.indexOf('<!-- Account Section (desktop only'),
)
// 移动端 guest 账户项已移入底部账号区（spacer 之后、底部 focus trap 之前），
// 因此片段终点必须改取底部 sentinel 注释；若终点仍是 spacer，切片会反向变成空串，
// 「未登录」等断言会以假通过的方式掩盖结构回退。
const guestMobileBranch = layoutSource.slice(
  layoutSource.lastIndexOf("authStatus === 'guest'"),
  layoutSource.indexOf('<!-- Bottom focus trap sentinel'),
)

describe('顶栏游客身份显示（游客计算与登录持久化生命周期）', () => {
  it('guest 桌面顶栏只有一个账户触发器，文本为未登录且链接 /login', () => {
    expect(guestDesktopBranch).toContain('未登录')
    expect(guestDesktopBranch).toContain('to="/login"')
    // 单一账户控件：aria-label 说明点击结果，不并排渲染「登录」标签。
    expect(guestDesktopBranch).toContain('aria-label="未登录，前往登录或注册"')
    expect(guestDesktopBranch).not.toContain('<span>登录</span>')
  })

  it('guest 移动抽屉与桌面语义一致（同样只有一个账户项）', () => {
    expect(guestMobileBranch).toContain('未登录')
    expect(guestMobileBranch).toContain('to="/login"')
    expect(guestMobileBranch).toContain('aria-label="未登录，前往登录或注册"')
    // 旧实现把「登录」作为并排标签放在同一项里；现在它只能是点击后的结果。
    expect(guestMobileBranch).not.toContain('ml-auto">登录</span>')
  })

  it('guest 移动账户项位于 flex-1 之后，不再夹在工具导航与 spacer 之间', () => {
    // 回归背景：移动抽屉曾把 guest 账户项直接排在工具导航之后，与导航项视觉同组；
    // 登录态账户区却在抽屉底部，两种身份的账户入口落点不一致。
    const spacerIndex = layoutSource.indexOf('<div class="flex-1" />')
    expect(spacerIndex).toBeGreaterThan(-1)
    expect(layoutSource.lastIndexOf("authStatus === 'guest'")).toBeGreaterThan(spacerIndex)

    // 工具导航到 spacer 之间只允许是导航内容，不得再出现账户控件。
    const mobileNavToSpacer = layoutSource.slice(
      layoutSource.lastIndexOf('aria-label="命理工具导航"'),
      spacerIndex,
    )
    expect(mobileNavToSpacer).not.toContain('account-control')

    // 片段仍指向底部 guest 区块本身，语义未变：单一账户控件、单一「未登录」文案。
    expect(guestMobileBranch).toContain('to="/login"')
    expect(guestMobileBranch).toContain('aria-label="未登录，前往登录或注册"')
    expect(guestMobileBranch.match(/account-control/g) ?? []).toHaveLength(1)
    // 分组处理与登录态一致：同款分隔线 + 同款内边距容器。
    expect(guestMobileBranch).toContain('class="mx-5 h-px"')
    expect(guestMobileBranch).toContain('class="flex flex-col px-3 py-3 gap-1"')
  })

  it('guest 状态不伪造昵称或头像', () => {
    expect(guestDesktopBranch).not.toContain('nickname')
    expect(guestDesktopBranch).not.toContain('AvatarCircle')
    expect(guestMobileBranch).not.toContain('nickname')
    expect(guestMobileBranch).not.toContain('AvatarCircle')
  })

  it('restoring 阶段不渲染任何身份入口，避免闪现错误身份', () => {
    // 两个 guest 入口都由 authStatus === 'guest' 守卫：restoring 时既不显示
    // 「未登录」也不显示账号菜单，不会先显示错身份再跳变。
    const guestGuards = layoutSource.match(/v-if="authStatus === 'guest'"/g) ?? []
    expect(guestGuards).toHaveLength(2)
    expect(layoutSource).toContain('v-if="currentAccount"')
  })
})

describe('顶栏登录态显示（登录持久化能力入口）', () => {
  it('authenticated 状态继续使用真实昵称与退出入口', () => {
    const nicknameRefs = layoutSource.match(/currentAccount\.nickname/g) ?? []
    expect(nicknameRefs.length).toBeGreaterThanOrEqual(2)
    expect(layoutSource).toContain('AvatarCircle')
    expect(layoutSource).toContain('退出')
  })

  it('不把登录描述为公开工具的统一入口', () => {
    // 旧注释曾把未登录点击工具一律说成「误以为工具没做」的通用门槛；
    // 现在必须写清那只是未公开工具的准入问题，且公开工具游客可直接进入。
    expect(layoutSource).not.toContain('未登录访客点了只会被围栏 302 回状态页')
    expect(layoutSource).toContain('公开工具游客可直接进入')
  })
  it('不出现固定示例昵称或占位身份', () => {
    expect(layoutSource).not.toContain('示例用户')
    expect(layoutSource).not.toContain('游客用户')
    expect(layoutSource).not.toContain('未登录用户')
  })
})

describe('顶栏导航只呈现公开产品入口（统一产品流程）', () => {
  it('布局不引用开发专用导航派生入口或内部验证命名', () => {
    // 回归背景：布局曾按 import.meta.dev + 已登录追加 getLocalDevNavTools，
    // 把未公开工具以「（内部验证）」名义放进全局导航。研发阶段身份不是产品模式。
    expect(layoutSource).not.toContain('getLocalDevNavTools')
    expect(layoutSource).not.toContain('内部验证')
    expect(layoutSource).not.toContain('import.meta.dev')
  })

  it('公开导航仍由目录的公开可用判断派生', () => {
    expect(layoutSource).toContain('isToolPubliclyAvailable')
    expect(layoutSource).toContain('TOOL_CATALOG')
    expect(layoutSource).toMatch(
      /navTools\s*=\s*computed\(\(\)\s*=>\s*TOOL_CATALOG\.filter\(tool\s*=>\s*isToolPubliclyAvailable\(tool\.id\)\)\)/,
    )
  })

  it('导航不按登录态改变可见工具集合', () => {
    // navTools 不得依赖 authStatus：公开集合对所有访客一致。
    const navToolsDecl = layoutSource.slice(
      layoutSource.indexOf('const navTools'),
      layoutSource.indexOf('const showMobileNav'),
    )
    expect(navToolsDecl).not.toContain('authStatus')
  })
})
