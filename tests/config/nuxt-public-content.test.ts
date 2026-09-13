import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const nuxtConfigSource = readFileSync(resolve(process.cwd(), 'nuxt.config.ts'), 'utf-8')
const nonPublicToolNames = [
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

describe('全局公开元数据（R1 围栏）', () => {
  it('PWA、默认 SEO 和分享描述不列出当前非公开工具', () => {
    for (const toolName of nonPublicToolNames) {
      expect(nuxtConfigSource).not.toContain(toolName)
    }
  })

  it('保留“传统文化自我探索”的中性定位', () => {
    expect(nuxtConfigSource).toContain('传统文化自我探索')
  })

  it('站点地图排除 11 个非公开工具路由（由目录派生）', () => {
    expect(nuxtConfigSource).toContain('nonPublicToolRoutes')
    expect(nuxtConfigSource).toContain("'/api/**'")
    expect(nuxtConfigSource).toContain('isToolPubliclyAvailable')
  })

  it('敏感 API 的 NetworkOnly 规则位于通用 /api NetworkFirst 规则之前', () => {
    const networkFirstIndex = nuxtConfigSource.indexOf("handler: 'NetworkFirst'")
    const sensitiveIndex = nuxtConfigSource.indexOf("handler: 'NetworkOnly'")
    expect(sensitiveIndex).toBeGreaterThanOrEqual(0)
    expect(networkFirstIndex).toBeGreaterThanOrEqual(0)
    expect(sensitiveIndex).toBeLessThan(networkFirstIndex)
  })

  it('Workbox 同时覆盖 /api/auth、/api/profiles、/api/divinations 与 /api/self-profile 的 NetworkOnly', () => {
    // 配置以正则派生敏感 API 集合，路径以转义斜杠形式存在。
    expect(nuxtConfigSource).toContain('\\/api\\/auth')
    expect(nuxtConfigSource).toContain('\\/api\\/profiles')
    expect(nuxtConfigSource).toContain('\\/api\\/divinations')
    expect(nuxtConfigSource).toContain('\\/api\\/self-profile')
    expect(nuxtConfigSource).toContain('NetworkOnly')
  })

  it('站点地图排除 /self-profile（敏感档案页不进入公开站点地图）', () => {
    expect(nuxtConfigSource).toContain("'/self-profile'")
  })

  it('生产构建通过 nitro 钩子携带 sql.js WASM 到服务端输出，不发布为公开静态资源', () => {
    expect(nuxtConfigSource).toContain('sql-wasm.wasm')
    expect(nuxtConfigSource).toContain('nitro')
    expect(nuxtConfigSource).toContain('serverDir')
    expect(nuxtConfigSource).not.toContain('publicDir')
  })
})
