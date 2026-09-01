import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const nuxtConfigSource = readFileSync(resolve(process.cwd(), 'nuxt.config.ts'), 'utf-8')
const hiddenToolNames = ['紫微斗数', '紫微命盘', '合婚', '梅花易数', '梅花']

function getPublicMetadataBlock(source: string): string {
  const start = source.indexOf('pwa:')
  const end = source.indexOf('routeRules:', start)

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)

  return source.slice(start, end)
}

describe('全局公开元数据', () => {
  it('防止隐藏工具重新出现在 PWA、SEO 和分享元数据中', () => {
    const metadataBlock = getPublicMetadataBlock(nuxtConfigSource)

    for (const hiddenToolName of hiddenToolNames) {
      expect(metadataBlock).not.toContain(hiddenToolName)
    }

    expect(metadataBlock).toContain('传统文化自我探索')
    expect(metadataBlock).toContain('八字、易经、生肖、星座、择日')
  })
})
