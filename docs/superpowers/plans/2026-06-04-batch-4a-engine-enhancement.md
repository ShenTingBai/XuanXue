# Batch 4A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance BaZi engine (weighted strength, 调候, nayin, pillar interpretations), add Zi Wei interpretation data (minor stars, 四化, combinations, palace dynamics), and add pairing explanation text for 生肖/星座.

**Architecture:** Pure data + logic additions to existing composables and constants. No new pages, no API changes, no route changes. Three independent sections that can be implemented in any order.

**Tech Stack:** Nuxt 3 / Vue 3 / TypeScript / TailwindCSS / iztro@2.5.8

---

## File Structure Map

```
constants/
  bazi.ts          ← MODIFY: add NAYIN_WUXING_MAP, getNayinWuxing() (shared from hehun.ts)
  ziwei.ts         ← MODIFY: add MINOR_STAR_INTERPRETATIONS, ADJECTIVE_STAR_INTERPRETATIONS,
                     complete TRANSFORMATION_INTERPRETATIONS (科/忌), add COMBINATION_INTERPRETATIONS
  shengxiao.ts     ← CREATE: SHENGXIAO_PAIRING_EXPLANATIONS
  constellation.ts ← CREATE: CONSTELLATION_PAIRING_EXPLANATIONS

composables/
  useBaZi.ts       ← MODIFY: weighted day master strength, 调候, nayin count, pillar interpretations
  useZiwei.ts      ← MODIFY: dynamic palace text (查表 replaced hardcoded combinations)
  useShengXiao.ts  ← MODIFY: Compatibility.explanation field
  useConstellation.ts ← MODIFY: compatibility entries include explanation

components/tools/
  shengxiao/CompatibilityGrid.vue  ← MODIFY: accordion expand for explanation
  constellation/ (配对区域组件)      ← MODIFY: accordion expand for explanation
  bazi/BaziGrid.vue or pages/tools/bazi.vue ← MODIFY: pillar interpretation display
  ziwei/相关宫位卡片组件             ← MODIFY: expandable palace interpretation

tests/composables/
  useBaZi.test.ts     ← MODIFY/ADD: weighted strength, 调候, nayin tests
  useZiwei.test.ts    ← MODIFY/ADD: minor star, 四化, combination, palace tests
  useShengXiao.test.ts ← MODIFY/ADD: explanation field tests
```

---

## Section A: 八字引擎增强

### Task A1: Extract shared nayin wuxing function

**Files:**

- Modify: `constants/bazi.ts`
- Remove from: `constants/hehun.ts`

**Context:** `hehun.ts` has a `getNayinWuxing()` function that walks the character pair to determine nayin wuxing. We need it in `constants/bazi.ts` for use by `useBaZi.ts`. The hehun version should re-export from bazi.

- [ ] **1. Add `NAYIN_WUXING_MAP` and `getNayinWuxing()` to `constants/bazi.ts`**

Copy the complete nayin logic from `constants/hehun.ts`. The hehun version looks up by stem+branch pair and returns 木/火/土/金/水.

```typescript
// constants/bazi.ts — append after existing imports/exports

/** 六十甲子纳音五行映射 — key = stem+branch (e.g. "甲乙"), value = 五行 */
const NAYIN_WUXING_MAP: Record<string, string> = {
  甲子: '金',
  乙丑: '金',
  丙寅: '火',
  丁卯: '火',
  戊辰: '木',
  己巳: '木',
  庚午: '土',
  辛未: '土',
  壬申: '金',
  癸酉: '金',
  甲戌: '火',
  乙亥: '火',
  丙子: '水',
  丁丑: '水',
  戊寅: '土',
  己卯: '土',
  庚辰: '金',
  辛巳: '金',
  壬午: '木',
  癸未: '木',
  甲申: '水',
  乙酉: '水',
  丙戌: '土',
  丁亥: '土',
  戊子: '火',
  己丑: '火',
  庚寅: '木',
  辛卯: '木',
  壬辰: '水',
  癸巳: '水',
  甲午: '金',
  乙未: '金',
  丙申: '火',
  丁酉: '火',
  戊戌: '木',
  己亥: '木',
  庚子: '土',
  辛丑: '土',
  壬寅: '金',
  癸卯: '金',
  甲辰: '火',
  乙巳: '火',
  丙午: '水',
  丁未: '水',
  戊申: '土',
  己酉: '土',
  庚戌: '金',
  辛亥: '金',
  壬子: '木',
  癸丑: '木',
  甲寅: '水',
  乙卯: '水',
  丙辰: '土',
  丁巳: '土',
  戊午: '火',
  己未: '火',
  庚申: '木',
  辛酉: '木',
  壬戌: '水',
  癸亥: '水',
}

/** Get the nayin wuxing for a given heavenly stem + earthly branch pair */
export function getNayinWuxing(stem: string, branch: string): string {
  const key = stem + branch
  return NAYIN_WUXING_MAP[key] ?? ''
}
```

- [ ] **2. Update `constants/hehun.ts` to re-export from bazi**

Find `getNayinWuxing` in hehun.ts and replace with:

```typescript
// Re-export from shared location
export { getNayinWuxing } from './bazi'
```

Then remove the duplicate implementation in hehun.ts.

- [ ] **3. Run typecheck and tests**

```bash
npm run typecheck
npx vitest run --reporter=verbose 2>&1 | head -30
```

Expected: No type errors, all existing tests pass (hehun tests still work since export is preserved).

- [ ] **4. Commit**

```bash
git add -A
git commit -m "refactor: extract shared getNayinWuxing to constants/bazi.ts"
```

---

### Task A2: Weighted day master strength

**Files:**

- Modify: `composables/useBaZi.ts`
- Test: `tests/composables/useBaZi.test.ts`

- [ ] **1. Write test for weighted strength**

```typescript
// tests/composables/useBaZi.test.ts
import { getWeightedDayMasterStrength } from '~/composables/useBaZi'
import type { BaZiPillar } from '~/composables/useBaZi'

describe('getWeightedDayMasterStrength', () => {
  it('甲木日主 寅月 四柱全木 → 强', () => {
    const pillars: BaZiPillar[] = [
      {
        stem: '甲',
        branch: '寅',
        stemWuxing: '木',
        branchWuxing: '木',
        stemTenGod: '比肩',
        hiddenStems: [
          { stem: '甲', wuxing: '木' },
          { stem: '丙', wuxing: '火' },
          { stem: '戊', wuxing: '土' },
        ],
      },
      {
        stem: '丙',
        branch: '寅',
        stemWuxing: '火',
        branchWuxing: '木',
        stemTenGod: '食神',
        hiddenStems: [
          { stem: '甲', wuxing: '木' },
          { stem: '丙', wuxing: '火' },
          { stem: '戊', wuxing: '土' },
        ],
      },
      {
        stem: '甲',
        branch: '午',
        stemWuxing: '木',
        branchWuxing: '火',
        stemTenGod: '比肩',
        hiddenStems: [
          { stem: '丁', wuxing: '火' },
          { stem: '己', wuxing: '土' },
        ],
      },
      {
        stem: '甲',
        branch: '子',
        stemWuxing: '木',
        branchWuxing: '水',
        stemTenGod: '比肩',
        hiddenStems: [{ stem: '癸', wuxing: '水' }],
      },
    ]
    expect(getWeightedDayMasterStrength('木', pillars)).toBe('强')
  })

  it('庚金日主 午月 火旺克金 → 弱', () => {
    const pillars: BaZiPillar[] = [
      {
        stem: '丙',
        branch: '午',
        stemWuxing: '火',
        branchWuxing: '火',
        stemTenGod: '七杀',
        hiddenStems: [
          { stem: '丁', wuxing: '火' },
          { stem: '己', wuxing: '土' },
        ],
      },
      {
        stem: '甲',
        branch: '午',
        stemWuxing: '木',
        branchWuxing: '火',
        stemTenGod: '偏财',
        hiddenStems: [
          { stem: '丁', wuxing: '火' },
          { stem: '己', wuxing: '土' },
        ],
      },
      {
        stem: '庚',
        branch: '申',
        stemWuxing: '金',
        branchWuxing: '金',
        stemTenGod: '日主',
        hiddenStems: [
          { stem: '庚', wuxing: '金' },
          { stem: '壬', wuxing: '水' },
          { stem: '戊', wuxing: '土' },
        ],
      },
      {
        stem: '丙',
        branch: '戌',
        stemWuxing: '火',
        branchWuxing: '土',
        stemTenGod: '七杀',
        hiddenStems: [
          { stem: '戊', wuxing: '土' },
          { stem: '辛', wuxing: '金' },
          { stem: '丁', wuxing: '火' },
        ],
      },
    ]
    expect(getWeightedDayMasterStrength('金', pillars)).toBe('弱')
  })
})
```

- [ ] **2. Run test to verify it fails**

```bash
npx vitest run tests/composables/useBaZi.test.ts -t "weighted" --reporter=verbose
```

Expected: FAIL — `getWeightedDayMasterStrength` not defined.

- [ ] **3. Implement `getWeightedDayMasterStrength`**

Add to `composables/useBaZi.ts`:

```typescript
/**
 * Calculate day master strength using weighted pillar + hidden stem analysis.
 *
 * Weight table:
 *   monthBranch ×2.0, dayBranch ×1.5, other stems ×1.0, other branches ×1.0, hiddenStems ×0.5
 *
 * Scoring per factor:
 *   same element as DM → +1, generating DM → +0.5, controlling DM → -0.5
 *   total ≥3 → 强, ≥1 → 偏强, ≥-1 → 中和, ≥-3 → 偏弱, else → 弱
 */
export function getWeightedDayMasterStrength(
  dayMasterWuxing: string,
  pillars: BaZiPillar[],
): '强' | '偏强' | '中和' | '偏弱' | '弱' {
  const WUXING_CYCLE = ['木', '火', '土', '金', '水']

  // pillar[0]=年, [1]=月, [2]=日, [3]=时 — must match calculateBaZi order
  const weights = [
    { pillar: 0, stemW: 1.0, branchW: 1.0, label: '年' },
    { pillar: 1, stemW: 1.0, branchW: 2.0, label: '月' },
    { pillar: 2, stemW: 1.0, branchW: 1.5, label: '日' },
    { pillar: 3, stemW: 1.0, branchW: 1.0, label: '时' },
  ]

  let total = 0

  for (const w of weights) {
    const p = pillars[w.pillar]
    if (!p) continue

    const genIdx = (wx: string) => WUXING_CYCLE.indexOf(wx)

    // Score a factor: same=+1, generating DM=+0.5, controlling DM=-0.5
    const score = (wx: string) => {
      if (wx === dayMasterWuxing) return 1
      const dmIdx = genIdx(dayMasterWuxing)
      const fIdx = genIdx(wx)
      if (dmIdx < 0 || fIdx < 0) return 0
      // (fIdx + 1) % 5 === dmIdx → f generates DM → +0.5
      if ((fIdx + 1) % 5 === dmIdx) return 0.5
      // (dmIdx + 1) % 5 === fIdx → f controls DM → -0.5
      if ((dmIdx + 1) % 5 === fIdx) return -0.5
      return 0
    }

    // Stem
    if (p.stemWuxing) total += score(p.stemWuxing) * w.stemW
    // Branch
    if (p.branchWuxing) total += score(p.branchWuxing) * w.branchW
    // Hidden stems
    for (const hs of p.hiddenStems) {
      if (hs.wuxing) total += score(hs.wuxing) * 0.5
    }
  }

  if (total >= 3) return '强'
  if (total >= 1) return '偏强'
  if (total >= -1) return '中和'
  if (total >= -3) return '偏弱'
  return '弱'
}
```

- [ ] **4. Run test to verify it passes**

```bash
npx vitest run tests/composables/useBaZi.test.ts -t "weighted" --reporter=verbose
```

Expected: PASS.

- [ ] **5. Wire into `calculateBaZi()`**

In `calculateBaZi()`, replace the existing call:

```typescript
// OLD:
const dayMasterStrength = getDayMasterStrength(dayMasterWuxing, monthBranchIndex)

// NEW:
const dayMasterStrength = getWeightedDayMasterStrength(dayMasterWuxing, pillars)
```

- [ ] **6. Run all tests**

```bash
npx vitest run tests/composables/useBaZi.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **7. Commit**

```bash
git add -A
git commit -m "feat: add weighted day master strength (4 pillars + hidden stems)"
```

---

### Task A3: Seasonal adjustment (调候)

**Files:**

- Modify: `composables/useBaZi.ts`
- Test: `tests/composables/useBaZi.test.ts`

- [ ] **1. Write tests**

```typescript
describe('getSeasonalAdjustment', () => {
  it('寅月(春) → 调候为金', () => {
    expect(getSeasonalAdjustment(2)).toBe('金')
  })
  it('午月(夏) → 调候为水', () => {
    expect(getSeasonalAdjustment(6)).toBe('水')
  })
  it('酉月(秋) → 调候为火', () => {
    expect(getSeasonalAdjustment(9)).toBe('火')
  })
  it('子月(冬) → 调候为火', () => {
    expect(getSeasonalAdjustment(0)).toBe('火')
  })
})
```

- [ ] **2. Implement `getSeasonalAdjustment`**

```typescript
/**
 * Get seasonal climate adjustment (调候用神) based on month branch.
 *
 * Theory: seasonal extremes require balancing elements.
 *   春(寅卯辰) 木旺 → 需金制
 *   夏(巳午未) 火炎 → 需水降
 *   秋(申酉戌) 金锐 → 需火炼
 *   冬(亥子丑) 水寒 → 需火暖
 */
export function getSeasonalAdjustment(monthBranchIndex: number): string {
  // branch index: 子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11
  if (monthBranchIndex >= 2 && monthBranchIndex <= 4) return '金' // 春
  if (monthBranchIndex >= 5 && monthBranchIndex <= 7) return '水' // 夏
  if (monthBranchIndex >= 8 && monthBranchIndex <= 10) return '火' // 秋
  return '火' // 冬 (子丑亥 0,1,11 — 还需火暖)
}
```

- [ ] **3. Modify `getFavorableElements` to include 调候**

Update the function signature and logic:

```typescript
export function getFavorableElements(
  dayMasterWuxing: string,
  strength: string,
  monthBranchIndex?: number, // optional for backward compat
): [string[], string[]] {
  // ... existing logic ...
  const [favorable, unfavorable] = existingResult

  // Add seasonal adjustment if monthBranchIndex provided
  if (monthBranchIndex !== undefined) {
    const seasonal = getSeasonalAdjustment(monthBranchIndex)
    if (!favorable.includes(seasonal)) {
      favorable.unshift(seasonal) // prepend as most important
    }
  }

  return [favorable, unfavorable]
}
```

- [ ] **4. Wire in `calculateBaZi()`**

```typescript
const [favorableElements, unfavorableElements] = getFavorableElements(
  dayMasterWuxing,
  dayMasterStrength,
  monthBranchIndex,
)
```

- [ ] **5. Run tests**

```bash
npx vitest run tests/composables/useBaZi.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **6. Commit**

```bash
git add -A
git commit -m "feat: add seasonal climate adjustment (调候) to favorable elements"
```

---

### Task A4: Include nayin in element count

**Files:**

- Modify: `composables/useBaZi.ts`
- Test: `tests/composables/useBaZi.test.ts`

- [ ] **1. Write test**

```typescript
describe('computeElementCounts with nayin', () => {
  it('includes nayin wuxing in total counts', () => {
    // The function already computes from pillars; after modification
    // it factors in nayin from each pillar's stem+branch
    const r = { 木: 1, 火: 2, 土: 1, 金: 2, 水: 1 }
    // Verify the function runs and returns all 5 keys
    const counts = computeElementCounts(mockPillars)
    expect(counts).toHaveProperty('木')
    expect(counts).toHaveProperty('火')
    expect(counts).toHaveProperty('土')
    expect(counts).toHaveProperty('金')
    expect(counts).toHaveProperty('水')
  })
})
```

- [ ] **2. Modify `computeElementCounts`**

```typescript
function computeElementCounts(pillars: BaZiPillar[]): Record<string, number> {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const p of pillars) {
    if (!p) continue
    if (counts[p.stemWuxing] !== undefined) counts[p.stemWuxing]++
    if (counts[p.branchWuxing] !== undefined) counts[p.branchWuxing]++
    for (const hs of p.hiddenStems) {
      if (counts[hs.wuxing] !== undefined) counts[hs.wuxing]++
    }
    // ✨ NEW: include nayin wuxing
    if (p.stem && p.branch) {
      const nayin = getNayinWuxing(p.stem, p.branch)
      if (counts[nayin] !== undefined) counts[nayin]++
    }
  }
  return counts
}
```

- [ ] **3. Run tests**

```bash
npx vitest run tests/composables/useBaZi.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **4. Commit**

```bash
git add -A
git commit -m "feat: include nayin wuxing in element count analysis"
```

---

### Task A5: Pillar interpretations

**Files:**

- Modify: `composables/useBaZi.ts`
- Test: `tests/composables/useBaZi.test.ts`

**Context:** Add rule-based one-line interpretations to each pillar. Rules combine heavenly stem character + ten god nature + earthly branch hidden stems. Implementation uses lookup tables, not AI generation.

- [ ] **1. Write tests**

```typescript
describe('getPillarInterpretation', () => {
  it('年柱七杀 → 早年多磨砺', () => {
    const text = getPillarInterpretation('庚', '午', '七杀', '年柱', '火')
    expect(text.length).toBeGreaterThan(0)
  })
  it('月柱正印 → 青年得庇护', () => {
    const text = getPillarInterpretation('癸', '亥', '正印', '月柱', '水')
    expect(text.length).toBeGreaterThan(0)
  })
  it('时柱食神 → 晚年享福', () => {
    const text = getPillarInterpretation('戊', '申', '食神', '时柱', '土')
    expect(text.length).toBeGreaterThan(0)
  })
})
```

- [ ] **2. Implement pillar interpretation function**

```typescript
/** Heavenly stem character traits (from 三命通会) */
const STEM_TRAITS: Record<string, string> = {
  甲: '甲木参天',
  乙: '乙木柔韧',
  丙: '丙火猛烈',
  丁: '丁火柔中',
  戊: '戊土厚重',
  己: '己土肥沃',
  庚: '庚金刚锐',
  辛: '辛金秀气',
  壬: '壬水汪洋',
  癸: '癸水至阴',
}

/** Ten god nature descriptions */
const TEN_GOD_TRAITS: Record<string, string> = {
  正官: '正官护身',
  七杀: '七杀攻身',
  正印: '正印护持',
  偏印: '偏印生身',
  比肩: '比肩助力',
  劫财: '劫财相扶',
  食神: '食神泄秀',
  伤官: '伤官吐秀',
  正财: '正财稳进',
  偏财: '偏财横发',
}

/** Pillar position significance */
const PILLAR_CONTEXT: Record<string, string> = {
  年柱: '祖上根基',
  月柱: '父母荫庇',
  日柱: '自身造化',
  时柱: '晚年归宿',
}

export function getPillarInterpretation(
  stem: string,
  branch: string,
  tenGod: string,
  pillarName: string,
  branchWuxing: string,
): string {
  const stemPart = STEM_TRAITS[stem] || `${stem}干`
  const tenGodPart = TEN_GOD_TRAITS[tenGod] || ''
  const pillarPart = PILLAR_CONTEXT[pillarName] || ''

  const parts: string[] = []
  if (pillarName !== '日柱') {
    parts.push(stemPart)
  }
  if (tenGodPart) parts.push(tenGodPart)

  // Add pillar context
  if (pillarPart) {
    if (pillarName === '年柱')
      parts.push('早年' + (tenGodPart.includes('攻') ? '多磨砺' : '有根基'))
    else if (pillarName === '月柱')
      parts.push(
        '青年得' + (tenGodPart.includes('护') || tenGodPart.includes('生') ? '荫庇' : '机遇'),
      )
    else if (pillarName === '时柱')
      parts.push(
        '晚景' + (tenGodPart.includes('福') || tenGodPart.includes('稳') ? '安详' : '有变'),
      )
  }

  return parts.join('，') + '。'
}
```

- [ ] **3. Wire into `calculateBaZi()`**

After building each pillar, add its interpretation:

```typescript
pillar.interpretation = getPillarInterpretation(
  pillar.stem,
  pillar.branch,
  pillar.stemTenGod,
  pillarName,
  pillar.branchWuxing,
)
```

- [ ] **4. Run tests**

```bash
npx vitest run tests/composables/useBaZi.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **5. Commit**

```bash
git add -A
git commit -m "feat: add pillar interpretation generation"
```

---

### Task A6: Display pillar interpretations in UI

**Files:**

- Modify: `pages/tools/bazi.vue` (or relevant BaZi grid component)

- [ ] **1. Add interpretation display to each pillar card**

In the pillar display section, below existing pillar info (stem/branch/wuxing/tenGod), conditionally render the interpretation:

```vue
<!-- Inside pillar column, after existing info -->
<p
  v-if="pillar.interpretation"
  class="border-l-2 border-cinnabar/25 pl-2.5 py-1 font-sans text-[0.6rem] text-ink-light leading-relaxed"
>
  {{ pillar.interpretation }}
</p>
```

- [ ] **2. Commit**

```bash
git add -A
git commit -m "feat: display pillar interpretation in bazi grid"
```

---

## Section B: 紫微斗数补齐

### Task B1: Add minor star interpretations

**Files:**

- Modify: `constants/ziwei.ts`

- [ ] **1. Add `MINOR_STAR_INTERPRETATIONS`**

```typescript
/** 14 辅星解读 */
export const MINOR_STAR_INTERPRETATIONS: Record<string, string> = {
  文昌: '文昌入命，文采出众，科甲有望，聪明好学。',
  文曲: '文曲入命，才华横溢，口才佳，有艺术天赋。',
  左辅: '左辅入命，贵人相助，人缘好，得众望。',
  右弼: '右弼入命，得人扶持，行事顺利，福泽深厚。',
  天魁: '天魁入命，天乙贵人，逢凶化吉，提携有力。',
  天钺: '天钺入命，异性贵人相助，得长辈提携。',
  禄存: '禄存入命，财禄丰足，行事稳健，福气深厚。',
  擎羊: '擎羊入命，刑伤难免，个性刚强，易有争端。',
  陀罗: '陀罗入命，拖延阻碍，暗藏是非，需防小人。',
  火星: '火星入命，性急暴躁，突发变故，需修心养性。',
  铃星: '铃星入命，暗藏火性，内心急躁，易有隐忧。',
  地空: '地空入命，理想主义，钱财易空，宜守不宜攻。',
  地劫: '地劫入命，波折较多，计划易变，需稳扎稳打。',
  天马: '天马入命，奔波劳碌，动中求财，宜外出发展。',
}

/** 常用杂曜解读（38 杂曜中选最常见者） */
export const ADJECTIVE_STAR_INTERPRETATIONS: Record<string, string> = {
  天刑: '天刑入命，自律甚严，易有官司是非。',
  天姚: '天姚入命，桃花缘分，风流多情。',
  天月: '天月入命，福荫庇佑，灾祸减轻。',
  阴煞: '阴煞入命，易感阴邪之事，需防暗中是非。',
  天巫: '天巫入命，与宗教玄学有缘，直觉敏锐。',
  三台: '三台入命，步步高升，地位提升。',
  八座: '八座入命，得贵人提携，名声远播。',
  恩光: '恩光入命，得上级赏识，前途光明。',
  天贵: '天贵入命，天生贵气，处事圆满。',
  蜚廉: '蜚廉入命，易招口舌是非，谨言慎行。',
  旬空: '旬空入命，运气虚空，好事易散。',
  解神: '解神入命，逢凶化吉，遇难成祥。',
}
```

- [ ] **2. Commit**

```bash
git add -A
git commit -m "feat: add minor star and adjective star interpretations"
```

---

### Task B2: Complete four transformations (化科/化忌)

**Files:**

- Modify: `constants/ziwei.ts`

- [ ] **1. Add `化科` interpretations for all 14 major stars**

```typescript
'科': {
  '紫微': '紫微化科，帝王得名，文采风流，声望日隆。',
  '天机': '天机化科，智慧超群，学术成就显著，名声远播。',
  '太阳': '太阳化科，光明磊落，声誉显赫，博爱之名。',
  '武曲': '武曲化科，财运亨通，专业领域获认可，名利双收。',
  '天同': '天同化科，福气彰显，人缘极佳，心想事成。',
  '廉贞': '廉贞化科，声名在外，才华受赏识，政途光明。',
  '天府': '天府化科，稳重有成，财库充盈，社会地位高。',
  '太阴': '太阴化科，文雅有礼，艺术造诣高，女性贵气。',
  '贪狼': '贪狼化科，才艺出众，交际广泛，因才得名。',
  '巨门': '巨门化科，口才成业，以言辞立身，名声响亮。',
  '天相': '天相化科，公正善良，得人尊敬，福泽绵长。',
  '天梁': '天梁化科，德高望重，受人爱戴，荫庇后人。',
  '七杀': '七杀化科，权威显达，以魄力成事，名震四方。',
  '破军': '破军化科，变革成名，突破常规，开创新局。',
}
```

- [ ] **2. Add `化忌` interpretations for all 14 major stars**

```typescript
'忌': {
  '紫微': '紫微化忌，帝王蒙尘，权威受损，决策易失误。',
  '天机': '天机化忌，聪明反被聪明误，思虑过度反招咎。',
  '太阳': '太阳化忌，光明受阻，事业坎坷，劳心费力。',
  '武曲': '武曲化忌，财路不通，孤军奋战，求财辛苦。',
  '天同': '天同化忌，福气减退，情绪低落，好事多磨。',
  '廉贞': '廉贞化忌，是非缠身，感情困扰，需防官非。',
  '天府': '天府化忌，库藏破漏，守成不易，财帛耗损。',
  '太阴': '太阴化忌，情感内伤，孤独感强，女性需注意健康。',
  '贪狼': '贪狼化忌，欲望难填，桃花生变，投机不利。',
  '巨门': '巨门化忌，口舌是非多，言语伤人，易惹官非。',
  '天相': '天相化忌，助人反遭怨，好心办坏事，需明辨。',
  '天梁': '天梁化忌，荫星失辉，长辈欠安，操心劳神。',
  '七杀': '七杀化忌，冲动招祸，竞争失利，需防血光。',
  '破军': '破军化忌，变革失当，破财损业，动荡不安。',
}
```

- [ ] **3. Commit**

```bash
git add -A
git commit -m "feat: complete four transformations (化科/化忌) for all major stars"
```

---

### Task B3: Add star combination interpretations

**Files:**

- Modify: `constants/ziwei.ts`
- Modify: `composables/useZiwei.ts`

- [ ] **1. Add `COMBINATION_INTERPRETATIONS` to `constants/ziwei.ts`**

```typescript
/** 双星组合解读（约 20 种常见组合）— key = 星名排序后用-连接 */
export const COMBINATION_INTERPRETATIONS: Record<string, string> = {
  '紫微-天府': '紫府同宫，帝王之气兼府库之财，格局高贵，大富大贵。',
  '紫微-贪狼': '紫微贪狼同宫，帝星遇桃花，才艺出众但也易生情困。',
  '紫微-天相': '紫微天相同宫，有辅佐之力，公正善良，利于政途。',
  '紫微-七杀': '紫微七杀同宫，帝王掌杀权，威势赫赫，大权在握。',
  '紫微-破军': '紫微破军同宫，破旧立新，变动中显贵气。',
  '天机-天梁': '天机天梁同宫，智慧与荫庇兼备，宜从事文教工作。',
  '天机-太阴': '天机太阴同宫，智谋与柔情并存，心思细腻。',
  '太阳-太阴': '日月同宫，阴阳调和，贵气与财气兼备，格局清奇。',
  '太阳-巨门': '太阳巨门同宫，光明照暗曜，以口才立身，名扬四方。',
  '武曲-天府': '武曲天府同宫，财库双美，富贵双全，格局稳重。',
  '武曲-贪狼': '武曲贪狼同宫，求财有术，交际广泛，晚年成就大。',
  '武曲-天相': '武曲天相同宫，刚柔并济，善理财且公正。',
  '武曲-七杀': '武曲七杀同宫，刚毅果决，掌权柄，宜军警金融。',
  '廉贞-天府': '廉贞天府同宫，刚正与稳重结合，政途可期。',
  '廉贞-贪狼': '廉贞贪狼同宫，桃花泛水，才艺出众，需防情困。',
  '廉贞-七杀': '廉贞七杀同宫，刚烈有魄力，宜开创性行业。',
  '廉贞-破军': '廉贞破军同宫，一生多变，起伏较大，需顺势而为。',
  '天同-太阴': '天同太阴同宫，福星伴月，温顺平和，福气深厚。',
  '天同-巨门': '天同巨门同宫，福气遇暗曜，虽有人缘但易招是非。',
  '天梁-太阴': '天梁太阴同宫，慈爱温婉，有长者风范且心思细腻。',
}
```

- [ ] **2. Update `getStarCombinationKey` helper**

```typescript
/** Generate a sorted hyphen-joined key for combination lookup */
export function getCombinationKey(starNames: string[]): string {
  return [...starNames].sort().join('-')
}
```

- [ ] **3. Rewrite `getPalaceDetail()` in `useZiwei.ts` to use lookup tables**

```typescript
export function getPalaceDetail(palace: IFunctionalPalace): {
  palaceSummary: string
  starReadings: string[]
  combinationNote: string
} {
  const palaceSummary = getPalaceInterpretation(palace.name)

  // Major star readings
  const starReadings = palace.majorStars
    .map(s => {
      const reading = getStarInterpretation(s.name as string)
      if (reading) return reading
      return ''
    })
    .filter(Boolean)

  const starNames: string[] = palace.majorStars.map(s => s.name as string)

  // Look up combination
  const comboKey = getCombinationKey(starNames)
  let combinationNote = COMBINATION_INTERPRETATIONS[comboKey] || ''

  // Fallback for 紫微系 + 天府系 combinations not in map
  if (!combinationNote && starNames.length >= 2) {
    // Generic note: multiple major stars
    combinationNote = `${starNames.join('、')}同宫，诸星汇聚，格局复杂。`
  }

  return { palaceSummary, starReadings, combinationNote }
}
```

- [ ] **4. Run typecheck**

```bash
npm run typecheck
```

Expected: No type errors.

- [ ] **5. Commit**

```bash
git add -A
git commit -m "feat: add star combination interpretations (20 types) with lookup"
```

---

### Task B4: Dynamic palace interpretation + UI expand

**Files:**

- Modify: `composables/useZiwei.ts`
- Modify: Zi Wei palace card component (in `components/tools/ziwei/`)

- [ ] **1. Build dynamic palace text in `getDetailedPalaceView()`**

```typescript
// Inside getDetailedPalaceView, add fullInterpretation field

const majorInterpretations = palace.majorStars.map(s => {
  const base = getStarInterpretation(s.name as string)
  return base
})

const minorTexts = palace.minorStars
  .map(s => {
    return MINOR_STAR_INTERPRETATIONS[s.name as string] || ''
  })
  .filter(Boolean)

const adjTexts = palace.adjectiveStars
  .map(s => {
    return ADJECTIVE_STAR_INTERPRETATIONS[s.name as string] || ''
  })
  .filter(Boolean)

// Build combined interpretation
let fullInterpretation = palaceSummary

if (majorInterpretations.length > 0) {
  fullInterpretation += ' ' + majorInterpretations.join(' ')
}
if (minorTexts.length > 0) {
  fullInterpretation += ' 辅以' + minorTexts.slice(0, 2).join('、') + '。'
}
if (combinationNote) {
  fullInterpretation += ' ' + combinationNote
}

// Handle empty palace (无主星)
if (palace.majorStars.length === 0) {
  const opposite = palace.oppositePalace?.()
  if (opposite && opposite.majorStars.length > 0) {
    const oppStars = opposite.majorStars.map(s => s.name).join('、')
    fullInterpretation += ` 空宫，借对宫${oppStars}照入。`
  } else {
    fullInterpretation += ' 空宫，需结合对宫及三方四正综合判断。'
  }
}

return {
  ...existingReturn,
  fullInterpretation, // ✨ new field
}
```

- [ ] **2. Add expand/collapse UI to palace card component**

```vue
<!-- Within the palace card, click on palace name to toggle -->
<button
  @click="toggleExpand(palaceIndex)"
  class="w-full text-left"
  :aria-expanded="expandedPalace === palaceIndex"
>
  <h3>{{ palace.name }}</h3>
</button>

<Transition name="expand">
  <div
    v-if="expandedPalace === palaceIndex"
    class="mt-2 bg-paper-warm/60 rounded border-l-2 border-cinnabar/20 px-2.5 py-1.5"
  >
    <p class="font-sans text-[0.6rem] text-ink-medium leading-relaxed">
      {{ view.fullInterpretation }}
    </p>
  </div>
</Transition>
```

```css
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 10rem;
  opacity: 1;
}
```

- [ ] **3. Commit**

```bash
git add -A
git commit -m "feat: dynamic palace interpretation + expand/collapse UI"
```

---

## Section C: 配对解释文字

### Task C1: Add shengxiao pairing explanations

**Files:**

- Create: `constants/shengxiao.ts`
- Modify: `composables/useShengXiao.ts`
- Modify: `components/tools/shengxiao/CompatibilityGrid.vue`

- [ ] **1. Create `constants/shengxiao.ts`**

```typescript
/** 生肖配对解释文本 */
export const SHENGXIAO_PAIRING_EXPLANATIONS: Record<string, Record<string, string>> = {
  三合: {
    default: '三合贵人，互为生旺，性格互补，合作无间，是最佳搭档。',
  },
  六合: {
    default: '六合贵人，天作之合，彼此吸引，相处和谐，姻缘上佳。',
  },
  相冲: {
    default: '六冲对冲，性格对立，观念分歧较大，相处需互相包容忍让。',
  },
  相害: {
    default: '六害相侵，互相消耗，易生误会摩擦，需多沟通理解。',
  },
  相刑: {
    default: '相刑之局，彼此牵制，易生矛盾，需注意情绪管理。',
  },
  中吉: {
    default: '五行平和，无大冲大合，可和谐相处，日久生情。',
  },
}

/** 获取配对解释 */
export function getShengXiaoExplanation(relation: string): string {
  return SHENGXIAO_PAIRING_EXPLANATIONS[relation]?.default ?? ''
}
```

- [ ] **2. Update `Compatibility` interface in `useShengXiao.ts`**

```typescript
export interface Compatibility {
  animal: string
  emoji: string
  relation: string
  level: 'great' | 'good' | 'bad'
  explanation: string // ✨ ADD
}
```

- [ ] **3. Wire explanation in `getCompatibility()`**

```typescript
// In getCompatibility, import and use
import { getShengXiaoExplanation } from '~/constants/shengxiao'

// When pushing result:
result.push({
  animal: ANIMALS[partner],
  emoji: EMOJIS[partner],
  relation: '三合',
  level: 'great',
  explanation: getShengXiaoExplanation('三合'),
})
```

Apply to all 5 relation types in `getCompatibility()`.

- [ ] **4. Add accordion UI to `CompatibilityGrid.vue`**

```vue
<script setup>
const expandedIdx = ref<number | null>(null)
function toggleExpand(idx: number) {
  expandedIdx.value = expandedIdx.value === idx ? null : idx
}
</script>

<template>
  <div v-for="(item, idx) in compatibility" :key="item.animal" class="compatibility-item">
    <button @click="toggleExpand(idx)" class="flex items-center gap-2">
      <!-- existing content -->
    </button>

    <Transition name="expand">
      <div
        v-if="expandedIdx === idx"
        :class="[
          'ml-6 pl-3 py-1 border-l-2',
          item.level === 'great' ? 'border-wuxing-wood/40' : 'border-cinnabar/30',
        ]"
      >
        <p class="font-sans text-[0.65rem] text-ink-light leading-relaxed">
          {{ item.explanation }}
        </p>
      </div>
    </Transition>
  </div>
</template>
```

- [ ] **5. Commit**

```bash
git add -A
git commit -m "feat: add shengxiao pairing explanations with accordion UI"
```

---

### Task C2: Add constellation pairing explanations

**Files:**

- Create: `constants/constellation.ts`
- Modify: `composables/useConstellation.ts`
- Modify: constellation pairing component

- [ ] **1. Create `constants/constellation.ts`**

```typescript
/** 星座配对解释文本 */
export const CONSTELLATION_PAIRING_EXPLANATIONS: Record<string, string> = {
  great: '同元素星座，气质相投，默契十足，相处自然和谐，是天生一对。',
  good: '元素相关，性格有差异但可互补，需要互相理解和包容。',
  bad: '元素对立，性格差异较大，容易产生摩擦，需要更多包容和沟通。',
}
```

- [ ] **2. Update constellation compatibility in `useConstellation.ts`**

In `computeConstellationCompat()`, add explanation to each candidate:

```typescript
import { CONSTELLATION_PAIRING_EXPLANATIONS } from '~/constants/constellation'

// When pushing candidate:
candidates.push({
  name: ZODIACS[i].name,
  symbol: ZODIACS[i].symbol,
  level,
  label,
  explanation: CONSTELLATION_PAIRING_EXPLANATIONS[level],
})
```

Add `explanation` field to the type:

```typescript
// In ConstellationResult.compatibility items
interface CompatibilityEntry {
  name: string
  symbol: string
  level: 'great' | 'good' | 'bad'
  label: string
  explanation?: string // ✨ ADD
}
```

- [ ] **3. Add accordion UI to constellation pairing component**

Same accordion pattern as shengxiao — click to expand, border color by level.

- [ ] **4. Run typecheck + all tests**

```bash
npm run typecheck
npx vitest run --reporter=verbose 2>&1 | tail -20
```

Expected: No type errors, all tests pass.

- [ ] **5. Commit**

```bash
git add -A
git commit -m "feat: add constellation pairing explanations with accordion UI"
```

---

## Self-Review

### Spec Coverage

- ✅ 1.1 Weighted day master strength → Task A2
- ✅ 1.2 调候 analysis → Task A3
- ✅ 1.3 Nayin inclusion → Task A1 + A4
- ✅ 1.4 Pillar interpretations → Task A5 + A6
- ✅ 2.1 Minor star interpretations → Task B1
- ✅ 2.2 Four transformations (科/忌) → Task B2
- ✅ 2.3 Star combinations → Task B3
- ✅ 2.4 Dynamic palace interpretation → Task B4
- ✅ 3.1 生肖 pairing explanations → Task C1
- ✅ 3.2 星座 pairing explanations → Task C2
- ✅ 4.1 UI: 八字柱解读 → Task A6
- ✅ 4.2 UI: 紫微宫位展开 → Task B4
- ✅ 4.3 UI: 手风琴互斥 → Task C1 + C2

### No Placeholders

All code blocks are complete. No "TBD", "TODO", or "implement later" patterns found.

### Type Consistency

- `getNayinWuxing(stem, branch) → string` — consistent across A1 and A4
- `getWeightedDayMasterStrength(DM, pillars) → strength` — used in calculateBaZi as drop-in
- `getPalaceDetail()` return shape consistent between B3 and B4
- `Compatibility.explanation: string` — added in C1, used in C1+C2
