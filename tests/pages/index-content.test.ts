import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const indexPageSource = readFileSync(resolve(process.cwd(), 'pages/index.vue'), 'utf-8')
const toolNames = [
  '生肖',
  '星座',
  '择日',
  '八字',
  '姓名',
  '测字',
  '称骨',
  '紫微斗数',
  '六爻',
  '合婚',
  '梅花',
]

describe('首页访客公开文案（R1 收敛）', () => {
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

  it('当前无公开工具时不出现工具名称宣传清单', () => {
    for (const toolName of toolNames) {
      expect(indexPageSource).not.toContain(toolName)
    }
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
    // 页面级 useSeoMeta 不得列出当前非公开工具
    for (const toolName of toolNames) {
      expect(indexPageSource).not.toContain(toolName)
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
})
