import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const indexPageSource = readFileSync(resolve(process.cwd(), 'pages/index.vue'), 'utf-8')
const hiddenToolNames = ['紫微斗数', '紫微命盘', '合婚', '梅花易数', '梅花']

function getSeoBlock(source: string): string {
  const start = source.indexOf('useSeoMeta({')
  const end = source.indexOf('\n})', start)

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)

  return source.slice(start, end + 3)
}

function getGuestTemplate(source: string): string {
  const startMarker = '<template v-if="sessionReady && !currentProfile">'
  const endMarker = '<template v-if="sessionReady && currentProfile">'
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)

  return source.slice(start, end)
}

describe('首页访客公开文案', () => {
  it('SEO 仅介绍当前可见的探索工具', () => {
    const seoBlock = getSeoBlock(indexPageSource)

    for (const hiddenToolName of hiddenToolNames) {
      expect(seoBlock).not.toContain(hiddenToolName)
    }

    const listedToolNames = ['八字', '易经', '生肖', '星座', '择日']
    expect(listedToolNames.filter(toolName => seoBlock.includes(toolName))).toHaveLength(5)
  })

  it('未登录访客模板不宣传隐藏工具', () => {
    const guestTemplate = getGuestTemplate(indexPageSource)

    for (const hiddenToolName of hiddenToolNames) {
      expect(guestTemplate).not.toContain(hiddenToolName)
    }
  })

  it('仍保留隐藏工具的兼容目录元数据', () => {
    expect(indexPageSource).toContain("id: 'ziwei'")
    expect(indexPageSource).toContain("id: 'hehun'")
    expect(indexPageSource).toContain("id: 'meihua'")
  })
})
