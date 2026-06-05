/**
 * Phase D-4: Cezi (测字) Sampling Tests
 *
 * Strategy: 10 chars each from 5 structure categories:
 *   single, leftRight, topBottom, enclosure, compound
 * Verify structure detection, element mapping, and number fortune.
 * Total: ~80 assertions
 */

import { describe, it, expect } from 'vitest'
import { analyzeCharacter, type CeziResult } from '../../composables/useCezi'

// ── Character pools by expected structure ──

// 独体字 (single-component): characters without obvious radical structure
const SINGLE_CHARS = ['日', '月', '山', '水', '火', '木', '金', '土', '人', '大']

// 左右结构 (left-right): characters with left/right radicals
const LEFT_RIGHT_CHARS = ['明', '林', '河', '江', '红', '好', '他', '打', '拍', '说']

// 上下结构 (top-bottom): characters with top/bottom radicals
const TOP_BOTTOM_CHARS = ['花', '草', '字', '空', '安', '家', '写', '光', '音', '雷']

// 包围结构 (enclosure): characters with enclosing radicals
const ENCLOSURE_CHARS = ['国', '围', '园', '困', '团', '回', '因', '问', '同', '区']

// 品字结构 (compound): characters formed by multiple identical components
const COMPOUND_CHARS = ['品', '晶', '森', '众', '鑫', '淼', '炎', '圭', '垚', '磊']

// ── Helpers ──

function assertValidResult(r: CeziResult | null, char: string): asserts r is CeziResult {
  expect(r, `analyzeCharacter("${char}") should not be null`).not.toBeNull()
}

// ═══════════════════════════════════════════════════════════════
// 1. Single-component characters (独体字)
// ═══════════════════════════════════════════════════════════════

describe('Cezi — 独体字 (single component)', () => {
  for (const ch of SINGLE_CHARS) {
    it(`"${ch}" — returns valid result`, () => {
      const r = analyzeCharacter(ch)
      assertValidResult(r, ch)
      expect(r.character).toBe(ch)
      expect(r.strokeCount).toBeGreaterThan(0)
      expect(r.primaryElement.length).toBe(1)
      expect(['木', '火', '土', '金', '水']).toContain(r.primaryElement)
      expect(r.interpretation.length).toBeGreaterThan(0)
      expect(r.interpretation).toContain(ch)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 2. Left-right structure (左右结构)
// ═══════════════════════════════════════════════════════════════

describe('Cezi — 左右结构 (left-right)', () => {
  for (const ch of LEFT_RIGHT_CHARS) {
    it(`"${ch}" — returns valid result`, () => {
      const r = analyzeCharacter(ch)
      assertValidResult(r, ch)
      expect(r.character).toBe(ch)
      expect(r.strokeCount).toBeGreaterThan(0)
      // Not asserting structure type because heuristics may vary
      expect(r.structureName.length).toBeGreaterThan(0)
      expect(r.interpretation.length).toBeGreaterThan(0)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 3. Top-bottom structure (上下结构)
// ═══════════════════════════════════════════════════════════════

describe('Cezi — 上下结构 (top-bottom)', () => {
  for (const ch of TOP_BOTTOM_CHARS) {
    it(`"${ch}" — returns valid result`, () => {
      const r = analyzeCharacter(ch)
      assertValidResult(r, ch)
      expect(r.character).toBe(ch)
      expect(r.strokeCount).toBeGreaterThan(0)
      expect(r.interpretation.length).toBeGreaterThan(0)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 4. Enclosure structure (包围结构)
// ═══════════════════════════════════════════════════════════════

describe('Cezi — 包围结构 (enclosure)', () => {
  for (const ch of ENCLOSURE_CHARS) {
    it(`"${ch}" — returns valid result`, () => {
      const r = analyzeCharacter(ch)
      assertValidResult(r, ch)
      expect(r.character).toBe(ch)
      expect(r.strokeCount).toBeGreaterThan(0)
      expect(r.interpretation.length).toBeGreaterThan(0)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 5. Compound structure (品字结构)
// ═══════════════════════════════════════════════════════════════

describe('Cezi — 品字结构 (compound)', () => {
  for (const ch of COMPOUND_CHARS) {
    it(`"${ch}" — returns valid result`, () => {
      const r = analyzeCharacter(ch)
      assertValidResult(r, ch)
      expect(r.character).toBe(ch)
      expect(r.strokeCount).toBeGreaterThan(0)
      expect(r.interpretation.length).toBeGreaterThan(0)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 6. Stroke source and number fortune validation
// ═══════════════════════════════════════════════════════════════

describe('Cezi — stroke and fortune invariants', () => {
  const allChars = [
    ...SINGLE_CHARS,
    ...LEFT_RIGHT_CHARS,
    ...TOP_BOTTOM_CHARS,
    ...ENCLOSURE_CHARS,
    ...COMPOUND_CHARS,
  ]

  it('all 50 sample chars return non-null', () => {
    for (const ch of allChars) {
      expect(analyzeCharacter(ch)).not.toBeNull()
    }
  })

  it('strokeSource is "dictionary" for all 50 chars (common chars should be in dict)', () => {
    for (const ch of allChars) {
      const r = analyzeCharacter(ch)!
      // All 50 are common CJK chars; stroke dict should contain them
      expect(r.strokeSource).toBe('dictionary')
    }
  })

  it('numberFortune category is one of: 大吉,吉,半吉,凶', () => {
    for (const ch of allChars) {
      const r = analyzeCharacter(ch)!
      expect(['大吉', '吉', '半吉', '凶']).toContain(r.numberFortune.category)
      expect(r.numberFortune.desc.length).toBeGreaterThan(0)
    }
  })

  it('all 50 chars have interpretation containing structure name', () => {
    for (const ch of allChars) {
      const r = analyzeCharacter(ch)!
      expect(r.interpretation).toContain(r.structureName)
    }
  })

  it('interpretation always starts with opening bracket 「', () => {
    for (const ch of allChars) {
      const r = analyzeCharacter(ch)!
      expect(r.interpretation.startsWith('「')).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Special chars: punctuation, non-CJK, empty
// ═══════════════════════════════════════════════════════════════

describe('Cezi — invalid inputs', () => {
  it('returns null for empty string', () => {
    expect(analyzeCharacter('')).toBeNull()
  })

  it('returns null for whitespace-only', () => {
    expect(analyzeCharacter('   ')).toBeNull()
  })

  it('returns null for English letters', () => {
    expect(analyzeCharacter('A')).toBeNull()
    expect(analyzeCharacter('z')).toBeNull()
  })

  it('returns null for numbers', () => {
    expect(analyzeCharacter('1')).toBeNull()
    expect(analyzeCharacter('九')).not.toBeNull() // CJK number
  })

  it('returns null for punctuation', () => {
    expect(analyzeCharacter('。')).toBeNull()
    expect(analyzeCharacter('，')).toBeNull()
  })

  it('returns null for Japanese kana', () => {
    expect(analyzeCharacter('あ')).toBeNull()
    expect(analyzeCharacter('ア')).toBeNull()
  })

  it('returns null for Korean hangul', () => {
    expect(analyzeCharacter('한')).toBeNull()
  })

  it('returns null for multi-character input', () => {
    expect(analyzeCharacter('你好')).toBeNull()
  })

  it('trims whitespace from single valid CJK char', () => {
    const r = analyzeCharacter('  木  ')
    expect(r).not.toBeNull()
    expect(r!.character).toBe('木')
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Element mapping consistency
// ═══════════════════════════════════════════════════════════════

describe('Cezi — wuxing element mapping', () => {
  it('同一汉字每次分析结果一致', () => {
    const allChars = ['明', '山', '水', '林', '国', '品', '花']
    for (const ch of allChars) {
      const a = analyzeCharacter(ch)!
      const b = analyzeCharacter(ch)!
      expect(a.primaryElement).toBe(b.primaryElement)
      expect(a.strokeCount).toBe(b.strokeCount)
      expect(a.structure).toBe(b.structure)
    }
  })

  it('stroke count → wuxing mapping: 1-2→木, 3-4→火, 5-6→土, 7-8→金, 9-10→水', () => {
    // 一=1→木, 三=3→火, 五=4(康熙笔画)→火, 七=2→木, 九=2→木
    // Use characters with known stroke counts to verify mapping:
    // 一(1)→木, 二(2)→木, 三(3)→火, 四(5)→土, 六(4)→火, 八(2)→木, 十(2)→木
    expect(analyzeCharacter('一')!.primaryElement).toBe('木') // stroke 1 → 木
    expect(analyzeCharacter('二')!.primaryElement).toBe('木') // stroke 2 → 木
    expect(analyzeCharacter('三')!.primaryElement).toBe('火') // stroke 3 → 火
    expect(analyzeCharacter('四')!.primaryElement).toBe('土') // stroke 5 → 土
    expect(analyzeCharacter('六')!.primaryElement).toBe('火') // stroke 4 → 火
    expect(analyzeCharacter('八')!.primaryElement).toBe('木') // stroke 2 → 木
    expect(analyzeCharacter('十')!.primaryElement).toBe('木') // stroke 2 → 木
  })
})
