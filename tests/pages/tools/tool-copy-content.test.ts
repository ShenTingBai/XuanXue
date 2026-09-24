import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 工具页信息层级与重复文案回归（文案去重轮，2026-09-21）。
 *
 * 只锁定「同一语义是否在多个信息层重复」这一件事，因此：
 * - 断言范围是每页 ToolEditorialShell 的**层级字符串**（副题 / 状态胶囊 / meta / 卷目脚注），
 *   不做全文关键词扫描——正文里的业务术语、错误、加载、stale 与保存确认属于状态文案，
 *   重复出现是正常的，不能被本测试误判为重复摘要；
 * - 断言的是「层级各司其职」而非具体措辞，改写文案只要不重新制造跨层重复即可通过。
 */

const toolPages = [
  'bazi',
  'shengxiao',
  'constellation',
  'zeji',
  'cezi',
  'hehun',
  'guming',
  'ziwei',
  'name-test',
  'yijing',
  'meihua',
  'status',
]

const ADULT_PUBLIC_PAGES = new Set(['shengxiao'])

/** 隐私 / 结果保存边界语义：必须留在**始终可见**的 masthead meta，不能只存在于卷目脚注。 */
const PRIVACY_PATTERN = /本页内存|不保存|不写服务器历史|不写历史|只在本页/

interface ShellLayers {
  openTag: string
  subtitle: string
  metaText: string
  indexFootnote: string
}

function readPage(name: string): string {
  return readFileSync(resolve(process.cwd(), `pages/tools/${name}.vue`), 'utf-8')
}

/** 取属性值：支持 `name="…"` 与 `:name="…"`，并把模板字面量里的表达式占位剥掉。 */
function extractAttr(openTag: string, name: string): string {
  const match = openTag.match(new RegExp(`:?${name}="([^"]*)"`))
  if (!match) return ''
  return match[1].replace(/\$\{[^}]*\}/g, '').trim()
}

/**
 * 抽取一页的信息层级字符串。
 *
 * `indexFootnote` 以源码常量读取（它不在外壳开标签里）；其余取外壳属性。
 */
function shellLayers(name: string): ShellLayers {
  const source = readPage(name)
  const openTag = source.match(/<ToolEditorialShell\b[\s\S]*?>/)![0]
  const footnoteMatch = source.match(/const indexFootnote = '((?:[^'\\]|\\.)*)'/)
  return {
    openTag,
    subtitle: extractAttr(openTag, 'subtitle'),
    metaText: extractAttr(openTag, ':meta-text') || extractAttr(openTag, 'meta-text'),
    indexFootnote: (footnoteMatch?.[1] ?? '').replace(/\\n/g, ' ').trim(),
  }
}

/** 最长公共子串长度：用于判断两层是否在复述同一句话。 */
function longestCommonSubstring(a: string, b: string): number {
  if (!a || !b) return 0
  let best = 0
  let previous = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(0)
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = previous[j - 1] + 1
        if (current[j] > best) best = current[j]
      }
    }
    previous = current
  }
  return best
}

describe('工具页统一外壳', () => {
  it('12 个工具页都组合 ToolEditorialShell，且自身不再自带第二套外壳', () => {
    for (const name of toolPages) {
      const source = readPage(name)
      expect(source, `${name}.vue 应使用 ToolEditorialShell`).toContain('ToolEditorialShell')
      expect(source, `${name}.vue 不应再引用 ToolPageLayout`).not.toContain('ToolPageLayout')
      expect(source, `${name}.vue 不应再自带 PageHero`).not.toContain('<PageHero')
    }
  })

  it('工具栏位由外壳统一渲染（Masthead / IndexNav / 页脚）', () => {
    const shell = readFileSync(
      resolve(process.cwd(), 'components/editorial/ToolEditorialShell.vue'),
      'utf-8',
    )
    expect(shell).toContain("import IndexNav from '~/components/editorial/IndexNav.vue'")
    expect(shell).toContain("import Masthead from '~/components/editorial/Masthead.vue'")
    expect(shell).toContain('PageFooter')
    expect(shell).toContain('editorial-shell')
    expect(shell).toContain('editorial-article')
  })

  it('内部/封存工具保留状态胶囊，公开工具不带胶囊', () => {
    for (const name of toolPages) {
      const { openTag } = shellLayers(name)
      if (ADULT_PUBLIC_PAGES.has(name)) {
        expect(openTag, `${name} 为公开工具，不应出现状态胶囊`).not.toContain('status-text')
      } else {
        expect(openTag, `${name} 应保留围栏状态胶囊`).toContain('status-text')
      }
    }
  })
})

describe('副题与 meta 各司其职（不互相复述）', () => {
  it('每页副题与 meta 既不相同也不复述同一句', () => {
    for (const name of toolPages) {
      const { subtitle, metaText } = shellLayers(name)
      expect(subtitle.length, `${name} 应有工具身份副题`).toBeGreaterThan(0)
      expect(metaText.length, `${name} 应有事实 meta`).toBeGreaterThan(0)
      expect(subtitle, `${name} 副题与 meta 不应完全相同`).not.toBe(metaText)
      // 8 个字符的公共片段即视为复述同一句话（工具名等短词不在此列）。
      const shared = longestCommonSubstring(subtitle, metaText)
      expect(shared, `${name} 副题与 meta 复述了同一句（公共片段 ${shared} 字）`).toBeLessThan(8)
    }
  })
})

describe('结果保存边界留在始终可见的层级', () => {
  const pagesWithPrivacyBoundary = toolPages.filter(name =>
    PRIVACY_PATTERN.test(shellLayers(name).metaText),
  )

  it('声明了结果保存边界的页面，把它放在 masthead meta（而非只放卷目脚注）', () => {
    // 卷目脚注 ≤920px 为 display:none，隐私/保存边界不能只存在于那里。
    expect(pagesWithPrivacyBoundary.length).toBeGreaterThanOrEqual(6)
    for (const name of pagesWithPrivacyBoundary) {
      const { metaText, indexFootnote } = shellLayers(name)
      expect(metaText, `${name} 的保存边界应在 meta`).toMatch(PRIVACY_PATTERN)
      // 同一句不得同时留在脚注：脚注是窄屏隐藏层，重复即为跨层堆叠。
      const footnoteRepeats = PRIVACY_PATTERN.test(indexFootnote)
      expect(footnoteRepeats, `${name} 的保存边界不应在脚注重复出现`).toBe(false)
    }
  })

  it('易经与梅花的内存结果提示只出现一次（跨层级计数）', () => {
    for (const name of ['yijing', 'meihua']) {
      const { subtitle, metaText, indexFootnote } = shellLayers(name)
      const occurrences = [subtitle, metaText, indexFootnote].filter(layer =>
        PRIVACY_PATTERN.test(layer),
      )
      expect(occurrences, `${name} 的「结果只在本页内存」只应出现在一个层级`).toHaveLength(1)
      expect(metaText, `${name} 的保存边界应留在 meta`).toMatch(PRIVACY_PATTERN)
    }
  })
})

describe('必要文案不得因去重而消失', () => {
  it('状态页仍是纯状态页，状态说明与返回入口保留', () => {
    const status = readPage('status')
    expect(status).toContain('功能整理中')
    expect(status).toContain('暂不提供新的计算结果')
    expect(status).toContain('返回首页')
    expect(status).not.toContain('<input')
  })

  it('生肖的输入隐私说明与依据范围仍在', () => {
    const shengxiao = readPage('shengxiao')
    expect(shengxiao).toContain('不提交服务器')
    expect(shengxiao).toContain('不保存历史')
    expect(shengxiao).toContain('data-shengxiao-meta')
    expect(shengxiao).toContain('依据与范围')
  })

  it('八字保留三柱边界与不输出说明', () => {
    const bazi = readPage('bazi')
    expect(bazi).toContain('不含时辰')
    // 「本版不输出以下内容」在不输出闭集卡片里（具体清单由 BaziEvidenceScope 组件渲染）。
    expect(bazi).toContain('本版不输出以下内容')
    expect(bazi).toContain('本页不能回答')
  })
})

/**
 * 残余重复收敛（2026-09-24）。
 *
 * 上一轮已把四类残余重复记入验证文档；本轮逐页收敛，断言口径与上一轮一致：
 * 只锁「同一事实是否在多个信息层重复」，不锁具体措辞，也不做全文关键词计数——
 * 否则删除必需来源、状态或操作提示反而会让测试通过。
 *
 * 关键前提：`IndexNav` 卷目脚注在 ≤920px 为 `display:none`，因此脚注**不能**是
 * 任一事实的唯一落点；断言里凡要求「主要落点」的，都必须落在正文可见层。
 */
describe('残余重复收敛（四页）', () => {
  /** 年界 / 支持范围：生肖完整口径只应在一个首屏块出现，且不依赖脚注。 */
  it('生肖年界与支持范围只在事实条出现，脚注不复述', () => {
    const shengxiao = readPage('shengxiao')
    const { indexFootnote } = shellLayers('shengxiao')

    // 事实条承担完整口径（报头补充区，无断点隐藏）。
    const metaMatch = shengxiao.match(/data-shengxiao-meta[\s\S]*?<\/dl>/)
    expect(metaMatch, '生肖应有 [data-shengxiao-meta] 事实条').not.toBeNull()
    const facts = metaMatch![0]
    expect(facts).toContain('年界口径')
    expect(facts).toContain('正月初一')
    expect(facts).toContain('1901-01-01')

    // 脚注不再复述年界/支持范围——它是窄屏隐藏层，重复即为跨层堆叠。
    expect(indexFootnote, '生肖脚注不应复述年界').not.toContain('正月初一')
    expect(indexFootnote, '生肖脚注不应复述支持范围').not.toContain('1901-01-01')
    expect(indexFootnote, '生肖脚注不应复述支持范围').not.toContain('支持')
  })

  /** 称骨农历口径：只在输入区警示行出现，脚注不复述。 */
  it('称骨农历口径只在输入警示行出现', () => {
    const guming = readPage('guming')
    const { indexFootnote } = shellLayers('guming')

    // 输入区警示行是窄屏唯一可见实例（紧邻出生输入）。
    expect(guming, '称骨输入区应保留农历口径警示').toContain('称骨以农历为准')

    // 脚注不再复述同一句；档案换算边界作为独立事实保留。
    expect(indexFootnote, '称骨脚注不应复述农历口径').not.toContain('称骨以农历为准')
    expect(indexFootnote, '称骨脚注应保留档案换算边界').toContain('换算')
  })

  /**
   * 择日评分权重：三层各司其职——meta 承担始终可见的短事实，zejiSynthesis 提供展开证据，
   * 脚注只留日期范围、不复述权重解释。
   *
   * 背景：IndexNav 脚注 ≤920px 隐藏，「注」面板需点击展开，二者都不能承担
   * 「评分权重无经典量化标准」这一可信度前提的唯一落点。
   */
  it('择日评分权重在 meta 有短事实，脚注不复述，来源详解保留', () => {
    const zeji = readPage('zeji')
    const { metaText, indexFootnote } = shellLayers('zeji')

    // meta 是始终可见层：必须直接说明权重属工程校准、无经典原文量化标准。
    expect(metaText, '择日 meta 应说明评分为工程校准').toContain('工程校准')
    expect(metaText, '择日 meta 应说明无经典量化标准').toContain('无经典原文量化标准')

    // 正式来源列表不得因加入短事实而被挤掉（依据仍是可信度的一部分）。
    expect(metaText, '择日 meta 应保留经典来源依据').toContain('协纪辨方书')

    // 详细解释留在「注」面板的来源数据（禁改），作为展开证据。
    expect(zeji, '择日来源数据应保留权重来源性质').toContain('无经典原文量化标准')

    // 脚注不复述权重解释，只保留可查范围这一独立边界。
    expect(indexFootnote, '择日脚注不应复述评分权重性质').not.toContain('无经典量化标准')
    expect(indexFootnote, '择日脚注不应复述工程校准').not.toContain('工程校准')
    expect(indexFootnote, '择日脚注应保留可查范围').toContain('三个月')
  })

  /** 星座：meta / 脚注不重复解释引擎，正式来源标题与引用 ID 仍在。 */
  it('星座引擎事实不在 meta 与脚注重复，正式来源保留', () => {
    const constellation = readPage('constellation')
    const { metaText, indexFootnote } = shellLayers('constellation')

    // 引擎依据只在 meta 说明（短事实层）。
    expect(metaText, '星座 meta 应保留引擎依据').toContain('astronomy-engine')
    expect(indexFootnote, '星座脚注不应复述引擎依据').not.toContain('VSOP87')
    expect(indexFootnote, '星座脚注不应复述引擎名').not.toContain('astronomy-engine')

    // 正式引用标题与出处保留在经典来源列表，不因关键词重复而删除。
    expect(constellation, '星座应保留 VSOP87 正式来源引用').toContain('VSOP87')
    expect(constellation, '星座应保留来源出处标注').toContain('星盘计算')
  })
})
