import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TOOL_CATALOG, isToolPubliclyAvailable } from '~/constants/tool-catalog'

const indexPageSource = readFileSync(resolve(process.cwd(), 'pages/index.vue'), 'utf-8')
/** 首页不得宣传的其余 10 项工具名（shengxiao 已公开，其名称由目录派生渲染）。 */
const nonPublicToolNames = TOOL_CATALOG.filter(tool => !isToolPubliclyAvailable(tool.id)).map(
  tool => tool.name,
)

describe('首页访客公开文案（R1 收敛 / 生肖公开候选）', () => {
  it('首页不请求旧历史列表接口', () => {
    expect(indexPageSource).not.toContain('/api/divinations')
    expect(indexPageSource).not.toContain('filterListedToolRecords')
  })

  it('不渲染旧“最近使用”列表或“暂无记录”历史文案', () => {
    expect(indexPageSource).not.toContain('最近使用')
    expect(indexPageSource).not.toContain('暂无记录')
    expect(indexPageSource).not.toContain('recentActivity')
    expect(indexPageSource).not.toContain('fetchRecentActivity')
  })

  it('首页不硬编码任何工具名字面量：公开入口只由目录派生', () => {
    // 生肖已公开，但首页不得硬编码「生肖」等名称；入口与文案统一走 TOOL_CATALOG 过滤结果。
    for (const tool of TOOL_CATALOG) {
      expect(indexPageSource).not.toContain(tool.name)
    }
    expect(indexPageSource).toContain('TOOL_CATALOG')
    expect(indexPageSource).toContain('isToolPubliclyAvailable')
  })

  it('首页不宣传其余 10 项未公开工具', () => {
    for (const toolName of nonPublicToolNames) {
      expect(indexPageSource).not.toContain(toolName)
    }
  })

  // ── FU-001 收敛：公开工具卡片文案必须与目录事实一致 ──

  it('公开工具卡片文案不再显示「整理中/敬请期待」', () => {
    // 回归背景：生肖公开后，首页仍显示「生肖功能整理中，敬请期待。」，
    // 与实际可用状态直接矛盾（R6/FU-001 真实浏览器已验证该文案）。
    // 断言范围限定在 toolCardNote 实现体，注释里出现该措辞不算违规。
    const publicBranch = indexPageSource.slice(
      indexPageSource.indexOf('function toolCardNote'),
      indexPageSource.indexOf('// ── 今日玄机'),
    )
    expect(publicBranch).not.toContain('功能整理中')
    expect(publicBranch).not.toContain('敬请期待')
  })

  it('公开工具卡片使用中性的「可直接使用」语义，且不含工具专属名称', () => {
    // 公开分支必须是工具无关的中性文案：后续新增公开工具无需再改这里。
    const publicBranch = indexPageSource.slice(
      indexPageSource.indexOf('function toolCardNote'),
      indexPageSource.indexOf('// ── 今日玄机'),
    )
    expect(publicBranch).toContain('已通过公开准入，可直接使用。')
    for (const tool of TOOL_CATALOG) {
      expect(publicBranch).not.toContain(tool.name)
    }
  })

  it('未公开工具不进入卡片列表，非公开分支也不谎称可用', () => {
    // 回归背景：首页曾为「内部验证」入口提供卡片并配「内部验证中（未公开）」文案。
    // 现在未公开工具不进首页；toolCardNote 的非公开分支只作为兜底，不得声称可用。
    const cardBranch = indexPageSource.slice(
      indexPageSource.indexOf('function toolCardNote'),
      indexPageSource.indexOf('// ── 今日玄机'),
    )
    expect(cardBranch).toContain('尚未公开')
    expect(cardBranch).not.toContain('内部验证')
    expect(cardBranch).not.toContain('点此进入')
  })

  it('不出现可用性承诺文案', () => {
    expect(indexPageSource).not.toContain('中式命理，一应俱全')
    expect(indexPageSource).not.toContain('登录探索全部工具')
    expect(indexPageSource).not.toContain('开始推演')
    expect(indexPageSource).not.toContain('浏览命盘')
    expect(indexPageSource).not.toContain('登录后可排自己的盘')
  })

  it('保留中性说明与定位', () => {
    expect(indexPageSource).toContain('传统文化自我探索')
    expect(indexPageSource).toContain('相关工具正在逐项核验')
  })

  it('不保留 11 个工具入口卡片（按路由渲染的入口已移除）', () => {
    expect(indexPageSource).not.toContain('groupedTools')
    for (const toolPath of [
      '/tools/shengxiao',
      '/tools/constellation',
      '/tools/zeji',
      '/tools/bazi',
      '/tools/name-test',
      '/tools/cezi',
      '/tools/guming',
      '/tools/ziwei',
      '/tools/yijing',
      '/tools/hehun',
      '/tools/meihua',
    ]) {
      expect(indexPageSource).not.toContain(`to="${toolPath}"`)
    }
  })

  it('页面级 SEO 使用中性定位', () => {
    expect(indexPageSource).toContain('传统文化自我探索')
    // 页面级 useSeoMeta 不得列出任何工具名（含已公开的生肖）。
    for (const tool of TOOL_CATALOG) {
      expect(indexPageSource).not.toContain(tool.name)
    }
  })

  // ── R2 账号语义 ──

  it('首页只使用 Account 语义，不再出现旧档案语义', () => {
    expect(indexPageSource).not.toContain('currentProfile')
    expect(indexPageSource).not.toContain('已有档案')
    expect(indexPageSource).not.toContain('出生资料')
    expect(indexPageSource).not.toContain('/profile/')
  })

  it('首页使用 currentAccount 与 authStatus', () => {
    expect(indexPageSource).toContain('currentAccount')
    expect(indexPageSource).toContain('authStatus')
  })

  it('首页 CTA 指向统一登录页；登录后落脚点是本人档案页', () => {
    // 游客 CTA 不再指向游客打不开的账号页，统一走登录入口。
    expect(indexPageSource).toContain('to="/login"')
    expect(indexPageSource).toContain('登录 / 注册')
    expect(indexPageSource).not.toContain('to="/account"')
  })

  // ── 游客计算与登录持久化生命周期（本轮收敛） ──

  it('未登录首页不再把登录作为工具使用的统一前置入口', () => {
    // 回归背景：未登录首页首屏曾以「登录查看状态」作为首要 CTA，
    // 与「游客先体验、保存时再登录」的登录边界直接冲突。
    expect(indexPageSource).not.toContain('登录查看状态')
    expect(indexPageSource).not.toContain('查看工具状态')
  })

  it('未登录首页的首要操作是直接进入公开工具', () => {
    // 公开工具入口必须由目录派生（不硬编码工具名或路由），并在有公开工具时渲染直达按钮。
    expect(indexPageSource).toMatch(/v-if="publicTools\.length > 0"/)
    expect(indexPageSource).toContain(':to="publicTools[0].route"')
    expect(indexPageSource).toContain('立即使用')
  })

  it('公开工具卡片仍使用目录 route 作为入口', () => {
    // 卡片入口必须继续绑定目录 route，不得退回登录页或状态页。
    expect(indexPageSource).toContain(':to="tool.route"')
    expect(indexPageSource).toContain('isToolPubliclyAvailable')
  })

  it('登录/注册文案只作为账户持久化能力提示', () => {
    // 登录说明必须点明它服务于保存、档案、历史与跨设备，而不是使用门槛。
    expect(indexPageSource).toContain('登录用于保存本人资料与探索结果')
    expect(indexPageSource).not.toContain('登录解锁')
    expect(indexPageSource).not.toContain('登录后可体验')
  })

  it('游客入口不新增任何浏览器或服务器持久化写入', () => {
    // 游客输入默认只存在于当前页面内存：首页不得出现长期存储或历史接口调用。
    expect(indexPageSource).not.toContain('localStorage')
    expect(indexPageSource).not.toContain('sessionStorage')
    expect(indexPageSource).not.toContain('indexedDB')
    expect(indexPageSource).not.toContain('document.cookie')
  })

  it('首页不出现研发阶段入口或内部验证身份', () => {
    // 回归背景：首页曾按 import.meta.dev + 已登录把未公开工具加进卡片列表，
    // 命名为「内部验证中（未公开）」。研发阶段身份不应出现在用户界面。
    expect(indexPageSource).not.toContain('getLocalDevNavTools')
    expect(indexPageSource).not.toContain('内部验证')
    expect(indexPageSource).not.toContain('本地开发')
    expect(indexPageSource).not.toContain('import.meta.dev')
  })

  it('首页卡片列表只由公开集合组成，不按登录态追加工具', () => {
    // visibleTools 必须与 publicTools 同源：登录不改变首页可见工具集合。
    const visibleDecl = indexPageSource.slice(
      indexPageSource.indexOf('const visibleTools'),
      indexPageSource.indexOf('const hasVisibleTools'),
    )
    expect(visibleDecl).toContain('publicTools')
    expect(visibleDecl).not.toContain('authStatus')
  })

  // ── R6 公开面 truthfulness 回归（移除首页命盘示例） ──

  it('首页不再引用 sample-bazi 命盘示例资产', () => {
    expect(indexPageSource).not.toContain('sample-bazi')
    expect(indexPageSource).not.toContain('SAMPLE_BAZI')
    expect(indexPageSource).not.toContain('SAMPLE_PROMINENT_SHENSHA')
  })

  it('首页不再渲染契约禁止的八字示例字段', () => {
    expect(indexPageSource).not.toContain('命盘预览')
    expect(indexPageSource).not.toContain('日主：')
    expect(indexPageSource).not.toContain('神煞：')
    expect(indexPageSource).not.toContain('身弱')
    expect(indexPageSource).not.toContain('福星贵人')
    expect(indexPageSource).not.toContain('五行比例')
    expect(indexPageSource).not.toContain('天生福气')
  })
})

describe('登录态首页今日玄机响应式（R6 移动端专项）', () => {
  it('保留今日玄机 DOM 标识与日期/节气绑定', () => {
    expect(indexPageSource).toContain('今日玄机')
    expect(indexPageSource).toContain('slip-date-inline')
    expect(indexPageSource).toContain('todayAstro.dateStr')
    expect(indexPageSource).toContain('todayAstro?.solarTerm')
  })

  it('今日玄机头部允许窄屏回流（flex-wrap），日期可收缩', () => {
    // 删除 flex-wrap 或 min-width:0/white-space:normal 时本断言失败，防止溢出回归。
    expect(indexPageSource).toMatch(/\.slip-hd\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(indexPageSource).toMatch(/\.slip-date-inline\s*\{[^}]*min-width:\s*0/)
    expect(indexPageSource).toMatch(/\.slip-date-inline\s*\{[^}]*white-space:\s*normal/)
  })

  it('不使用禁缩放或全局 overflow hidden 掩盖溢出', () => {
    expect(indexPageSource).not.toMatch(/user-scalable\s*=\s*["']?no/)
    expect(indexPageSource).not.toMatch(/maximum-scale/)
    // 不允许页面级全局 overflow hidden；组件内局部滚动不在此断言范围
    expect(indexPageSource).not.toContain('overflow: hidden')
  })
})

describe('robots.txt 站点地址一致性（R6 公开面）', () => {
  const robotsSource = readFileSync(resolve(process.cwd(), 'public/robots.txt'), 'utf-8')

  it('Sitemap 使用站点单一来源域名 xuanji.me', () => {
    expect(robotsSource).toContain('Sitemap: https://xuanji.me/sitemap.xml')
  })

  it('不再残留示例域名 xuanxue.example.com', () => {
    expect(robotsSource).not.toContain('xuanxue.example.com')
  })
})
