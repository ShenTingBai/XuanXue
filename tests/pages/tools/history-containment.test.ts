import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const toolPages = [
  'bazi',
  'cezi',
  'constellation',
  'guming',
  'hehun',
  'meihua',
  'name-test',
  'shengxiao',
  'yijing',
  'zeji',
  'ziwei',
]

const toolPageSources = new Map(
  toolPages.map(name => {
    const source = readFileSync(resolve(process.cwd(), `pages/tools/${name}.vue`), 'utf-8')
    return [name, source]
  }),
)

describe('R1 历史接线收口（静态回归清单）', () => {
  it('11 个工具页均不再引用 /api/divinations', () => {
    for (const [name, source] of toolPageSources) {
      expect(source, `${name}.vue`).not.toContain('/api/divinations')
    }
  })

  it('11 个工具页均不再定义或调用 saveDivinationResult', () => {
    for (const [name, source] of toolPageSources) {
      expect(source, `${name}.vue`).not.toContain('saveDivinationResult')
    }
  })

  it('11 个工具页均不再挂载 HistoryModal', () => {
    for (const [name, source] of toolPageSources) {
      expect(source, `${name}.vue`).not.toContain('<HistoryModal')
    }
  })

  it('11 个工具页均不再传 show-history=true', () => {
    for (const [name, source] of toolPageSources) {
      expect(source, `${name}.vue`).not.toContain('show-history')
    }
  })

  it('11 个工具页均不再渲染“浏览历史”按钮', () => {
    for (const [name, source] of toolPageSources) {
      expect(source, `${name}.vue`).not.toContain('浏览历史')
    }
  })

  it('首页不请求历史列表', () => {
    const indexSource = readFileSync(resolve(process.cwd(), 'pages/index.vue'), 'utf-8')
    expect(indexSource).not.toContain('/api/divinations')
  })
})
