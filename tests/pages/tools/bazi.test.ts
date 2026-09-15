import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 八字页静态回归：新页面不得引用任何第三方历法库，也不得重新挂回旧资产。
 *
 * 依据契约 §11（页面与组件不接触历法库）、设计文档 §8（旧资产保留不删但不被引用）：
 * 这些断言用「旧实现里真实出现过的标识符」而不是泛泛的词面扫描，
 * 避免把「本页不输出 0–100 评分」这类正当声明误判为违规。
 */

const pageSource = readFileSync(resolve(process.cwd(), 'pages/tools/bazi.vue'), 'utf-8')

const componentDir = resolve(process.cwd(), 'components/bazi')
const componentFiles = readdirSync(componentDir).filter(name => name.endsWith('.vue'))
const componentSources = new Map(
  componentFiles.map(name => [name, readFileSync(resolve(componentDir, name), 'utf-8')]),
)

/** 旧页引用过、R5 明确不再使用的实现与组件标识符。 */
const legacyIdentifiers = [
  'useBaZi',
  'useSolarTerms',
  'useShenSha',
  'useLiuNian',
  'calculateShenSha',
  'calculateLiuNian',
  'components/tools/bazi/',
  'BaziGrid',
  'ElementAnalysis',
  'DayMasterCard',
  'DaYunTimeline',
  'LiuNianTimeline',
  'ShenShaPanel',
  'BaziInfoSidebar',
  'SectionNav',
  'DayMasterSeal',
  'ProfileAutoFillBanner',
  'MethodologyNote',
  'SkeletonCard',
  'SkeletonBars',
]

/** 第三方历法库：只允许 `utils/bazi/calendar-adapter.ts` 引用（契约 §11）。 */
const calendarLibraries = ['lunar-javascript', 'iztro', 'astronomy-engine']

describe('八字页静态回归（R5）', () => {
  it('页面与 components/bazi 组件都不引用任何第三方历法库', () => {
    for (const library of calendarLibraries) {
      expect(pageSource, `pages/tools/bazi.vue 不应引用 ${library}`).not.toContain(library)
      for (const [name, source] of componentSources) {
        expect(source, `${name} 不应引用 ${library}`).not.toContain(library)
      }
    }
  })

  it('页面不再引用旧八字实现与旧区块组件', () => {
    for (const identifier of legacyIdentifiers) {
      expect(pageSource, `pages/tools/bazi.vue 不应引用 ${identifier}`).not.toContain(identifier)
    }
  })

  it('页面不引用封存的旧历史通道与旧外壳组件', () => {
    for (const name of [
      '/api/divinations',
      'HistoryModal',
      'ToolToolbar',
      'EntertainmentDisclaimer',
    ]) {
      expect(pageSource, `pages/tools/bazi.vue 不应引用 ${name}`).not.toContain(name)
    }
  })

  it('页面只使用 R5 的十个新组件与四个通用组件（含统一认证弹层）', () => {
    const imported = [...pageSource.matchAll(/from '~\/components\/([^']+)'/g)].map(
      match => match[1],
    )
    expect(new Set(imported)).toEqual(
      new Set([
        'tools/ToolPageLayout.vue',
        'tools/PageHero.vue',
        'tools/ScrollTopButton.vue',
        'auth/AuthDialog.vue',
        'bazi/BaziInputForm.vue',
        'bazi/BaziStatusBanner.vue',
        'bazi/BaziPillarCard.vue',
        'bazi/BaziCandidatePanel.vue',
        'bazi/BaziDateComparison.vue',
        'bazi/BaziElementComposition.vue',
        'bazi/BaziReadingGuide.vue',
        'bazi/BaziEvidenceScope.vue',
        'bazi/BaziSaveDialog.vue',
        'bazi/BaziHistoryPanel.vue',
      ]),
    )
  })

  it('R5-C 设计规格要求的新全局类被页面使用，且不在组件里私自复制实现', () => {
    // 三柱一览用全局类（Ⅲ 段重心）；五行构成不重复造布局类。
    for (const className of ['bazi-pillar-summary', 'bazi-pillar-cell', 'bazi-pillar-wuxing']) {
      expect(pageSource, `pages/tools/bazi.vue 应使用 .${className}`).toContain(className)
    }
    // 候选轨道样式只能来自全局类，组件不得再内联一套轨道底色。
    const candidateSource = componentSources.get('BaziCandidatePanel.vue') ?? ''
    expect(candidateSource).toContain('bazi-candidate-lane')
    expect(candidateSource).not.toContain('rgba(')
  })

  it('五行构成组件只做字面统计：模板不出现百分比、比例或旺衰判断', () => {
    const composition = componentSources.get('BaziElementComposition.vue') ?? ''
    expect(composition).toContain('data-bazi-element-composition')
    // 只看 <template> 元素本身（不含 script 注释与 style 里的 CSS 百分比）。
    const template = composition.slice(
      composition.indexOf('<template>'),
      composition.indexOf('</template>'),
    )
    expect(template.length).toBeGreaterThan(0)
    expect(template, '模板不应出现百分比号').not.toContain('%')
    expect(template, '模板不应出现「比例」').not.toContain('比例')
    for (const banned of [
      '喜用神',
      '忌神',
      '评分',
      '旺衰判断',
      '缺木',
      '缺火',
      '缺土',
      '缺金',
      '缺水',
    ]) {
      expect(template, `模板不应出现「${banned}」`).not.toContain(banned)
    }
  })

  it('页面与组件均为 UTF-8 无 BOM，且不含乱码特征', () => {
    const files: Array<[string, string]> = [
      ['pages/tools/bazi.vue', pageSource],
      ...componentSources.entries(),
    ]
    for (const [name, source] of files) {
      // BOM：EF BB BF 的字符串形态。
      expect(source.charCodeAt(0), `${name} 不应带 BOM`).not.toBe(0xfeff)
      expect(source, `${name} 不应含替换字符`).not.toContain('\uFFFD')
    }
  })
})
