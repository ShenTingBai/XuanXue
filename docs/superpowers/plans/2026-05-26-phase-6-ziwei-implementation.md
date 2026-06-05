# Ziwei Doushu (紫微斗数) — Phase 6 Implementation Plan

> **状态：已完成** — 对应功能已合并至 `main`
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Ziwei Doushu astrolabe tool with 3×4 palace grid, celestial star chart (天星图), tab switching between views, right-sidebar detail panel, and rule-template interpretations.

**Architecture:** iztro TypeScript library handles all astrolabe calculations. `useZiwei.ts` wraps it, adapting the return data and providing rule-template interpretations from `constants/ziwei.ts`. The page uses ToolPageLayout with #nav-right slot for the detail panel, matching the Option B layout.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, TailwindCSS, iztro v2.5.8

**Design Spec:** `docs/superpowers/specs/2026-05-26-phase6-ziwei-design.md`

**Visual Reference:** `demos/ziwei-visual-reference.html` — contains both the celestial chart (天星图) and palace grid (回宫图) views with tab switching, animation, and detail panel interactions.

---

### Task 1: Install iztro and write smoke test

**Files:**

- Modify: `package.json`
- Create: `tests/composables/useZiwei.test.ts`

- [ ] **Step 1: Install iztro**

Run: `npm install iztro --registry https://registry.npmmirror.com`

Expected: `iztro@2.5.8` added to `package.json` dependencies.

- [ ] **Step 2: Write smoke test to verify iztro works in Node**

```typescript
// tests/composables/useZiwei.test.ts
import { describe, it, expect } from 'vitest'
import { astro } from 'iztro'

describe('iztro smoke test', () => {
  it('generates astrolabe from solar date', () => {
    const result = astro.bySolar('2000-8-16', 2, 'male', true, 'zh-CN')
    expect(result).toBeDefined()
    expect(result.palaces).toHaveLength(12)
    expect(result.earthlyBranchOfSoulPalace).toBeDefined()
    expect(result.earthlyBranchOfBodyPalace).toBeDefined()
    expect(result.fiveElementsClass).toBeDefined()
  })

  it('returns palaces with expected structure', () => {
    const result = astro.bySolar('2000-8-16', 2, 'male', true, 'zh-CN')
    const palace = result.palaces[0]
    expect(palace.name).toBeDefined()
    expect(palace.earthlyBranch).toBeDefined()
    expect(palace.heavenlyStem).toBeDefined()
    expect(palace.isBodyPalace).toBeDefined()
    expect(Array.isArray(palace.majorStars)).toBe(true)
    expect(Array.isArray(palace.minorStars)).toBe(true)
    expect(palace.decadal).toBeDefined()
    expect(palace.decadal.range).toHaveLength(2)
  })
})
```

- [ ] **Step 3: Run smoke test**

Run: `npx vitest run tests/composables/useZiwei.test.ts`

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json tests/composables/useZiwei.test.ts
git commit -m "feat: install iztro and verify with smoke test"
```

---

### Task 2: Create constants/ziwei.ts — interpretation templates + chart geometry

**Files:**

- Create: `constants/ziwei.ts`

- [ ] **Step 1: Write palace interpretation data and chart geometry constants**

```typescript
// constants/ziwei.ts

/** 十二宫基本特性 */
export const PALACE_INTERPRETATIONS: Record<string, string> = {
  命宫: '代表一个人的先天禀赋、性格特质、人生走向。命宫中的星曜组合决定了个人的基本格局。',
  兄弟宫: '代表兄弟姐妹关系、朋友往来、人际互动。也反映与平辈之间的缘分和助力。',
  夫妻宫: '代表婚姻状况、配偶特征、感情生活的方式和质量。',
  子女宫: '代表子女缘分、生育状况、与晚辈的关系，也反映个人的创造力和表现欲。',
  财帛宫: '代表财运状况、理财能力、财富积累的方式和机会。',
  疾厄宫: '代表身体健康状况、潜在疾病倾向、抵抗力和恢复能力。',
  迁移宫: '代表外出运势、旅行运、人际关系网络，以及对环境变化的适应能力。',
  交友宫: '代表社交圈、朋友质量、合作伙伴的缘分，以及在社会中的人际影响力。',
  官禄宫: '代表事业发展、职业选择、工作态度和成就，也反映社会地位。',
  田宅宫: '代表不动产状况、居住环境、家庭背景，也反映财富积累的稳定度。',
  福德宫: '代表精神生活、福分深浅、内心世界和精神追求。',
  父母宫: '代表父母关系、家庭背景、遗传特质，以及长辈缘分。',
}

/** 主星基本解读（单星入命宫时） */
export const STAR_INTERPRETATIONS: Record<string, string> = {
  紫微: '紫微入命宫，帝王之星，性刚果断，领导力强，喜受人尊重。',
  天机: '天机入命宫，智慧之星，思维敏捷，善谋略，变化多端。',
  太阳: '太阳入命宫，光明之星，热情开朗，慷慨大方，贵气显赫。',
  武曲: '武曲入命宫，财星之一，性格刚毅，执行力强，适合金融军警。',
  天同: '天同入命宫，福星，性情温和，知足常乐，福禄双全。',
  廉贞: '廉贞入命宫，次桃花星，聪明刚烈，重情义，有政治才能。',
  天府: '天府入命宫，令星，稳重守成，有领导才能，福禄丰足。',
  太阴: '太阴入命宫，温柔之星，细腻敏感，有艺术气质，主富。',
  贪狼: '贪狼入命宫，桃花星，多才多艺，交际广泛，欲望强烈。',
  巨门: '巨门入命宫，暗星之一，口才佳，善辩论，是非较多。',
  天相: '天相入命宫，印星，公正善良，乐于助人，有协调能力。',
  天梁: '天梁入命宫，荫星，有长者风范，慈悲为怀，有贵人运。',
  七杀: '七杀入命宫，将星，性格刚烈，敢拼敢闯，有开创精神。',
  破军: '破军入命宫，耗星，勇于变革，突破常规，先破后立。',
}

/** 四化解读 */
export const TRANSFORMATION_INTERPRETATIONS: Record<string, Record<string, string>> = {
  禄: {
    紫微: '禄存紫微，帝王得禄，权威更盛，财运亨通。',
    天机: '天机化禄，智慧增财，善用智谋生财。',
    // After implementation, expand to all stars
  },
  权: {
    紫微: '紫微化权，帝王掌权，领导权威更加巩固。',
    天机: '天机化权，智慧为权，善于策划掌控全局。',
  },
  科: {},
  忌: {},
}

/** 宫位对应的地支 */
export const PALACE_BRANCH_MAP: Record<string, string> = {
  命宫: '寅',
  兄弟宫: '卯',
  夫妻宫: '辰',
  子女宫: '巳',
  财帛宫: '午',
  疾厄宫: '未',
  迁移宫: '申',
  交友宫: '酉',
  官禄宫: '戌',
  田宅宫: '亥',
  福德宫: '子',
  父母宫: '丑',
}

/** 地支在 3×4 网格中的 grid-row/grid-col 位置
 *  4 列布局：巳午未申（行1），辰+空+酉（行2），卯+空+戌（行3），寅丑子亥（行4） */
export const BRANCH_GRID_POSITIONS: Record<string, { row: number; col: number }> = {
  巳: { row: 1, col: 1 },
  午: { row: 1, col: 2 },
  未: { row: 1, col: 3 },
  申: { row: 1, col: 4 },
  辰: { row: 2, col: 1 },
  酉: { row: 2, col: 4 },
  卯: { row: 3, col: 1 },
  戌: { row: 3, col: 4 },
  寅: { row: 4, col: 1 },
  丑: { row: 4, col: 2 },
  子: { row: 4, col: 3 },
  亥: { row: 4, col: 4 },
}

/** 地支顺序索引 */
export const BRANCH_INDEX: Record<string, number> = {
  子: 0,
  丑: 1,
  寅: 2,
  卯: 3,
  辰: 4,
  巳: 5,
  午: 6,
  未: 7,
  申: 8,
  酉: 9,
  戌: 10,
  亥: 11,
}

/** 地支→角度映射（天星图使用），寅=0° 为紫微斗数标准 */
export const BRANCH_TO_ANGLE: Record<string, number> = {
  寅: 0,
  卯: 30,
  辰: 60,
  巳: 90,
  午: 120,
  未: 150,
  申: 180,
  酉: 210,
  戌: 240,
  亥: 270,
  子: 300,
  丑: 330,
}

/** 天星图轨道半径（相对 600×600 viewBox） */
export const ORBIT_RADII = {
  INNER: 100,
  MID_INNER: 145,
  MID: 185,
  MID_OUTER: 225,
  OUTER: 255,
  LABEL: 282,
} as const

/** 时辰名称（用于输入选择）。index 0-11 对应早子-亥，index 12=晚子。
 *  注意: iztro timeIndex 0=早子时, 12=晚子时 */
export const TIME_NAMES = [
  '子时',
  '丑时',
  '寅时',
  '卯时',
  '辰时',
  '巳时',
  '午时',
  '未时',
  '申时',
  '酉时',
  '戌时',
  '亥时',
  '晚子时',
]

/** 时辰（下拉选择）→ iztro timeIndex 映射
 *  下拉 index 0(子时) → iztro timeIndex 0(早子)
 *  下拉 index 1(丑时) → iztro timeIndex 1(丑)
 *  ...
 *  下拉 index 11(亥时) → iztro timeIndex 11(亥)
 *  无晚子时选项（晚子时仅通过 profile 的 birth_hour=23 自动推导，timeIndex=12）
 *
 *  出生小时(0-23) → iztro timeIndex 映射：
 *  早子=0, 丑=1, 寅=2 ... 亥=11, 晚子=12 */
export function getTimeIndex(hour: number): number {
  return Math.floor((hour + 1) / 2)
}

/** iztro timeIndex → 时辰名称（用于显示） */
export function getTimeName(timeIndex: number): string {
  return TIME_NAMES[timeIndex] ?? `${timeIndex}时`
}

/** 性别选项 */
export const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
] as const

/** 获取宫位解读文本 */
export function getPalaceInterpretation(palaceName: string): string {
  return PALACE_INTERPRETATIONS[palaceName] ?? ''
}

/** 获取星曜解读文本 */
export function getStarInterpretation(starName: string): string {
  return STAR_INTERPRETATIONS[starName] ?? ''
}
```

- [ ] **Step 2: Commit**

```bash
git add constants/ziwei.ts
git commit -m "feat: add ziwei constants, interpretation templates, and chart geometry"
```

---

### Task 3: Create useZiwei.ts composable

**Files:**

- Create: `composables/useZiwei.ts`

- [ ] **Step 1: Write the composable wrapping iztro**

关键变更：不再自定义 `ZiWeiPalace`/`ZiWeiStar`/`ZiWeiResult` 接口。`calculateZiWei()` 直接返回 iztro 的 `FunctionalAstrolabe`，组件消费 iztro 原生类型。iztro 不提供的解读文本用 adapter 函数附加。

```typescript
// composables/useZiwei.ts
import { astro } from 'iztro'
import { getPalaceInterpretation, getStarInterpretation } from '~/constants/ziwei'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import type FunctionalStar from 'iztro/lib/star/FunctionalStar'

// 重新导出 iztro 原生类型供组件使用
export type { IFunctionalPalace, IFunctionalAstrolabe }
export type { FunctionalStar }

export interface ZiWeiInput {
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null // iztro timeIndex 0-12
  gender: 'male' | 'female' | null
}

/**
 * Calculate Ziwei Astrolabe from birth info.
 * 直接返回 iztro 的 FunctionalAstrolabe，不包装。
 */
export function calculateZiWei(input: ZiWeiInput): IFunctionalAstrolabe | null {
  const { birthYear, birthMonth, birthDay, birthHour, gender } = input
  if (birthHour === null || birthHour === undefined || !gender) return null

  try {
    const dateStr = `${birthYear}-${birthMonth}-${birthDay}`
    return astro.bySolar(dateStr, birthHour, gender, true, 'zh-CN')
  } catch {
    return null
  }
}

/** 查找命宫在 palaces 中的索引 */
export function getMingGongIndex(palaces: IFunctionalPalace[]): number {
  return palaces.findIndex(p => p.name === '命宫')
}

/** 查找身宫在 palaces 中的索引 */
export function getShenGongIndex(palaces: IFunctionalPalace[]): number {
  return palaces.findIndex(p => p.isBodyPalace)
}

/**
 * 从 palaces 收集所有四化。
 * 四化以 star.mutagen 形式存在于每颗星上。
 */
export function collectTransformations(
  palaces: IFunctionalPalace[],
): { star: string; transformation: string }[] {
  const result: { star: string; transformation: string }[] = []
  for (const p of palaces) {
    for (const s of [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]) {
      if (s.mutagen) result.push({ star: s.name, transformation: s.mutagen })
    }
  }
  return result
}

/** 宫位解读（iztro 不提供，纯模板） */
export function getPalaceDetail(palace: IFunctionalPalace): {
  palaceSummary: string
  starReadings: string[]
  combinationNote: string
} {
  const palaceSummary = getPalaceInterpretation(palace.name)
  const starReadings = palace.majorStars.map(s => getStarInterpretation(s.name)).filter(Boolean)

  const starNames = palace.majorStars.map(s => s.name)
  let combinationNote = ''
  if (starNames.includes('紫微') && starNames.includes('天相')) {
    combinationNote = '紫微天相同宫，辅弼之星入命，格局高贵。'
  } else if (['七杀', '破军', '贪狼'].some(s => starNames.includes(s))) {
    combinationNote = '杀破狼格局，变动中求发展，一生多变动，亦多机遇。'
  } else if (starNames.includes('廉贞') && starNames.includes('贪狼')) {
    combinationNote = '廉贞贪狼同宫，桃花泛水，才艺出众。'
  }

  return { palaceSummary, starReadings, combinationNote }
}

/** 右侧栏详细宫位视图 */
export function getDetailedPalaceView(palace: IFunctionalPalace): {
  name: string
  branch: string
  stem: string
  majorStars: FunctionalStar[]
  minorStars: FunctionalStar[]
  transformations: { star: string; transformation: string }[]
  interpretation: ReturnType<typeof getPalaceDetail>
  decadalRange: [number, number]
  ages: number[]
} {
  const trans: { star: string; transformation: string }[] = []
  for (const s of [...palace.majorStars, ...palace.minorStars]) {
    if (s.mutagen) trans.push({ star: s.name, transformation: s.mutagen })
  }

  return {
    name: palace.name,
    branch: palace.earthlyBranch,
    stem: palace.heavenlyStem,
    majorStars: palace.majorStars,
    minorStars: [...palace.minorStars, ...palace.adjectiveStars],
    transformations: trans,
    interpretation: getPalaceDetail(palace),
    decadalRange: palace.decadal?.range ?? [0, 0],
    ages: palace.ages,
  }
}

/**
 * 序列化 FunctionalAstrolabe 为纯对象（用于 API 存储）。
 * iztro 的类实例不可直接 structuredClone。
 */
export function serializeAstrolabe(astrolabe: IFunctionalAstrolabe): Record<string, unknown> {
  return {
    earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soul: astrolabe.soul,
    body: astrolabe.body,
    palaces: astrolabe.palaces.map(p => ({
      index: p.index,
      name: p.name,
      earthlyBranch: p.earthlyBranch,
      heavenlyStem: p.heavenlyStem,
      isBodyPalace: p.isBodyPalace,
      majorStars: p.majorStars.map(s => ({
        name: s.name,
        type: s.type,
        brightness: s.brightness,
        mutagen: s.mutagen,
      })),
      minorStars: p.minorStars.map(s => ({
        name: s.name,
        type: s.type,
        mutagen: s.mutagen,
      })),
      adjectiveStars: p.adjectiveStars.map(s => ({
        name: s.name,
        type: s.type,
        mutagen: s.mutagen,
      })),
      decadalRange: p.decadal?.range ?? [0, 0],
      ages: p.ages,
    })),
  }
}
```

- [ ] **Step 2: Write test for the composable**

```typescript
// tests/composables/useZiwei.test.ts (update existing file)
import { describe, it, expect } from 'vitest'
import { astro } from 'iztro'
import {
  calculateZiWei,
  getPalaceDetail,
  getMingGongIndex,
  type ZiWeiInput,
} from '~/composables/useZiwei'

describe('iztro smoke test', () => {
  it('generates astrolabe from solar date', () => {
    const result = astro.bySolar('2000-8-16', 2, 'male', true, 'zh-CN')
    expect(result).toBeDefined()
    expect(result.palaces).toHaveLength(12)
    expect(result.earthlyBranchOfSoulPalace).toBeDefined()
    expect(result.earthlyBranchOfBodyPalace).toBeDefined()
    expect(result.fiveElementsClass).toBeDefined()
  })

  it('returns palaces with expected structure', () => {
    const result = astro.bySolar('2000-8-16', 2, 'male', true, 'zh-CN')
    const palace = result.palaces[0]
    expect(palace.name).toBeDefined()
    expect(palace.earthlyBranch).toBeDefined()
    expect(palace.heavenlyStem).toBeDefined()
    expect(palace.isBodyPalace).toBeDefined()
    expect(Array.isArray(palace.majorStars)).toBe(true)
    expect(Array.isArray(palace.minorStars)).toBe(true)
    expect(palace.decadal).toBeDefined()
    expect(palace.decadal.range).toHaveLength(2)
  })
})

describe('calculateZiWei', () => {
  const validInput: ZiWeiInput = {
    birthYear: 2000,
    birthMonth: 8,
    birthDay: 16,
    birthHour: 2, // iztro timeIndex
    gender: 'male',
  }

  it('returns FunctionalAstrolabe for valid input', () => {
    const result = calculateZiWei(validInput)
    expect(result).not.toBeNull()
    expect(result!.palaces).toHaveLength(12)
    expect(result!.earthlyBranchOfSoulPalace).toBeDefined()
    expect(result!.fiveElementsClass).toBeDefined()
  })

  it('returns null when gender is missing', () => {
    const result = calculateZiWei({ ...validInput, gender: null })
    expect(result).toBeNull()
  })

  it('returns null when birthHour is missing', () => {
    const result = calculateZiWei({ ...validInput, birthHour: null })
    expect(result).toBeNull()
  })

  it('returns 12 palaces each with name and earthly branch', () => {
    const result = calculateZiWei(validInput)!
    expect(result.palaces).toHaveLength(12)
    for (const p of result.palaces) {
      expect(p.name).toBeTruthy()
      expect(p.earthlyBranch).toBeTruthy()
      expect(p.heavenlyStem).toBeTruthy()
    }
  })
})

describe('getPalaceDetail', () => {
  it('returns palace summary text for known palaces', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const mingIndex = getMingGongIndex(astrolabe.palaces)
    const mingPalace = astrolabe.palaces[mingIndex]
    expect(mingPalace).toBeDefined()
    const detail = getPalaceDetail(mingPalace)
    expect(detail.palaceSummary).toBeTruthy()
    expect(typeof detail.palaceSummary).toBe('string')
  })

  it('returns star readings for palaces with stars', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const palacesWithStars = astrolabe.palaces.filter(p => p.majorStars.length > 0)
    if (palacesWithStars.length > 0) {
      const detail = getPalaceDetail(palacesWithStars[0])
      expect(Array.isArray(detail.starReadings)).toBe(true)
    }
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/composables/useZiwei.test.ts`

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add composables/useZiwei.ts tests/composables/useZiwei.test.ts
git commit -m "feat: add useZiwei composable wrapping iztro"
```

---

### Task 4: Create ZiWeiPalaceCell.vue

**Files:**

- Create: `components/tools/ziwei/ZiWeiPalaceCell.vue`

- [ ] **Step 1: Write the single palace cell component**

```vue
<!-- components/tools/ziwei/ZiWeiPalaceCell.vue -->
<script setup lang="ts">
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'

defineProps<{
  palace: IFunctionalPalace
  isSelected: boolean
  isMingGong: boolean
  onClick: () => void
}>()
</script>

<template>
  <div
    class="palace-cell h-full cursor-pointer select-none flex flex-col"
    :class="[
      isSelected
        ? 'ring-2 ring-cinnabar bg-cinnabar/5'
        : 'border border-paper-dark/30 hover:border-cinnabar/40 hover:bg-cinnabar/[0.02]',
      isMingGong ? 'border-cinnabar/50' : '',
    ]"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
    role="button"
    :tabindex="0"
    :aria-label="`${palace.name} - ${palace.earthlyBranch}宫`"
  >
    <!-- 顶栏：地支 + 宫名 -->
    <div class="flex items-center justify-between px-1.5 py-0.5 border-b border-paper-dark/20">
      <span class="text-xs font-semibold text-cinnabar-dark/70 font-serif">{{
        palace.earthlyBranch
      }}</span>
      <span
        class="text-[10px] px-1.5 py-0.5 rounded"
        :class="
          isMingGong ? 'bg-cinnabar text-paper font-medium' : 'bg-ink-dark/5 text-ink-dark/70'
        "
        >{{ palace.name }}</span
      >
    </div>

    <!-- 主星 -->
    <div class="px-1.5 py-1 min-h-[28px]">
      <div v-if="palace.majorStars.length > 0" class="flex flex-wrap gap-x-1">
        <span
          v-for="star in palace.majorStars"
          :key="star.name"
          class="text-[11px] font-medium text-ink-dark leading-tight"
          :class="{
            'text-amber-700': star.name === '紫微',
            'text-emerald-700': star.name === '天机',
            'text-orange-600': star.name === '太阳',
            'text-slate-600': star.name === '武曲',
            'text-rose-600': ['廉贞', '贪狼'].includes(star.name),
            'text-indigo-600': star.name === '天府',
            'text-blue-600': star.name === '太阴',
            'text-stone-500': ['七杀', '破军'].includes(star.name),
            'text-ink-light': star.brightness === '陷',
          }"
        >
          {{ star.name
          }}<span v-if="star.brightness && star.brightness !== '平'" class="text-[9px] opacity-60"
            >[{{ star.brightness }}]</span
          >
        </span>
      </div>
      <div v-else class="text-[10px] text-ink-light/50 italic">(空)</div>
    </div>

    <!-- 辅星 -->
    <div v-if="palace.minorStars.length > 0" class="px-1.5 pb-0.5 flex flex-wrap gap-x-1">
      <span v-for="star in palace.minorStars" :key="star.name" class="text-[9px] text-ink-light">{{
        star.name
      }}</span>
    </div>

    <!-- 四化 chip -->
    <div v-if="palace.majorStars.some(s => s.mutagen)" class="px-1.5 pb-0.5 flex flex-wrap gap-0.5">
      <span
        v-for="star in palace.majorStars.filter(s => s.mutagen)"
        :key="star.name"
        class="text-[8px] px-1 rounded-sm font-medium"
        :class="{
          'bg-red-50 text-red-700': star.mutagen === '禄',
          'bg-blue-50 text-blue-700': star.mutagen === '权',
          'bg-green-50 text-green-700': star.mutagen === '科',
          'bg-gray-100 text-gray-500': star.mutagen === '忌',
        }"
        >{{ star.name }}化{{ star.mutagen }}</span
      >
    </div>

    <!-- 大限 -->
    <div v-if="palace.decadalRange && palace.decadalRange[0] > 0" class="px-1.5 pb-0.5 mt-auto">
      <span class="text-[8px] text-ink-light/60"
        >{{ palace.decadalRange[0] }}~{{ palace.decadalRange[1] }}</span
      >
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add components/tools/ziwei/ZiWeiPalaceCell.vue
git commit -m "feat: add ZiWeiPalaceCell component"
```

---

### Task 5: Create ZiWeiPalaceGrid.vue

**Files:**

- Create: `components/tools/ziwei/ZiWeiPalaceGrid.vue`

- [ ] **Step 1: Write the 3×4 palace grid component**

```vue
<!-- components/tools/ziwei/ZiWeiPalaceGrid.vue -->
<script setup lang="ts">
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { BRANCH_GRID_POSITIONS } from '~/constants/ziwei'

defineProps<{
  palaces: IFunctionalPalace[]
  selectedIndex: number
  mingGongIndex: number
  fiveElementsClass: string
  onSelectPalace: (index: number) => void
}>()
</script>

<template>
  <div
    class="grid grid-cols-4 gap-px bg-paper-dark/20 rounded-lg overflow-hidden max-w-[520px] mx-auto"
    style="grid-template-rows: auto auto auto auto;"
    role="grid"
    aria-label="紫微斗数命盘"
  >
    <div
      v-for="palace in palaces"
      :key="palace.index"
      class="bg-paper"
      :style="{
        gridRow: BRANCH_GRID_POSITIONS[palace.earthlyBranch]?.row,
        gridColumn: BRANCH_GRID_POSITIONS[palace.earthlyBranch]?.col,
      }"
    >
      <ZiWeiPalaceCell
        :palace="palace"
        :is-selected="palace.index === selectedIndex"
        :is-ming-gong="palace.index === mingGongIndex"
        :on-click="() => onSelectPalace(palace.index)"
      />
    </div>
    <!-- Center area: 五行局 -->
    <div
      class="col-start-2 col-end-4 row-start-2 row-end-4 flex items-center justify-center bg-paper/50 text-ink-light/40 text-[11px] select-none"
    >
      {{ fiveElementsClass }}
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add components/tools/ziwei/ZiWeiPalaceGrid.vue
git commit -m "feat: add ZiWeiPalaceGrid 3x4 grid component"
```

---

### Task 6: Create ZiWeiCelestialChart.vue

**Files:**

- Create: `components/tools/ziwei/ZiWeiCelestialChart.vue`

- [ ] **Step 1: Write the celestial star chart (天星图) component**

This component renders an SVG+DOM celestial chart with wobbly orbit rings, sector dividers, positioned star orbs with orbital drift animation, and 四化 chips. It sources data from iztro `IFunctionalPalace[]` via props and emits `select` events on palace click.

```vue
<!-- components/tools/ziwei/ZiWeiCelestialChart.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { BRANCH_TO_ANGLE } from '~/constants/ziwei'

// ── Geometry constants (BASE 600 viewBox) ──
const BASE = 600
const CX = 300
const CY = 300

const RINGS = [
  { r: 100, label: '内垣' },
  { r: 145, label: '' },
  { r: 185, label: '' },
  { r: 225, label: '' },
  { r: 255, label: '外垣' },
] as const

const LABEL_R = 282

const props = defineProps<{
  palaces: IFunctionalPalace[]
  selectedIndex: number
  mingGongIndex: number
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

// ── Template refs ──
const chartContainer = ref<HTMLDivElement>()
const orbitSvg = ref<SVGSVGElement>()
const sectorLabelsContainer = ref<HTMLDivElement>()
const starsContainer = ref<HTMLDivElement>()
const palaceArcEl = ref<HTMLDivElement>()

// ── Non-reactive mutable state (performance-critical animation) ──
interface CelestialStar {
  name: string
  color: string
  major: boolean
  palaceIdx: number
  angleDeg: number
  radius: number
  speed: number
  phase: number
  mutagen: string | null
}

let chartScale = 1
let celestialStars: CelestialStar[] = []
let starElements: HTMLElement[] = []
let animFrameId: number | null = null
let chartAnimStart = 0
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let initialized = false

// ── Star name → color mapping for orbs ──
const STAR_COLOR_MAP: Record<string, string> = {
  紫微: 'gold',
  天府: 'gold',
  武曲: 'gold',
  天梁: 'gold',
  天相: 'jade',
  天机: 'jade',
  天同: 'jade',
  太阳: 'cinnabar',
  廉贞: 'cinnabar',
  贪狼: 'cinnabar',
  七杀: 'cinnabar',
  巨门: 'gray',
  破军: 'gray',
  太阴: 'ice',
  文昌: 'ice',
  文曲: 'ice',
  天马: 'ice',
  左辅: 'jade',
  右弼: 'jade',
  禄存: 'gold',
  天魁: 'gold',
  天钺: 'gold',
  擎羊: 'gray',
  陀罗: 'gray',
  火星: 'gray',
  铃星: 'gray',
  地劫: 'gray',
  地空: 'gray',
}

const MUTAGEN_CLS: Record<string, string> = {
  禄: 'lu',
  权: 'quan',
  科: 'ke',
  忌: 'ji',
}

const ORB_BASE_STYLES: Record<string, Record<string, string>> = {
  gold: {
    background: '#C62828',
    border: '1.5px solid #D4A84B',
    boxShadow: '0 0 6px rgba(93,78,55,0.2)',
  },
  cinnabar: {
    background: '#A02020',
    border: '1px solid rgba(198,40,40,0.3)',
    boxShadow: '0 0 6px rgba(93,78,55,0.2)',
  },
  jade: {
    background: '#3D6B4B',
    border: '1px solid rgba(61,107,75,0.3)',
    boxShadow: '0 0 6px rgba(93,78,55,0.2)',
  },
  ice: {
    background: '#6BA8C8',
    border: '1px solid rgba(107,168,200,0.3)',
    boxShadow: '0 0 6px rgba(93,78,55,0.2)',
  },
  purple: {
    background: '#7B6FA0',
    border: '1px solid rgba(123,111,160,0.3)',
    boxShadow: '0 0 6px rgba(93,78,55,0.2)',
  },
  gray: {
    background: '#5D4E37',
    border: '1px solid rgba(93,78,55,0.3)',
    boxShadow: '0 0 6px rgba(93,78,55,0.2)',
  },
  white: {
    background: '#8B7D6B',
    border: '1px solid rgba(139,125,107,0.3)',
    boxShadow: '0 0 6px rgba(93,78,55,0.15)',
  },
}

function getStarColor(name: string): string {
  return STAR_COLOR_MAP[name] || 'white'
}

// ── Wobbly (hand-drawn) circle path SVG ──
function createWobblyCircle(cx: number, cy: number, r: number, wobble: number): string {
  const s = wobble || 1.5
  const o = (i: number) => Math.sin(r * (1.3 + i * 1.4)) * s
  const c = (i: number) => Math.cos(r * (2.7 + i * 2.2)) * s
  const k = 0.5522847498
  return (
    'M ' +
    cx +
    ',' +
    (cy - r + o(0)) +
    ' C ' +
    (cx + k * r + o(1)) +
    ',' +
    (cy - r + o(0)) +
    ' ' +
    (cx + r + c(1)) +
    ',' +
    (cy - k * r + c(2)) +
    ' ' +
    (cx + r + c(1)) +
    ',' +
    cy +
    ' C ' +
    (cx + r + c(1)) +
    ',' +
    (cy + k * r + c(3)) +
    ' ' +
    (cx + k * r + o(1)) +
    ',' +
    (cy + r + o(4)) +
    ' ' +
    cx +
    ',' +
    (cy + r + o(4)) +
    ' C ' +
    (cx - k * r + o(5)) +
    ',' +
    (cy + r + o(4)) +
    ' ' +
    (cx - r + c(6)) +
    ',' +
    (cy + k * r + c(3)) +
    ' ' +
    (cx - r + c(6)) +
    ',' +
    cy +
    ' C ' +
    (cx - r + c(6)) +
    ',' +
    (cy - k * r + c(2)) +
    ' ' +
    (cx - k * r + o(5)) +
    ',' +
    (cy - r + o(0)) +
    ' ' +
    cx +
    ',' +
    (cy - r + o(0)) +
    ' Z'
  )
}

// ── Build celestial star data from iztro palaces ──
function buildCelestialStars() {
  celestialStars = []
  const starRadii = [RINGS[0].r, RINGS[2].r, RINGS[4].r, RINGS[1].r, RINGS[3].r]

  props.palaces.forEach((palace, pIdx) => {
    const baseAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] || 0
    const allStars: { name: string; major: boolean; mutagen: string | null }[] = [
      ...palace.majorStars.map(s => ({ name: s.name, major: true, mutagen: s.mutagen || null })),
      ...palace.minorStars.map(s => ({ name: s.name, major: false, mutagen: s.mutagen || null })),
      ...palace.adjectiveStars.map(s => ({
        name: s.name,
        major: false,
        mutagen: s.mutagen || null,
      })),
    ]

    allStars.forEach((star, i) => {
      const angleOffset = (i - (allStars.length - 1) / 2) * 4
      celestialStars.push({
        name: star.name,
        color: getStarColor(star.name),
        major: star.major,
        palaceIdx: pIdx,
        angleDeg: baseAngle + 15 + angleOffset,
        radius: starRadii[i % starRadii.length] || RINGS[2].r,
        speed: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        mutagen: star.mutagen,
      })
    })
  })
}

// ── SVG orbit rings with sector dividers ──
function renderOrbitRings() {
  const svg = orbitSvg.value
  if (!svg) return
  svg.innerHTML = ''

  const ns = 'http://www.w3.org/2000/svg'

  // Wobbly orbit rings
  RINGS.forEach(ring => {
    const pathData = createWobblyCircle(CX, CY, ring.r, 1.2)
    const el = document.createElementNS(ns, 'path')
    el.setAttribute('d', pathData)
    el.setAttribute('fill', 'none')
    el.setAttribute('stroke', '#D4C5B0')
    el.setAttribute('stroke-width', '0.8')
    el.setAttribute('opacity', '0.35')
    svg.appendChild(el)
  })

  // Sector divider lines (cinnabar ruler marks)
  const branches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
  branches.forEach(br => {
    const rawAngle = BRANCH_TO_ANGLE[br] || 0
    const angleRad = ((rawAngle - 90) * Math.PI) / 180
    const x1 = CX + Math.cos(angleRad) * RINGS[0].r
    const y1 = CY + Math.sin(angleRad) * RINGS[0].r
    const x2 = CX + Math.cos(angleRad) * (RINGS[4].r + 8)
    const y2 = CY + Math.sin(angleRad) * (RINGS[4].r + 8)
    const line = document.createElementNS(ns, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', '#C62828')
    line.setAttribute('stroke-width', '0.5')
    line.setAttribute('opacity', '0.2')
    svg.appendChild(line)
  })

  // Faint reference cross lines (dashed)
  ;[
    { x1: CX - RINGS[4].r - 10, y1: CY, x2: CX + RINGS[4].r + 10, y2: CY },
    { x1: CX, y1: CY - RINGS[4].r - 10, x2: CX, y2: CY + RINGS[4].r + 10 },
  ].forEach(({ x1, y1, x2, y2 }) => {
    const line = document.createElementNS(ns, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', '#D4C5B0')
    line.setAttribute('stroke-width', '0.4')
    line.setAttribute('opacity', '0.12')
    line.setAttribute('stroke-dasharray', '3,5')
    svg.appendChild(line)
  })
}

// ── Sector labels around chart edge ──
function renderSectorLabels() {
  const container = sectorLabelsContainer.value
  if (!container) return
  container.innerHTML = ''

  props.palaces.forEach((palace, i) => {
    const rawAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] || 0
    const angleRad = ((rawAngle + 15 - 90) * Math.PI) / 180
    const x = (CX + Math.cos(angleRad) * LABEL_R) * chartScale
    const y = (CY + Math.sin(angleRad) * LABEL_R) * chartScale

    const label = document.createElement('div')
    label.className = 'sector-label' + (palace.index === props.mingGongIndex ? ' ming-gong' : '')
    label.textContent = palace.name
    label.style.left = x + 'px'
    label.style.top = y + 'px'
    label.dataset.index = String(i)
    label.addEventListener('click', () => emit('select', i))
    container.appendChild(label)
  })
}

// ── Star DOM elements positioned on chart ──
function createStarElements() {
  const container = starsContainer.value
  if (!container) return
  container.innerHTML = ''
  starElements = []

  // Container for mutagen chips (layered above stars)
  const chipsContainer = document.createElement('div')
  chipsContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;'
  container.appendChild(chipsContainer)

  celestialStars.forEach((star, i) => {
    const el = document.createElement('div')
    el.className = 'chart-star' + (star.major ? '' : ' minor')
    el.dataset.index = String(i)

    // Orb element
    const orb = document.createElement('div')
    orb.className = 'star-orb'
    const size = star.major ? '14px' : '11px'
    const styles = ORB_BASE_STYLES[star.color] || ORB_BASE_STYLES.white
    Object.assign(orb.style, { width: size, height: size, borderRadius: '50%' }, styles)
    el.appendChild(orb)

    // Label below orb
    const label = document.createElement('div')
    label.className = 'star-label'
    label.textContent = star.name
    el.appendChild(label)

    el.addEventListener('click', () => emit('select', star.palaceIdx))

    container.appendChild(el)
    starElements.push(el)

    // 四化 chip for stars with mutagen
    if (star.mutagen) {
      const chip = document.createElement('div')
      chip.className = 'mutagen-chip-tx ' + (MUTAGEN_CLS[star.mutagen] || 'ji')
      chip.textContent = star.name + '化' + star.mutagen
      chip.dataset.starIdx = String(i)
      chipsContainer.appendChild(chip)
    }
  })

  // Staggered entrance fade-in
  starElements.forEach((el, i) => {
    el.style.opacity = '0'
    setTimeout(
      () => {
        el.style.transition = 'opacity 0.5s ease'
        el.style.opacity = '1'
      },
      100 + i * 25,
    )
  })
}

// ── Palace arc highlight ──
function drawPalaceArc(index: number) {
  const el = palaceArcEl.value
  if (!el) return
  if (index < 0 || !props.palaces[index]) {
    el.classList.remove('visible')
    return
  }
  const rawAngle = BRANCH_TO_ANGLE[props.palaces[index].earthlyBranch] || 0
  el.style.background = `conic-gradient(from ${rawAngle - 15}deg, transparent 0deg, rgba(198,40,40,0.08) 0deg, rgba(198,40,40,0.16) 30deg, transparent 30deg, transparent 360deg)`
  el.classList.add('visible')
}

// ── Animation loop (orbital drift + twinkle) ──
function animateCelestial(timestamp: number) {
  const t = (timestamp - chartAnimStart) / 1000

  for (let i = 0; i < celestialStars.length; i++) {
    const star = celestialStars[i]
    const el = starElements[i]
    if (!el) continue

    const angleRad = ((star.angleDeg + t * star.speed * 15 - 90) * Math.PI) / 180
    const x = (CX + Math.cos(angleRad) * star.radius) * chartScale
    const y = (CY + Math.sin(angleRad) * star.radius) * chartScale

    el.style.left = x + 'px'
    el.style.top = y + 'px'

    const twinkle = 0.82 + 0.18 * Math.sin(t * 1.5 + star.phase)
    el.style.opacity = String(twinkle)
  }

  // Update 四化 chip positions to follow parent stars
  const container = starsContainer.value
  if (container) {
    const chips = container.querySelectorAll('.mutagen-chip-tx')
    for (let ci = 0; ci < chips.length; ci++) {
      const chip = chips[ci] as HTMLElement
      const sIdx = parseInt(chip.dataset.starIdx || '-1', 10)
      const parentEl = starElements[sIdx]
      if (parentEl) {
        const sx = parseFloat(parentEl.style.left)
        const sy = parseFloat(parentEl.style.top)
        if (!isNaN(sx)) {
          chip.style.left = sx + 10 + 'px'
          chip.style.top = sy - 8 + 'px'
        }
      }
    }
  }

  animFrameId = requestAnimationFrame(animateCelestial)
}

// ── Responsive scaling ──
function updateChartScale() {
  if (chartContainer.value) {
    chartScale = chartContainer.value.offsetWidth / BASE
  }
}

function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    updateChartScale()
    renderSectorLabels()
  }, 200)
}

// ── Exposed update for parent to trigger on selection change ──
function updateSelection() {
  // Update sector labels
  if (sectorLabelsContainer.value) {
    const labels = sectorLabelsContainer.value.querySelectorAll('.sector-label')
    labels.forEach((label, i) => {
      label.classList.toggle('selected', i === props.selectedIndex)
    })
  }
  // Update active star highlight
  starElements.forEach((el, i) => {
    const star = celestialStars[i]
    if (!star) return
    el.classList.toggle('active', star.palaceIdx === props.selectedIndex)
  })
  // Update palace arc
  drawPalaceArc(props.selectedIndex)
}

// ── Init ──
function init() {
  if (initialized) return
  initialized = true
  updateChartScale()
  buildCelestialStars()
  renderOrbitRings()
  renderSectorLabels()
  createStarElements()
  updateSelection()
  chartAnimStart = performance.now()
  animFrameId = requestAnimationFrame(animateCelestial)
}

// ── Lifecycle ──
onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (resizeTimer) clearTimeout(resizeTimer)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div
    ref="chartContainer"
    class="celestial-chart relative w-full aspect-square max-w-[620px] mx-auto"
  >
    <svg
      ref="orbitSvg"
      class="absolute inset-0 w-full h-full z-0 pointer-events-none"
      :viewBox="`0 0 ${BASE} ${BASE}`"
      preserveAspectRatio="xMidYMid meet"
    ></svg>
    <div ref="sectorLabelsContainer" class="absolute inset-0 z-[1] pointer-events-none"></div>
    <div ref="starsContainer" class="absolute inset-0 z-[3] pointer-events-none"></div>

    <!-- Center seal -->
    <div
      class="center-seal absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] z-10 pointer-events-none"
    >
      <div
        class="seal-body w-full h-full rounded-full border-2 border-[#D4A84B] flex items-center justify-center"
        style="background: radial-gradient(circle at 40% 35%, #D44040, #C62828 50%, #8A1B1B); box-shadow: 0 0 18px rgba(93,78,55,0.25), 0 0 40px rgba(93,78,55,0.1); animation: seal-breathe 4s ease-in-out infinite;"
      >
        <span
          class="font-display text-[1.5rem] text-[#D4A84B]"
          style="text-shadow: 0 0 6px rgba(212,168,75,0.3);"
          >紫</span
        >
      </div>
      <div
        class="absolute -bottom-[18px] left-1/2 -translate-x-1/2 font-display text-[0.65rem] text-ink-light whitespace-nowrap tracking-[0.1em] opacity-60"
      >
        紫微星
      </div>
    </div>

    <!-- Palace arc highlight overlay -->
    <div
      ref="palaceArcEl"
      class="palace-arc absolute -inset-1 rounded-full pointer-events-none z-[1] opacity-0 transition-opacity duration-500"
    ></div>
  </div>
</template>

<style scoped>
.sector-label {
  position: absolute;
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: #7a6a5c;
  opacity: 0.6;
  transition:
    opacity 0.3s,
    color 0.3s;
  white-space: nowrap;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
}
.sector-label:hover {
  opacity: 0.9;
  color: #6b5b4f;
}
.sector-label.ming-gong {
  color: #c62828;
  opacity: 0.8;
}

.chart-star {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  z-index: 3;
  transition: z-index 0.2s;
}
.chart-star:hover {
  z-index: 20;
}
.star-orb {
  border-radius: 50%;
  transition: transform 0.3s;
}
.chart-star:hover .star-orb {
  transform: scale(1.25);
}

.star-label {
  margin-top: 2px;
  font-size: 0.55rem;
  color: #6b5b4f;
  letter-spacing: 0.04em;
  white-space: nowrap;
  opacity: 0.5;
  transition: opacity 0.3s;
  pointer-events: none;
  font-family: 'Noto Sans SC', sans-serif;
}
.chart-star:hover .star-label {
  opacity: 0.9;
}
.chart-star.active .star-label {
  opacity: 0.9;
  color: #c62828;
}

.chart-star.active::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #c62828;
  transform: translate(-50%, -50%);
  animation: ring-pulse 2s ease-out infinite;
  pointer-events: none;
  opacity: 0.5;
}

.mutagen-chip-tx {
  position: absolute;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 0.5rem;
  letter-spacing: 0.04em;
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
  line-height: 1.2;
  font-family: 'Noto Sans SC', sans-serif;
  transition: opacity 0.3s;
}
.mutagen-chip-tx.lu {
  background: rgba(198, 40, 40, 0.15);
  color: #c62828;
  border: 0.5px solid rgba(198, 40, 40, 0.2);
}
.mutagen-chip-tx.quan {
  background: rgba(61, 107, 75, 0.15);
  color: #3d6b4b;
  border: 0.5px solid rgba(61, 107, 75, 0.2);
}
.mutagen-chip-tx.ke {
  background: rgba(107, 168, 200, 0.15);
  color: #6ba8c8;
  border: 0.5px solid rgba(107, 168, 200, 0.2);
}
.mutagen-chip-tx.ji {
  background: rgba(93, 78, 55, 0.12);
  color: #5d4e37;
  border: 0.5px solid rgba(93, 78, 55, 0.15);
}

.palace-arc.visible {
  opacity: 1 !important;
}

@keyframes ring-pulse {
  0% {
    width: 20px;
    height: 20px;
    opacity: 0.4;
  }
  100% {
    width: 44px;
    height: 44px;
    opacity: 0;
  }
}

@keyframes seal-breathe {
  0%,
  100% {
    box-shadow:
      0 0 18px rgba(93, 78, 55, 0.25),
      0 0 40px rgba(93, 78, 55, 0.1);
  }
  50% {
    box-shadow:
      0 0 24px rgba(93, 78, 55, 0.35),
      0 0 50px rgba(93, 78, 55, 0.15);
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add components/tools/ziwei/ZiWeiCelestialChart.vue
git commit -m "feat: add ZiWeiCelestialChart SVG+DOM celestial view"
```

---

### Task 7: Create ZiWeiTabSwitcher.vue

**Files:**

- Create: `components/tools/ziwei/ZiWeiTabSwitcher.vue`

- [ ] **Step 1: Write the tab switcher component**

书签-style tab bar that switches between 天星图 (celestial) and 回宫图 (grid) views.

```vue
<!-- components/tools/ziwei/ZiWeiTabSwitcher.vue -->
<script setup lang="ts">
defineProps<{
  currentView: 'celestial' | 'grid'
}>()

const emit = defineEmits<{
  'update:current-view': [value: 'celestial' | 'grid']
}>()
</script>

<template>
  <div class="flex justify-center mb-2" role="tablist" aria-label="命盘视图切换">
    <button
      role="tab"
      aria-selected="currentView === 'celestial'"
      class="tab-switch px-8 py-2 font-display text-[1.1rem] tracking-[0.1em] cursor-pointer transition-all duration-300 relative border border-paper-dark/30 border-b-0 rounded-t-lg first-of-type:border-r-0"
      :class="currentView === 'celestial' ? 'active' : 'inactive'"
      @click="emit('update:current-view', 'celestial')"
      @keydown.enter="emit('update:current-view', 'celestial')"
      @keydown.space.prevent="emit('update:current-view', 'celestial')"
    >
      天星图
    </button>
    <button
      role="tab"
      aria-selected="currentView === 'grid'"
      class="tab-switch px-8 py-2 font-display text-[1.1rem] tracking-[0.1em] cursor-pointer transition-all duration-300 relative border border-paper-dark/30 border-b-0 rounded-t-lg"
      :class="currentView === 'grid' ? 'active' : 'inactive'"
      @click="emit('update:current-view', 'grid')"
      @keydown.enter="emit('update:current-view', 'grid')"
      @keydown.space.prevent="emit('update:current-view', 'grid')"
    >
      回宫图
    </button>
  </div>
</template>

<style scoped>
.tab-switch {
  background: #ede4d3;
  color: #7a6a5c;
}
.tab-switch.inactive:hover {
  color: #6b5b4f;
  background: #e0d5c0;
}
.tab-switch.active {
  background: #f5f0e8;
  color: #1e1210;
  z-index: 1;
}
.tab-switch.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #c62828;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add components/tools/ziwei/ZiWeiTabSwitcher.vue
git commit -m "feat: add ZiWeiTabSwitcher with celestial/grid tabs"
```

---

### Task 8: Create ZiWeiDetailPanel.vue (right sidebar)

**Files:**

- Create: `components/tools/ziwei/ZiWeiDetailPanel.vue`

- [ ] **Step 1: Write the detail panel component**

```vue
<!-- components/tools/ziwei/ZiWeiDetailPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { getDetailedPalaceView } from '~/composables/useZiwei'

const props = defineProps<{
  palace: IFunctionalPalace | null
}>()

const detailView = computed(() => {
  if (!props.palace) return null
  return getDetailedPalaceView(props.palace)
})
</script>

<template>
  <div
    class="bg-paper/80 backdrop-blur-sm rounded-xl border border-paper-dark/30 p-4"
    role="region"
    aria-label="宫位解读"
  >
    <!-- Palace header -->
    <div v-if="detailView" class="space-y-3">
      <div class="flex items-center gap-2">
        <h3 class="font-serif text-lg font-bold text-ink-dark">{{ detailView.name }}</h3>
        <span class="text-xs text-ink-light bg-ink-dark/5 px-2 py-0.5 rounded"
          >{{ detailView.stem }}{{ detailView.branch }}</span
        >
      </div>

      <!-- 大限 -->
      <div
        v-if="detailView.decadalRange && detailView.decadalRange[0] > 0"
        class="text-xs text-ink-light"
      >
        大限：{{ detailView.decadalRange[0] }}~{{ detailView.decadalRange[1] }}
      </div>

      <!-- 主星 -->
      <div v-if="detailView.majorStars.length > 0">
        <h4 class="text-xs font-semibold text-ink-dark/60 mb-1 uppercase tracking-wider">主星</h4>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="star in detailView.majorStars"
            :key="star.name"
            class="px-2 py-0.5 text-sm rounded bg-ink-dark/5 text-ink-dark font-medium"
          >
            {{ star.name
            }}<span v-if="star.brightness" class="text-[10px] text-ink-light ml-0.5">{{
              star.brightness
            }}</span>
          </span>
        </div>
      </div>

      <!-- 辅星 -->
      <div v-if="detailView.minorStars.length > 0">
        <h4 class="text-xs font-semibold text-ink-dark/60 mb-1 uppercase tracking-wider">辅星</h4>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="star in detailView.minorStars"
            :key="star.name"
            class="px-1.5 py-0.5 text-xs text-ink-light bg-ink-dark/[0.04] rounded"
            >{{ star.name }}</span
          >
        </div>
      </div>

      <!-- 四化 -->
      <div v-if="detailView.transformations.length > 0">
        <h4 class="text-xs font-semibold text-ink-dark/60 mb-1 uppercase tracking-wider">四化</h4>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="t in detailView.transformations"
            :key="t.star + t.transformation"
            class="px-1.5 py-0.5 text-xs rounded font-medium"
            :class="{
              'bg-red-50 text-red-700': t.transformation === '禄',
              'bg-blue-50 text-blue-700': t.transformation === '权',
              'bg-green-50 text-green-700': t.transformation === '科',
              'bg-gray-100 text-gray-500': t.transformation === '忌',
            }"
            >{{ t.star }}化{{ t.transformation }}</span
          >
        </div>
      </div>

      <!-- 解读 -->
      <div class="space-y-2 pt-2 border-t border-paper-dark/20">
        <p
          v-if="detailView.interpretation.palaceSummary"
          class="text-xs text-ink-dark leading-relaxed"
        >
          {{ detailView.interpretation.palaceSummary }}
        </p>
        <div v-if="detailView.interpretation.starReadings.length > 0" class="space-y-1">
          <p
            v-for="(reading, i) in detailView.interpretation.starReadings"
            :key="i"
            class="text-xs text-ink-dark leading-relaxed"
          >
            {{ reading }}
          </p>
        </div>
        <p
          v-if="detailView.interpretation.combinationNote"
          class="text-xs text-cinnabar leading-relaxed font-medium"
        >
          {{ detailView.interpretation.combinationNote }}
        </p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-8 text-ink-light/50 text-sm">选择一个宫位查看详细解读</div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add components/tools/ziwei/ZiWeiDetailPanel.vue
git commit -m "feat: add ZiWeiDetailPanel right sidebar component"
```

---

### Task 9: Create ZiWeiDaXianTimeline.vue

**Files:**

- Create: `components/tools/ziwei/ZiWeiDaXianTimeline.vue`

- [ ] **Step 1: Write the timeline component**

```vue
<!-- components/tools/ziwei/ZiWeiDaXianTimeline.vue -->
<script setup lang="ts">
interface DaXianPeriod {
  startAge: number
  endAge: number
  palaceName: string
  stars: string
}

const props = defineProps<{
  periods: DaXianPeriod[]
  currentAge: number
}>()
</script>

<template>
  <div v-if="periods.length > 0" class="overflow-x-auto py-4">
    <div class="flex gap-2 min-w-max px-2">
      <div v-for="(period, i) in periods" :key="i" class="flex flex-col items-center min-w-[80px]">
        <div
          class="w-full px-3 py-2 rounded-lg text-center text-xs transition-colors cursor-default"
          :class="
            currentAge >= period.startAge && currentAge <= period.endAge
              ? 'bg-cinnabar/10 ring-1 ring-cinnabar/30 text-ink-dark font-medium'
              : 'bg-ink-dark/5 text-ink-light'
          "
        >
          <div class="font-semibold">{{ period.startAge }}-{{ period.endAge }}岁</div>
          <div class="text-[10px] mt-0.5 opacity-70">{{ period.palaceName }}</div>
          <div class="text-[9px] opacity-50 truncate max-w-[72px]">{{ period.stars }}</div>
        </div>
        <!-- Connector -->
        <div v-if="i < periods.length - 1" class="w-4 h-0.5 bg-ink-dark/10 -mt-0.5" />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add components/tools/ziwei/ZiWeiDaXianTimeline.vue
git commit -m "feat: add ZiWeiDaXianTimeline component"
```

---

### Task 10: Create ZiWeiInputForm.vue

**Files:**

- Create: `components/tools/ziwei/ZiWeiInputForm.vue`

- [ ] **Step 1: Write the input form component**

```vue
<!-- components/tools/ziwei/ZiWeiInputForm.vue -->
<script setup lang="ts">
import { TIME_NAMES, GENDER_OPTIONS } from '~/constants/ziwei'

defineProps<{
  birthDate: string
  birthHour: number | null
  gender: 'male' | 'female' | null
  loading: boolean
  onCalculate: () => void
  onDateChange: (val: string) => void
  onHourChange: (val: number | null) => void
  onGenderChange: (val: 'male' | 'female') => void
}>()
</script>

<template>
  <div
    class="bg-paper/80 backdrop-blur-sm rounded-xl border border-paper-dark/30 p-6 mb-6 max-w-md mx-auto"
  >
    <h2 class="font-serif text-lg font-bold text-ink-dark mb-4 text-center">紫微斗数排盘</h2>

    <div class="space-y-4">
      <!-- Birth date -->
      <div>
        <label for="ziwei-birth-date" class="block text-sm text-ink-dark/70 mb-1">出生日期</label>
        <input
          id="ziwei-birth-date"
          type="date"
          :value="birthDate"
          @input="onDateChange($event.target.value)"
          class="input-ink w-full"
        />
      </div>

      <!-- Birth hour -->
      <div>
        <label for="ziwei-birth-hour" class="block text-sm text-ink-dark/70 mb-1">出生时辰</label>
        <select
          id="ziwei-birth-hour"
          :value="birthHour ?? ''"
          @change="onHourChange($event.target.value ? Number($event.target.value) : null)"
          class="input-ink w-full"
        >
          <option value="">— 选择时辰 —</option>
          <option v-for="(name, idx) in TIME_NAMES" :key="idx" :value="idx">
            {{ name }}
          </option>
        </select>
      </div>

      <!-- Gender -->
      <div>
        <label class="block text-sm text-ink-dark/70 mb-1">性别</label>
        <div class="flex gap-3">
          <label
            v-for="opt in GENDER_OPTIONS"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name="ziwei-gender"
              :value="opt.value"
              :checked="gender === opt.value"
              @change="onGenderChange(opt.value)"
              class="sr-only"
            />
            <span
              class="px-4 py-2 text-sm rounded-lg border transition-colors"
              :class="
                gender === opt.value
                  ? 'border-cinnabar bg-cinnabar/5 text-cinnabar font-medium'
                  : 'border-paper-dark/30 text-ink-light hover:border-ink-dark/30'
              "
              >{{ opt.label }}</span
            >
          </label>
        </div>
      </div>

      <!-- Calculate button -->
      <button
        @click="onCalculate"
        @keydown.enter="onCalculate"
        @keydown.space.prevent="onCalculate"
        :disabled="loading || !birthDate || birthHour === null || !gender"
        class="btn-seal w-full justify-center"
      >
        <span>{{ loading ? '排盘中...' : '开始排盘' }}</span>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add components/tools/ziwei/ZiWeiInputForm.vue
git commit -m "feat: add ZiWeiInputForm component"
```

---

### Task 11: Create ZiWeiInfoSidebar.vue (profile info)

**Files:**

- Create: `components/tools/ziwei/ZiWeiInfoSidebar.vue`

- [ ] **Step 1: Write the info sidebar**

```vue
<!-- components/tools/ziwei/ZiWeiInfoSidebar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import { getTimeName } from '~/constants/ziwei'

const props = defineProps<{
  astrolabe: IFunctionalAstrolabe
  birthHour: number | null // iztro timeIndex (0-12)
}>()

const solarDate = computed(() => {
  const parts = props.astrolabe.solarDate.split('-')
  return {
    year: parts[0] || '',
    month: parts[1] || '',
    day: parts[2] || '',
  }
})
</script>

<template>
  <div
    class="bg-paper/80 backdrop-blur-sm rounded-xl border border-paper-dark/30 p-4 text-xs space-y-2"
  >
    <h4 class="font-serif font-semibold text-ink-dark text-sm">命盘信息</h4>
    <div class="space-y-1.5 text-ink-light">
      <div>
        <span class="block text-ink-dark/50 text-[10px]">出生</span>
        <span>{{ solarDate.year }}年{{ solarDate.month }}月{{ solarDate.day }}日</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">时辰</span>
        <span>{{ birthHour !== null ? getTimeName(birthHour) : '—' }}</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">性别</span>
        <span>{{ astrolabe.gender }}</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">命宫</span>
        <span class="text-cinnabar font-medium">{{ astrolabe.earthlyBranchOfSoulPalace }}宫</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">身宫</span>
        <span>{{ astrolabe.earthlyBranchOfBodyPalace }}宫</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">五行局</span>
        <span>{{ astrolabe.fiveElementsClass }}</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add components/tools/ziwei/ZiWeiInfoSidebar.vue
git commit -m "feat: add ZiWeiInfoSidebar profile info component"
```

---

### Task 12: Create pages/tools/ziwei.vue with dual-view support

**Files:**

- Create: `pages/tools/ziwei.vue`

- [ ] **Step 1: Write the page entry with tab switching between 天星图 and 回宫图**

Key additions over the initial plan:

- `currentView` ref toggling between `'celestial'` and `'grid'`
- `<ZiWeiTabSwitcher>` for switching views
- `<ZiWeiCelestialChart>` for the celestial star chart view
- Conditional rendering: celestial chart OR palace grid based on current view

```vue
<!-- pages/tools/ziwei.vue -->
<script setup lang="ts">
import {
  calculateZiWei,
  getDetailedPalaceView,
  getMingGongIndex,
  serializeAstrolabe,
} from '~/composables/useZiwei'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'

useHead({ title: '紫微斗数 - 玄学' })

const router = useRouter()
const { currentProfile, restoreSession, getAuthHeaders } = useAuth()

const loading = ref(false)
const error = ref('')
const astrolabe = ref<IFunctionalAstrolabe | null>(null)
const selectedPalace = ref<IFunctionalPalace | null>(null)
const selectedIndex = ref(0)
const showHistoryModal = ref(false)
const currentView = ref<'celestial' | 'grid'>('celestial')

// Form state
const birthDate = ref('')
const birthHour = ref<number | null>(null)
const gender = ref<'male' | 'female' | null>(null)

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }

  // Pre-fill from profile if available
  if (currentProfile.value.birth_date) {
    birthDate.value = currentProfile.value.birth_date
  }
  if (currentProfile.value.birth_hour !== null && currentProfile.value.birth_hour !== undefined) {
    // Map birth_hour (0-23) to time index (0-12)
    const hour = currentProfile.value.birth_hour
    birthHour.value = Math.floor((hour + 1) / 2)
  }
  if (currentProfile.value.gender) {
    gender.value = currentProfile.value.gender === '男' ? 'male' : 'female'
  }
})

function handleCalculate() {
  if (!birthDate.value || birthHour.value === null || !gender.value) return

  // Parse date
  const parts = birthDate.value.split('-')
  if (parts.length !== 3) return
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return

  loading.value = true
  error.value = ''

  try {
    const ziweiResult = calculateZiWei({
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthHour: birthHour.value,
      gender: gender.value,
    })

    if (!ziweiResult) {
      error.value = '排盘计算出错，请检查出生信息'
      loading.value = false
      return
    }

    astrolabe.value = ziweiResult
    selectedIndex.value = getMingGongIndex(ziweiResult.palaces)
    selectedPalace.value = ziweiResult.palaces[selectedIndex.value] || null

    saveDivinationResult(ziweiResult)
  } catch {
    error.value = '排盘计算出错，请检查出生信息'
  }

  loading.value = false
}

function handleSelectPalace(index: number) {
  if (!astrolabe.value) return
  selectedIndex.value = index
  selectedPalace.value = astrolabe.value.palaces[index] || null
}

async function saveDivinationResult(astroData: IFunctionalAstrolabe) {
  try {
    const headers = getAuthHeaders()
    if (headers.Authorization) {
      await $fetch('/api/divinations', {
        method: 'POST',
        headers,
        body: {
          type: 'ziwei',
          input_data: {
            birthDate: birthDate.value,
            birthHour: birthHour.value,
            gender: gender.value,
          },
          result_data: serializeAstrolabe(astroData),
        },
      })
    }
  } catch {
    // Fire-and-forget: silent fail
  }
}

function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  restoreFromHistory(id)
}

async function restoreFromHistory(id: number) {
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const record = await $fetch<{ input_data: any; result_data: any }>(`/api/divinations/${id}`, {
      headers,
    })
    // Re-calculate from saved input_data (more reliable than restoring serialized snapshot)
    if (record.input_data?.birthDate) {
      birthDate.value = record.input_data.birthDate
      birthHour.value = record.input_data.birthHour ?? birthHour.value
      gender.value = record.input_data.gender ?? gender.value
      handleCalculate()
    }
  } catch {
    // Silent fail
  }
}
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">紫微斗数</h1>

    <!-- Not logged in -->
    <div v-if="!currentProfile" class="text-center py-16">
      <p class="font-sans text-lg text-ink-medium mb-4">请先登录</p>
      <NuxtLink to="/login" class="btn-seal inline-flex">
        <span>前往登录</span>
      </NuxtLink>
    </div>

    <!-- Input form (shown before first calculation) -->
    <div v-else-if="!astrolabe && !loading">
      <ZiWeiInputForm
        :birth-date="birthDate"
        :birth-hour="birthHour"
        :gender="gender"
        :loading="false"
        :on-calculate="handleCalculate"
        :on-date-change="(val: string) => (birthDate = val)"
        :on-hour-change="(val: number | null) => (birthHour = val)"
        :on-gender-change="(val: 'male' | 'female') => (gender = val)"
      />
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="space-y-6" aria-busy="true">
      <SkeletonCard />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <p class="text-base text-cinnabar" role="alert">{{ error }}</p>
      <div class="flex justify-center mt-6">
        <button @click="handleCalculate" class="btn-seal">
          <span>重新排盘</span>
        </button>
      </div>
    </div>

    <!-- Result with dual views -->
    <template v-else-if="astrolabe">
      <div class="max-w-[620px] mx-auto">
        <!-- Tab Switcher -->
        <ZiWeiTabSwitcher :current-view="currentView" @update:current-view="currentView = $event" />

        <!-- Celestial Chart (天星图) -->
        <ZiWeiCelestialChart
          v-if="currentView === 'celestial'"
          :palaces="astrolabe.palaces"
          :selected-index="selectedIndex"
          :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
          @select="handleSelectPalace"
        />

        <!-- Palace Grid (回宫图) -->
        <ZiWeiPalaceGrid
          v-if="currentView === 'grid'"
          :palaces="astrolabe.palaces"
          :selected-index="selectedIndex"
          :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
          :five-elements-class="astrolabe.fiveElementsClass"
          :on-select-palace="handleSelectPalace"
        />

        <!-- DaXian Timeline -->
        <div class="mt-4">
          <h3 class="text-xs text-ink-light/60 mb-2 text-center">大限</h3>
          <ZiWeiDaXianTimeline
            :periods="
              astrolabe.palaces.map(p => ({
                startAge: p.decadal?.range[0] ?? 0,
                endAge: p.decadal?.range[1] ?? 0,
                palaceName: p.name,
                stars: p.majorStars.map(s => s.name).join(' '),
              }))
            "
            :current-age="new Date().getFullYear() - parseInt(astrolabe.solarDate.split('-')[0])"
          />
        </div>

        <!-- History -->
        <div class="flex justify-center mt-6">
          <button @click="showHistoryModal = true" class="btn-seal" aria-haspopup="dialog">
            <span>浏览历史</span>
          </button>
        </div>
      </div>
    </template>

    <!-- nav-right slot: profile info + palace detail -->
    <template v-if="astrolabe" #nav-right>
      <div class="space-y-4">
        <ZiWeiInfoSidebar :astrolabe="astrolabe" :birth-hour="birthHour" />
        <ZiWeiDetailPanel v-if="selectedPalace" :palace="selectedPalace" />
      </div>
    </template>
  </ToolPageLayout>

  <HistoryModal
    :show="showHistoryModal"
    type="ziwei"
    @close="showHistoryModal = false"
    @restore="onHistoryRestore"
  />
</template>
```

- [ ] **Step 2: Commit**

```bash
git add pages/tools/ziwei.vue
git commit -m "feat: add Ziwei page with dual-view (celestial + grid) tab switcher"
```

---

### Task 13: Enable navigation entries

**Files:**

- Modify: `layouts/default.vue:15`
- Modify: `pages/index.vue:47-50`

- [ ] **Step 1: Enable ziwei in nav layout**

Change line 15 from:

```typescript
  { id: 'ziwei', name: '紫微斗数', char: '斗', route: '/tools/ziwei', available: false },
```

to:

```typescript
  { id: 'ziwei', name: '紫微斗数', char: '斗', route: '/tools/ziwei', available: true },
```

- [ ] **Step 2: Enable ziwei on homepage**

Change lines 47-50 from:

```typescript
    id: 'ziwei', name: '紫微斗数', char: '斗',
    description: '十二宫精批 ・ 星曜解读 ・ 即将上线',
    landingDescription: '排十二宫垣，解星曜布局与穷通祸福',
    route: '/tools/ziwei', available: false, accent: '#6B5B4F',
```

to:

```typescript
    id: 'ziwei', name: '紫微斗数', char: '斗',
    description: '天星回宫 ・ 十二宫精批 ・ 星曜解读 ・ 大限流年',
    landingDescription: '排十二宫垣，解星曜布局与穷通祸福',
    route: '/tools/ziwei', available: true, accent: '#6B5B4F',
```

- [ ] **Step 3: Commit**

```bash
git add layouts/default.vue pages/index.vue
git commit -m "feat: enable Ziwei navigation entries"
```

---

### Task 14: Final integration test

- [ ] **Step 1: Run type check and all tests**

Run: `npm run typecheck && npx vitest run`

Expected: TypeScript compiles clean, all existing tests + new ziwei tests pass.

- [ ] **Step 2: Build to verify production readiness**

Run: `npm run build`

Expected: Production build succeeds.

- [ ] **Step 3: Fix any issues found**

If type checking or tests fail, fix and re-run until clean.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck and test issues"
```
