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

/** 全局控件规范：choice-control 的选中态（含方框勾选）只由全局 CSS 提供，组件不得自带一套。 */
const globalCssSource = readFileSync(resolve(process.cwd(), 'assets/css/main.css'), 'utf-8')

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

  it('页面使用统一工具外壳与 R5 的十个组件（不再自带外壳结构）', () => {
    const imported = [...pageSource.matchAll(/from '~\/components\/([^']+)'/g)].map(
      match => match[1],
    )
    // 卷目 / 报头 / 页脚由 ToolEditorialShell 组合，页面不再各自渲染一份。
    expect(new Set(imported)).toEqual(
      new Set([
        'tools/ScrollTopButton.vue',
        'editorial/ToolEditorialShell.vue',
        'editorial/SectionHeading.vue',
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

  it('页面不再使用工具页外壳：ToolPageLayout 与 PageHero 不得回归', () => {
    // 出版版外壳由共用组合件提供：页面只声明分节与内容，不重复渲染外壳 DOM。
    for (const identifier of [
      'ToolPageLayout',
      'PageHero',
      'editorial/IndexNav.vue',
      'editorial/Masthead.vue',
    ]) {
      expect(pageSource, `pages/tools/bazi.vue 不应再引用 ${identifier}`).not.toContain(identifier)
    }
    expect(pageSource, '页面应使用统一工具外壳组合件').toContain(
      "import ToolEditorialShell from '~/components/editorial/ToolEditorialShell.vue'",
    )
    expect(pageSource).toContain('editorial-section')

    // 外壳 DOM 契约（editorial-shell / editorial-article / 卷目 / 报头 / 页脚）由组合件保证：
    // 断言组合件源码，页面改用组合件后这些类不再出现在页面自身。
    const shellSource = readFileSync(
      resolve(process.cwd(), 'components/editorial/ToolEditorialShell.vue'),
      'utf-8',
    )
    for (const className of ['editorial-shell', 'editorial-article']) {
      expect(shellSource, `ToolEditorialShell 应渲染 .${className}`).toContain(className)
    }
    for (const part of [
      'editorial/IndexNav.vue',
      'editorial/Masthead.vue',
      'tools/PageFooter.vue',
    ]) {
      expect(shellSource, `ToolEditorialShell 应组合 ${part}`).toContain(part)
    }
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

  it('交互反馈：勾选框不用原生样式，两处折叠件都有可展开标记', () => {
    // 原生 checkbox 会在纸/朱砂体系里出现系统蓝勾（用户 2026-09-15 复核指出），
    // 与历法单选同法改为 sr-only input + 全局 choice-control 方框指示器。
    const inputSource = componentSources.get('BaziInputForm.vue') ?? ''
    expect(inputSource, '十四周岁勾选框应改为 sr-only').toContain('class="sr-only"')
    expect(inputSource, '应保留原生 checkbox').toContain('type="checkbox"')
    expect(inputSource, '应使用共享 choice-control').toContain('choice-control')
    expect(inputSource, '应使用方框指示器').toContain('choice-control__indicator--box')

    // 旧兼容钩子必须彻底删除。类名用拼装而非字面量：本计划的 grep 门禁要求本文件 0 次命中，
    // 写下字面量会让检测命令自身命中（自指误报），断言强度不变。
    const legacyHookClass = ['bazi', 'check'].join('-')
    expect(inputSource, '组件不应残留旧兼容钩子').not.toContain(legacyHookClass)

    // 方框勾选态由全局规范提供：断言全局 CSS 确有该规则，且不含工具专属类。
    expect(globalCssSource, '全局 CSS 应定义方框勾选态填充').toContain(
      '.choice-control input:checked + .choice-control__indicator--box',
    )
    expect(globalCssSource, '全局 CSS 不应出现工具专属类').not.toContain(legacyHookClass)

    // 折叠件必须给出可视线索：三柱卡用方形 ＋/－ 伪元素，六问用 bazi-fold-mark。
    const pillarSource = componentSources.get('BaziPillarCard.vue') ?? ''
    expect(pillarSource, '三柱卡折叠标记应有展开态反色').toContain(
      'details[open] > .bazi-summary::before',
    )
    const guideSource = componentSources.get('BaziReadingGuide.vue') ?? ''
    expect(guideSource, '六问应有可展开标记').toContain('bazi-fold-mark')

    // 本轮新增的交互样式只用既有令牌与 color-mix，不引入 rgba。
    for (const [name, source] of componentSources) {
      expect(source, `${name} 不应出现 rgba(`).not.toContain('rgba(')
    }
  })

  it('交互反馈：卷目当前节用指示条 + 朱砂序号，不再只有 1px 下划线', () => {
    const indexNav = readFileSync(
      resolve(process.cwd(), 'components/editorial/IndexNav.vue'),
      'utf-8',
    )
    expect(indexNav, '活动项应有左侧指示条').toContain('.index-link.is-active::before')
    expect(indexNav, '活动项序号应变朱砂').toContain('.index-link.is-active .index-num')
    expect(indexNav, '悬停应有底色反馈').toContain('.index-link:hover')
    expect(indexNav, '窄屏应改用下边框').toContain('border-bottom: 2px solid var(--color-cinnabar)')
    expect(indexNav, '不应再出现旧的 1px 下划线实现').not.toContain('.index-label::after')
  })

  it('空态不得出现预选值：三个下拉的占位符必须落在可选中的第一项', () => {
    // 回归背景（2026-09-15 真机截图发现）：占位符写成 disabled 时，浏览器在动态插入选项后会
    // 触发 reset，跳过 disabled 项而回退到第一个真实选项——空态因此显示「2026 / 1月 / 1日」，
    // 看起来像预填了默认值（契约要求无任何默认值）。占位符可选中后，reset 会停在占位符上。
    const inputSource = componentSources.get('BaziInputForm.vue') ?? ''
    const placeholders = [...inputSource.matchAll(/<option value=""([^>]*)>/g)].map(m => m[1] ?? '')
    expect(placeholders).toHaveLength(3)
    for (const attrs of placeholders) {
      expect(attrs, '占位符不得带 disabled').not.toContain('disabled')
    }
    for (const label of ['选择年份', '选择月份', '选择日期']) {
      expect(inputSource).toContain(label)
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
