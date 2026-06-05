# Batch 4B：星座星盘完整版 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在星座工具中新增 SVG 本命星盘可视化组件，展示七曜分布、相位关系、宫位划分及解读文字。

**Architecture:** `astronomy-engine` 提供 ±1 弧分行星黄经 → `useNatalChart.ts` 组装 PlanetPosition + AspectLine + House → `NatalChart.vue` 混合 SVG+DOM 渲染（沿袭 ZiWeiCelestialChart.vue 模式）→ `constellation.vue` 新增星盘 section。

**Tech Stack:** Nuxt 3 + Vue 3 + TypeScript + TailwindCSS + Vitest + `astronomy-engine` v2.x

**Spec:** `docs/superpowers/specs/2026-06-04-batch-4b-constellation-natal-chart-design.md`

---

## 文件结构总览

```
constants/
  planet-data.ts              ← [新建] 行星元数据 + 72 条行星×星座解读 + 5 条相位解释 (~250 行)
composables/
  useNatalChart.ts            ← [新建] astronomy-engine 封装 → 数据组装 → 相位 + 宫位 (~120 行)
  useConstellation.ts         ← [不变] solarLongitude/lunarLongitude/getRisingSign 保留原样
components/tools/constellation/
  NatalChart.vue              ← [新建] SVG+DOM 混合星盘组件 (~450 行)
pages/tools/
  constellation.vue           ← [修改] 新增星盘 section（+~35 行）
tests/composables/
  useNatalChart.test.ts       ← [新建] 数据组装 + 相位 + 宫位 + 边界测试 (~150 行)
package.json                  ← [修改] 新增 astronomy-engine 依赖
```

---

### Task 1: 安装 `astronomy-engine` 依赖

**Files:**

- Modify: `package.json`

- [ ] **Step 1: 安装 npm 包**

```bash
npm install astronomy-engine --registry https://registry.npmmirror.com
```

- [ ] **Step 2: 验证安装**

```bash
node -e "const {Body, GeoVector, Ecliptic} = require('astronomy-engine'); console.log('OK:', Object.keys(Body).length, 'bodies')"
```

Expected: `OK: 11 bodies`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add astronomy-engine v2.x for natal chart calculations"
```

---

### Task 2: 创建 `constants/planet-data.ts`

**Files:**

- Create: `constants/planet-data.ts`

**Purpose:** 行星元数据（glyph/中文名/颜色环）、72 条行星×星座解读、5 条相位解释。纯常量文件，无依赖。

- [ ] **Step 1: 创建常量文件**

```typescript
// constants/planet-data.ts

// ── Planet Metadata ────────────────────────────────────────────

export interface PlanetMeta {
  id: string
  name: string
  glyph: string
  colorClass: 'gold' | 'ice' | 'jade' | 'cinnabar' | 'purple' | 'gray'
  ring: 'inner' | 'mid' | 'outer'
}

export const PLANET_META: Record<string, PlanetMeta> = {
  sun: { id: 'sun', name: '太阳', glyph: '☉', colorClass: 'gold', ring: 'inner' },
  moon: { id: 'moon', name: '月亮', glyph: '☽', colorClass: 'ice', ring: 'inner' },
  mercury: { id: 'mercury', name: '水星', glyph: '☿', colorClass: 'jade', ring: 'mid' },
  venus: { id: 'venus', name: '金星', glyph: '♀', colorClass: 'jade', ring: 'mid' },
  mars: { id: 'mars', name: '火星', glyph: '♂', colorClass: 'cinnabar', ring: 'mid' },
  jupiter: { id: 'jupiter', name: '木星', glyph: '♃', colorClass: 'purple', ring: 'outer' },
  saturn: { id: 'saturn', name: '土星', glyph: '♄', colorClass: 'gray', ring: 'outer' },
}

export const PLANET_ORDER: string[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
]

// ── Planet × Sign Interpretations ──────────────────────────────

export const PLANET_SIGN_INTERPRETATIONS: Record<string, Record<string, string>> = {
  sun: {
    白羊座: '太阳在白羊，意志如烈火，行动力极强，勇往直前，是天生的开创者与领袖。',
    金牛座: '太阳在金牛，意志坚定稳健，重视物质积累与感官满足，不轻易动摇。',
    双子座: '太阳在双子，好奇心驱动人生，思维敏捷多变，善于交流与适应新环境。',
    巨蟹座: '太阳在巨蟹，情感是行动的原动力，家庭与安全感是人生核心主题。',
    狮子座: '太阳在狮子，入庙之位，自信慷慨，天生领袖，渴望成为众人瞩目的焦点。',
    处女座: '太阳在处女，追求完美与秩序，以服务他人为己任，细致严谨是最大力量。',
    天秤座: '太阳在天秤，追求和谐与平衡，优雅公正，在关系中定义自我价值。',
    天蝎座: '太阳在天蝎，意志力极强，深沉而炽烈，善于在危机中蜕变重生。',
    射手座: '太阳在射手，乐观自由，以探索真理为人生目标，视野开阔不拘小节。',
    摩羯座: '太阳在摩羯，目标明确步步为营，以成就和责任感定义人生的意义。',
    水瓶座: '太阳在水瓶，独立创新，追求自由平等，以独特视角看待世界与未来。',
    双鱼座: '太阳在双鱼，浪漫慈悲，边界感模糊，以艺术和灵性连接更广阔的世界。',
  },
  mercury: {
    白羊座: '水星在白羊，思维敏捷直接，说话不拐弯抹角，学习靠冲劲而非耐心。',
    金牛座: '水星在金牛，思维稳健务实，学习慢但根基扎实，不喜空谈只重实际。',
    双子座: '水星在双子，入庙之位，思维如风般灵动，口才出众，学习能力极强。',
    巨蟹座: '水星在巨蟹，思维受情绪驱动，记忆力带有情感色彩，善于直觉性表达。',
    狮子座: '水星在狮子，表达自信有力，思维富有创造性，喜欢以戏剧化方式沟通。',
    处女座: '水星在处女，入庙之位，思维缜密逻辑清晰，善于分析与细节把控。',
    天秤座: '水星在天秤，表达优雅得体，善于权衡利弊，沟通中追求和谐与公平。',
    天蝎座: '水星在天蝎，思维深邃穿透力强，不满足表面答案，善于发现隐藏真相。',
    射手座: '水星在射手，思维开阔宏观，关注大格局而非细节，表达直率乐观。',
    摩羯座: '水星在摩羯，思维严谨务实，表达简洁有力，注重逻辑与可操作性。',
    水瓶座: '水星在水瓶，思维前卫独特，善于跳出框架思考，常有创新见解。',
    双鱼座: '水星在双鱼，思维跳跃富有想象力，表达偏感性，逻辑边界模糊。',
  },
  venus: {
    白羊座: '金星在白羊，感情表达热烈直接，追求心动瞬间，爱时全心投入不拖泥带水。',
    金牛座: '金星在金牛，入庙之位，重视物质与感官享受，感情稳定持久，爱情观务实。',
    双子座: '金星在双子，感情中追求精神刺激与新鲜感，善于用言语表达爱意。',
    巨蟹座: '金星在巨蟹，感情细腻温柔，重视家庭与安全感，以照顾对方为爱的表达。',
    狮子座: '金星在狮子，爱情如戏剧般热烈浪漫，需要被仰慕和关注，大方慷慨。',
    处女座: '金星在处女，感情表达含蓄克制，以实际付出来表达爱意，注重细节关怀。',
    天秤座: '金星在天秤，入庙之位，天生优雅迷人，追求浪漫和谐的关系，审美品味出众。',
    天蝎座: '金星在天蝎，爱情炽烈深沉，渴望灵魂层面的融合，爱憎分明绝不中庸。',
    射手座: '金星在射手，爱情观自由开放，看重精神共鸣而非物质绑定，讨厌束缚。',
    摩羯座: '金星在摩羯，感情稳重务实，以责任和承诺为基石，爱得深沉但表达克制。',
    水瓶座: '金星在水瓶，爱情中追求独立与平等，需要精神共鸣远胜于浪漫激情。',
    双鱼座: '金星在双鱼，入旺之位，浪漫多情极富感染力，爱情是灵魂的交融与奉献。',
  },
  mars: {
    白羊座: '火星在白羊，入庙之位，行动力极强，竞争意识旺盛，敢为天下先。',
    金牛座: '火星在金牛，行动稳健持久，一旦启动便不轻易放弃，耐力惊人但启动较慢。',
    双子座: '火星在双子，精力分散多线并进，以机智和沟通为武器，缺乏持久专注。',
    巨蟹座: '火星在巨蟹，行动受情绪驱动，为保护家人而战，被动攻击多于主动出击。',
    狮子座: '火星在狮子，行动充满戏剧性和领导力，追求荣耀与认可，气势宏大。',
    处女座: '火星在处女，行动精准高效，注重细节与流程，以完美主义驱动执行。',
    天秤座: '火星在天秤，行动前反复权衡，追求公平与和谐，避免直接冲突。',
    天蝎座: '火星在天蝎，入庙之位，意志力极强，行动隐蔽而有力，不达目的不罢休。',
    射手座: '火星在射手，行动受理想驱动，热情奔放但容易分散，以信念为行动指南。',
    摩羯座: '火星在摩羯，入旺之位，行动力持久而专注，以目标和成就为导向。',
    水瓶座: '火星在水瓶，行动方式独特不按常理出牌，为集体和理念而奋斗。',
    双鱼座: '火星在双鱼，行动力起伏不定，凭直觉而非计划行事，逃避正面冲突。',
  },
  jupiter: {
    白羊座: '木星在白羊，以开拓精神为成长方式，通过冒险和竞争获得好运。',
    金牛座: '木星在金牛，通过稳健积累和物质建设获得成长，财富运自然而来。',
    双子座: '木星在双子，以学习和信息交换为成长路径，知识广博带来机遇。',
    巨蟹座: '木星在巨蟹，家庭和情感滋养是成长的根基，善用直觉把握机遇。',
    狮子座: '木星在狮子，以自信和创造力开拓机遇，慷慨大方带来好人缘和好运。',
    处女座: '木星在处女，以精益求精的态度积累实力，细微处见成长契机。',
    天秤座: '木星在天秤，通过合作和社交拓展机遇，和谐的人际关系是幸运之源。',
    天蝎座: '木星在天蝎，在危机和深度探索中获得蜕变式成长，洞察力带来财富。',
    射手座: '木星在射手，入庙之位，天生乐观好运，以探索和信念开拓无限可能。',
    摩羯座: '木星在摩羯，通过严谨规划和持久努力获得成就，晚年运势渐入佳境。',
    水瓶座: '木星在水瓶，以创新和人文关怀拓展格局，志同道合者带来机遇。',
    双鱼座: '木星在双鱼，入庙之位，以慈悲和直觉连接好运，灵性成长带来福报。',
  },
  saturn: {
    白羊座: '土星在白羊，需学会在冲动和自律间找平衡，以耐心驯服急躁的天性。',
    金牛座: '土星在金牛，对物质安全感有深刻的执念，需通过踏实努力建立根基。',
    双子座: '土星在双子，需克服浅尝辄止的倾向，以深度思考取代表面的信息收集。',
    巨蟹座: '土星在巨蟹，情感表达受到克制，需学会在责任与情感之间找到平衡。',
    狮子座: '土星在狮子，创造力受到约束，需通过踏实努力而非天赋获得认可。',
    处女座: '土星在处女，自律到近乎苛刻，事事力求完美，需学会适当放松标准。',
    天秤座: '土星在天秤，关系中承载责任，需学会在付出与索取之间建立边界。',
    天蝎座: '土星在天蝎，对深层控制和信任议题有严峻考验，需放下执念方能超越。',
    射手座: '土星在射手，自由受到限制，需在探索与承担之间找到自己的节奏。',
    摩羯座: '土星在摩羯，入庙之位，天生自律严谨，以坚韧和责任感成就事业。',
    水瓶座: '土星在水瓶，入庙之位，以理性和远见建立秩序，是社会改革的行动者。',
    双鱼座: '土星在双鱼，边界感薄弱，需学会在慈悲与现实之间建立健康的界限。',
  },
}

// ── Aspect Interpretations ─────────────────────────────────────

export const ASPECT_INTERPRETATIONS: Record<string, string> = {
  conjunction: '合相——两颗星能量融合，相互强化，影响最为直接有力。',
  sextile: '六合——两颗星互相激发，带来机遇与创造力，需主动把握。',
  square: '刑相——两颗星相互制约，带来内在张力，也是成长的催化剂。',
  trine: '三合——两颗星和谐共振，天赋所在，顺势而为即有所成。',
  opposition: '对冲——两颗星相互拉扯，需在两极之间寻找平衡与整合。',
}

// ── Aspect Meta ─────────────────────────────────────────────────

export interface AspectMeta {
  type: string
  angle: number
  orb: number
  symbol: string
  harmonious: boolean
}

export const ASPECT_TYPES: AspectMeta[] = [
  { type: 'conjunction', angle: 0, orb: 8, symbol: '☌', harmonious: true },
  { type: 'sextile', angle: 60, orb: 6, symbol: '⚹', harmonious: true },
  { type: 'square', angle: 90, orb: 6, symbol: '□', harmonious: false },
  { type: 'trine', angle: 120, orb: 6, symbol: '△', harmonious: true },
  { type: 'opposition', angle: 180, orb: 8, symbol: '☍', harmonious: false },
]

// ── Lookup Helpers ──────────────────────────────────────────────

export function getPlanetMeta(planetId: string): PlanetMeta | undefined {
  return PLANET_META[planetId]
}

export function getPlanetInterpretation(planetId: string, signName: string): string {
  return PLANET_SIGN_INTERPRETATIONS[planetId]?.[signName] ?? ''
}

export function getAspectInterpretation(aspectType: string): string {
  return ASPECT_INTERPRETATIONS[aspectType] ?? ''
}
```

- [ ] **Step 2: 验证 TypeScript 无语法错误**

```bash
npx nuxi typecheck
```

Expected: 零错误（新增常量文件无依赖，不会引入类型错误）

- [ ] **Step 3: Commit**

```bash
git add constants/planet-data.ts
git commit -m "feat: add planet metadata and 77 interpretation entries for natal chart"
```

---

### Task 3: 创建 `composables/useNatalChart.ts` + 测试（TDD）

**Files:**

- Create: `tests/composables/useNatalChart.test.ts`
- Create: `composables/useNatalChart.ts`

**Purpose:** 封装 astronomy-engine 调用，组装 PlanetPosition[]、计算相位、确定 Whole Sign House 宫位。

#### 3.1 先写测试

- [ ] **Step 1: 创建测试文件 — 行星组装完整性测试**

```typescript
// tests/composables/useNatalChart.test.ts
import { describe, it, expect } from 'vitest'
import {
  calculateNatalChart,
  computeAspects,
  computeHouses,
  type PlanetPosition,
} from '../../composables/useNatalChart'

describe('calculateNatalChart', () => {
  it('returns null when birthYear is null', () => {
    const result = calculateNatalChart(null, 6, 15, 12, 30)
    expect(result).toBeNull()
  })

  it('returns null when birthMonth is null', () => {
    const result = calculateNatalChart(1990, null, 15, 12, 30)
    expect(result).toBeNull()
  })

  it('returns null when birthDay is null', () => {
    const result = calculateNatalChart(1990, 6, null, 12, 30)
    expect(result).toBeNull()
  })

  it('returns null for year < 1900', () => {
    const result = calculateNatalChart(1500, 6, 15, 12, 30)
    expect(result).toBeNull()
  })

  it('returns valid data for complete birth info', () => {
    const result = calculateNatalChart(1990, 6, 15, 12, 30)
    expect(result).not.toBeNull()
    expect(result!.planets).toHaveLength(7)
    expect(result!.hasHouses).toBe(true)
    expect(result!.ascSignIndex).not.toBeNull()
    expect(result!.ascLongitude).not.toBeNull()
  })

  it('returns hasHouses=false when birthHour is null', () => {
    const result = calculateNatalChart(1990, 6, 15, null, null)
    expect(result).not.toBeNull()
    expect(result!.planets).toHaveLength(7)
    expect(result!.hasHouses).toBe(false)
  })

  it('each planet has all required fields', () => {
    const result = calculateNatalChart(1990, 6, 15, 12, 30)
    expect(result).not.toBeNull()
    for (const p of result!.planets) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.glyph).toBeTruthy()
      expect(typeof p.longitude).toBe('number')
      expect(p.longitude).toBeGreaterThanOrEqual(0)
      expect(p.longitude).toBeLessThan(360)
      expect(p.signIndex).toBeGreaterThanOrEqual(0)
      expect(p.signIndex).toBeLessThan(12)
      expect(p.signName).toBeTruthy()
      expect(p.signSymbol).toBeTruthy()
      expect(typeof p.retrograde).toBe('boolean')
      expect(typeof p.boundaryWarning).toBe('boolean')
      if (result!.hasHouses) {
        expect(p.houseIndex).not.toBeNull()
        expect(p.houseIndex!).toBeGreaterThanOrEqual(1)
        expect(p.houseIndex!).toBeLessThanOrEqual(12)
      } else {
        expect(p.houseIndex).toBeNull()
      }
    }
  })

  it('sun and moon are always present', () => {
    const result = calculateNatalChart(1990, 6, 15, 12, 30)
    expect(result).not.toBeNull()
    const ids = result!.planets.map(p => p.id)
    expect(ids).toContain('sun')
    expect(ids).toContain('moon')
  })

  it('all seven classical planets are present', () => {
    const result = calculateNatalChart(1990, 6, 15, 12, 30)
    expect(result).not.toBeNull()
    const ids = result!.planets.map(p => p.id).sort()
    expect(ids).toEqual(['jupiter', 'mars', 'mercury', 'moon', 'saturn', 'sun', 'venus'])
  })

  it('is deterministic — same inputs produce same outputs', () => {
    const a = calculateNatalChart(1990, 3, 21, 8, 0)
    const b = calculateNatalChart(1990, 3, 21, 8, 0)
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    for (let i = 0; i < 7; i++) {
      expect(a!.planets[i].longitude).toBe(b!.planets[i].longitude)
      expect(a!.planets[i].signIndex).toBe(b!.planets[i].signIndex)
    }
  })

  it('birthHour=0 is treated as valid hour (子时)', () => {
    const result = calculateNatalChart(1990, 6, 15, 0, 30)
    expect(result).not.toBeNull()
    expect(result!.hasHouses).toBe(true)
  })
})

describe('computeAspects', () => {
  // Construct fake planet positions with known longitudes for aspect testing
  function makePlanet(id: string, lon: number): PlanetPosition {
    return {
      id: id as PlanetPosition['id'],
      name: id,
      glyph: '',
      longitude: lon,
      signIndex: Math.floor(lon / 30),
      signName: '',
      signSymbol: '',
      houseIndex: null,
      retrograde: false,
      boundaryWarning: false,
    }
  }

  it('detects conjunction (0° within 8° orb)', () => {
    const planets = [makePlanet('sun', 100), makePlanet('moon', 103)]
    const aspects = computeAspects(planets)
    expect(aspects.length).toBeGreaterThanOrEqual(1)
    const conj = aspects.find(a => a.type === 'conjunction')
    expect(conj).toBeDefined()
    expect(conj!.orb).toBeCloseTo(3, 0)
  })

  it('detects trine (120° within 6° orb)', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 118)]
    const aspects = computeAspects(planets)
    const trine = aspects.find(a => a.type === 'trine')
    expect(trine).toBeDefined()
  })

  it('detects opposition (180° within 8° orb)', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 178)]
    const aspects = computeAspects(planets)
    const opp = aspects.find(a => a.type === 'opposition')
    expect(opp).toBeDefined()
  })

  it('detects square (90° within 6° orb)', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 93)]
    const aspects = computeAspects(planets)
    const sq = aspects.find(a => a.type === 'square')
    expect(sq).toBeDefined()
  })

  it('detects sextile (60° within 6° orb)', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 57)]
    const aspects = computeAspects(planets)
    const sextile = aspects.find(a => a.type === 'sextile')
    expect(sextile).toBeDefined()
  })

  it('excludes aspects exceeding orb', () => {
    // 100° from sun — not within orb of any major aspect
    const planets = [makePlanet('sun', 0), makePlanet('moon', 100)]
    const aspects = computeAspects(planets)
    expect(aspects).toHaveLength(0)
  })

  it('returns empty for single planet', () => {
    const planets = [makePlanet('sun', 100)]
    const aspects = computeAspects(planets)
    expect(aspects).toHaveLength(0)
  })

  it('aspect angle is always 0-180', () => {
    const planets = [makePlanet('sun', 350), makePlanet('moon', 10)]
    const aspects = computeAspects(planets)
    if (aspects.length > 0) {
      expect(aspects[0].angle).toBeGreaterThanOrEqual(0)
      expect(aspects[0].angle).toBeLessThanOrEqual(180)
    }
  })
})

describe('computeHouses', () => {
  it('returns null when ascSignIndex is null', () => {
    expect(computeHouses(null)).toBeNull()
  })

  it('house 1 = ascendant sign', () => {
    const houses = computeHouses(3) // Asc in Cancer (index 3)
    expect(houses).not.toBeNull()
    expect(houses![0]).toBe(3) // 1st house
  })

  it('returns 12 houses cycling through signs', () => {
    const houses = computeHouses(0) // Asc in Aries
    expect(houses).not.toBeNull()
    expect(houses).toHaveLength(12)
    expect(houses).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('wraps around at Pisces (index 11)', () => {
    const houses = computeHouses(10) // Asc in Aquarius
    expect(houses).not.toBeNull()
    expect(houses![0]).toBe(10) // 1st = Aquarius
    expect(houses![1]).toBe(11) // 2nd = Pisces
    expect(houses![2]).toBe(0) // 3rd = Aries
  })
})
```

- [ ] **Step 2: 运行测试 — 预期全部 FAIL（模块不存在）**

```bash
npx vitest run tests/composables/useNatalChart.test.ts
```

Expected: FAIL — `Cannot find module '../../composables/useNatalChart'`

#### 3.2 实现 composable

- [ ] **Step 3: 创建 `composables/useNatalChart.ts`**

```typescript
// composables/useNatalChart.ts
import { GeoVector, Ecliptic, Body } from 'astronomy-engine'
import { ZODIACS } from '~/composables/useConstellation'
import { PLANET_ORDER, PLANET_META } from '~/constants/planet-data'
import type { PlanetMeta } from '~/constants/planet-data'
import { ASPECT_TYPES } from '~/constants/planet-data'
import type { AspectMeta } from '~/constants/planet-data'

// ── Types ───────────────────────────────────────────────────────

export interface PlanetPosition {
  id: 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'
  name: string
  glyph: string
  longitude: number
  signIndex: number
  signName: string
  signSymbol: string
  houseIndex: number | null
  retrograde: boolean
  boundaryWarning: boolean
}

export interface AspectLine {
  p1: string
  p2: string
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  angle: number
  orb: number
}

export interface NatalChartData {
  planets: PlanetPosition[]
  aspects: AspectLine[]
  ascSignIndex: number | null
  ascLongitude: number | null
  mcLongitude: number | null
  hasHouses: boolean
}

// ── Body Mapping ────────────────────────────────────────────────

const BODY_MAP: Array<{ id: string; body: Body; meta: PlanetMeta }> = [
  { id: 'sun', body: Body.Sun, meta: PLANET_META.sun },
  { id: 'moon', body: Body.Moon, meta: PLANET_META.moon },
  { id: 'mercury', body: Body.Mercury, meta: PLANET_META.mercury },
  { id: 'venus', body: Body.Venus, meta: PLANET_META.venus },
  { id: 'mars', body: Body.Mars, meta: PLANET_META.mars },
  { id: 'jupiter', body: Body.Jupiter, meta: PLANET_META.jupiter },
  { id: 'saturn', body: Body.Saturn, meta: PLANET_META.saturn },
]

// ── Math Helpers ────────────────────────────────────────────────

/** Angular distance between two ecliptic longitudes, normalized to 0-180° */
function angularDistance(a: number, b: number): number {
  let d = Math.abs(a - b) % 360
  if (d > 180) d = 360 - d
  return d
}

/** Get zodiac sign index (0=Aries..11=Pisces) from ecliptic longitude */
function getSignIndex(lon: number): number {
  return Math.floor((((lon % 360) + 360) % 360) / 30)
}

/** Check if longitude is within ±2° of a sign boundary */
function isNearBoundary(lon: number): boolean {
  const rem = ((lon % 360) + 360) % 360
  const posInSign = rem % 30
  return posInSign < 2 || posInSign > 28
}

// ── Retrograde Detection ────────────────────────────────────────

function isRetrograde(body: Body, birthDate: Date): boolean {
  try {
    const today = Ecliptic(GeoVector(body, birthDate, true)).elon
    const nextDay = new Date(birthDate.getTime() + 86400000)
    const tomorrow = Ecliptic(GeoVector(body, nextDay, true)).elon
    return tomorrow < today
  } catch {
    return false
  }
}

// ── Planet Position Computation ─────────────────────────────────

function computePlanetPositions(birthDate: Date): PlanetPosition[] {
  return BODY_MAP.map(({ id, body, meta }) => {
    let longitude: number
    try {
      const geo = GeoVector(body, birthDate, true)
      const ecl = Ecliptic(geo)
      longitude = ((ecl.elon % 360) + 360) % 360
    } catch {
      // Fallback: 0° Aries
      longitude = 0
    }

    const signIndex = getSignIndex(longitude)
    const sign = ZODIACS[signIndex]
    const retrograde = isRetrograde(body, birthDate)

    return {
      id: id as PlanetPosition['id'],
      name: meta.name,
      glyph: meta.glyph,
      longitude,
      signIndex,
      signName: sign.name,
      signSymbol: sign.symbol,
      houseIndex: null, // filled later by computeHouses
      retrograde,
      boundaryWarning: isNearBoundary(longitude),
    }
  })
}

// ── Aspect Computation ──────────────────────────────────────────

export function computeAspects(planets: PlanetPosition[]): AspectLine[] {
  const aspects: AspectLine[] = []

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const angle = angularDistance(planets[i].longitude, planets[j].longitude)

      for (const aspectType of ASPECT_TYPES) {
        const diff = Math.abs(angle - aspectType.angle)
        // Tight aspects only: orb ≤ half of max orb
        const tightOrb = aspectType.orb / 2
        if (diff <= tightOrb) {
          aspects.push({
            p1: planets[i].id,
            p2: planets[j].id,
            type: aspectType.type as AspectLine['type'],
            angle: Math.round(angle * 10) / 10,
            orb: Math.round(diff * 10) / 10,
          })
          break // only match the closest aspect type
        }
      }
    }
  }

  return aspects
}

// ── Whole Sign House Computation ────────────────────────────────

export function computeHouses(ascSignIndex: number | null): number[] | null {
  if (ascSignIndex === null) return null
  const houses: number[] = []
  for (let i = 0; i < 12; i++) {
    houses.push((ascSignIndex + i) % 12)
  }
  return houses
}

/** Assign house indices to planets based on Whole Sign House system. Mutates planets in place. */
function assignHouses(planets: PlanetPosition[], ascSignIndex: number): void {
  for (const p of planets) {
    // House = (signIndex - ascSignIndex + 12) % 12 + 1
    p.houseIndex = ((p.signIndex - ascSignIndex + 12) % 12) + 1
  }
}

// ── Rising Sign (reuses getRisingSign from useConstellation) ────

// We import getRisingSign dynamically to avoid circular dependency concerns.
// Since useNatalChart is a new composable, we just call it directly.

import { getRisingSign } from '~/composables/useConstellation'

// ── Main Function ───────────────────────────────────────────────

export function calculateNatalChart(
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  birthDay: number | null | undefined,
  birthHour: number | null | undefined,
  birthMinute: number | null | undefined,
): NatalChartData | null {
  // Validate required fields
  if (birthYear === null || birthYear === undefined || birthYear < 1900 || birthYear > 2100)
    return null
  if (birthMonth === null || birthMonth === undefined || birthMonth < 1 || birthMonth > 12)
    return null
  if (birthDay === null || birthDay === undefined || birthDay < 1 || birthDay > 31) return null

  const hasHouses = birthHour !== null && birthHour !== undefined

  // Use noon UTC as the reference time for planetary positions
  // (minimizes timezone ambiguity for the date)
  const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay, 12, 0, 0))

  const planets = computePlanetPositions(birthDate)
  const aspects = computeAspects(planets)

  let ascSignIndex: number | null = null
  let ascLongitude: number | null = null
  let mcLongitude: number | null = null

  if (hasHouses && birthHour !== null && birthHour !== undefined) {
    const rising = getRisingSign(birthYear, birthMonth, birthDay, birthHour, birthMinute ?? null)
    if (rising) {
      // Find the sign index from the rising sign name
      const found = ZODIACS.findIndex(z => z.name === rising.name)
      if (found >= 0) {
        ascSignIndex = found
        // Approximate Asc longitude as center of the rising sign
        ascLongitude = found * 30 + 15
        // MC is 90° ahead of Asc in ecliptic longitude
        mcLongitude = (ascLongitude + 270) % 360
        assignHouses(planets, ascSignIndex)
      }
    }
  }

  return {
    planets,
    aspects,
    ascSignIndex,
    ascLongitude,
    mcLongitude,
    hasHouses,
  }
}
```

- [ ] **Step 4: 运行测试 — 预期全部 PASS**

```bash
npx vitest run tests/composables/useNatalChart.test.ts
```

Expected: 所有测试通过（约 14 个测试用例）

- [ ] **Step 5: 运行全部测试确保无回归**

```bash
npx vitest run
```

Expected: 所有已有测试 + 新增测试全部通过

- [ ] **Step 6: Commit**

```bash
git add composables/useNatalChart.ts tests/composables/useNatalChart.test.ts
git commit -m "feat: add useNatalChart composable — planet positions, aspects, Whole Sign Houses

- Wraps astronomy-engine GeoVector+Ecliptic for 7 classical planets
- Retrograde detection via consecutive-day longitude comparison
- Tight aspect detection (orb ≤ half max) for 5 major aspects
- Whole Sign House system via getRisingSign()
- Full test coverage: field assembly, aspects, houses, edge cases"
```

---

### Task 4: 创建 `NatalChart.vue` SVG 星盘组件

**Files:**

- Create: `components/tools/constellation/NatalChart.vue`
- Modify: `composables/useConstellation.ts`（1 行：导出 MOON_INTERPRETATIONS）

**Purpose:** SVG+DOM 混合渲染星盘。SVG 层画几何图形（轨道、分隔线、相位线、行星圆点），DOM 层放文字和交互（星座符号、宫位编号、行星标签、tooltip）。

**架构沿袭 `ZiWeiCelestialChart.vue`**：pol() 缓存、百分比定位、tooltip 用 getBoundingClientRect + nextTick、CSS keyframes 在 @layer 外、prefers-reduced-motion 支持。

- [ ] **Step 0: 导出 MOON_INTERPRETATIONS（useConstellation.ts）**

修改 `composables/useConstellation.ts` 第 199 行，将：

```typescript
const MOON_INTERPRETATIONS: Record<string, string> = {
```

改为：

```typescript
export const MOON_INTERPRETATIONS: Record<string, string> = {
```

- [ ] **Step 1: 创建 NatalChart.vue 组件**

```vue
<!-- components/tools/constellation/NatalChart.vue -->
<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { NatalChartData, PlanetPosition, AspectLine } from '~/composables/useNatalChart'
import { ZODIACS, MOON_INTERPRETATIONS } from '~/composables/useConstellation'
import {
  PLANET_META,
  getPlanetInterpretation,
  getAspectInterpretation,
} from '~/constants/planet-data'

// ═══════════════════════════════════════════════════════════════
// Props & Emits
// ═══════════════════════════════════════════════════════════════
const props = defineProps<{
  data: NatalChartData
}>()

// ═══════════════════════════════════════════════════════════════
// Geometry Constants
// ═══════════════════════════════════════════════════════════════
const CX = 300
const CY = 300
const INNER_RING = 72 // sun, moon
const MID_RING = 115 // mercury, venus, mars
const OUTER_RING = 155 // jupiter, saturn
const HOUSE_LABEL_R = 190
const ASPECT_ZONE_INNER = 210
const ASPECT_ZONE_OUTER = 250
const SIGN_SYMBOL_R = 265
const OUTER_DECORATION_R = 285
const SIGN_SECTOR_DEG = 30

const RING_MAP: Record<string, number> = {
  inner: INNER_RING,
  mid: MID_RING,
  outer: OUTER_RING,
}

// ═══════════════════════════════════════════════════════════════
// Coordinate Helpers
// ═══════════════════════════════════════════════════════════════
const polCache = new Map<string, { x: number; y: number }>()

/**
 * Convert SVG angle (degrees, 0°=3 o'clock, clockwise) to Cartesian (x, y).
 * SVG uses y-down coordinate system, so angle increases clockwise.
 */
function pol(angleDeg: number, r: number): { x: number; y: number } {
  const key = `${angleDeg.toFixed(1)},${r}`
  let result = polCache.get(key)
  if (!result) {
    const rad = (angleDeg * Math.PI) / 180
    result = { x: CX + Math.cos(rad) * r, y: CY + Math.sin(rad) * r }
    polCache.set(key, result)
  }
  return result
}

/**
 * Convert ecliptic longitude to SVG angle.
 * Asc at 9 o'clock (SVG 180°), signs run counterclockwise (SVG angle decreases).
 * Formula: svgDeg = 180 - ((lon - ascLon + 360) % 360)
 */
function lonToSvgDeg(lon: number, ascLon: number): number {
  const relative = (((lon - ascLon) % 360) + 360) % 360
  return 180 - relative
}

// ═══════════════════════════════════════════════════════════════
// Reference Asc longitude (default 0° = Aries if no houses)
// ═══════════════════════════════════════════════════════════════
const refAscLongitude = computed(() => props.data.ascLongitude ?? 0)

// ═══════════════════════════════════════════════════════════════
// Planet Ring Assignment (with collision resolution)
// ═══════════════════════════════════════════════════════════════
interface PlanetRenderData {
  planet: PlanetPosition
  svgDeg: number
  radius: number
  pctX: number
  pctY: number
}

const planetRenderData = computed<PlanetRenderData[]>(() => {
  const ascLon = refAscLongitude.value
  const planets = props.data.planets

  // First pass: assign default rings
  const withDefaults = planets.map(p => {
    const svgDeg = lonToSvgDeg(p.longitude, ascLon)
    const meta = PLANET_META[p.id]
    const radius = meta ? RING_MAP[meta.ring] : MID_RING
    return { planet: p, svgDeg, radius, pctX: 0, pctY: 0 }
  })

  // Collision detection: if two planets at same ring are within 5°,
  // move one to a different ring
  for (let i = 0; i < withDefaults.length; i++) {
    for (let j = i + 1; j < withDefaults.length; j++) {
      const a = withDefaults[i]
      const b = withDefaults[j]
      if (a.radius === b.radius) {
        let diff = Math.abs(a.svgDeg - b.svgDeg)
        if (diff > 180) diff = 360 - diff
        if (diff < 5) {
          // Move planet j to a different ring
          if (b.radius === INNER_RING) b.radius = MID_RING
          else if (b.radius === MID_RING) b.radius = OUTER_RING
          else b.radius = INNER_RING
        }
      }
    }
  }

  // Compute pixel positions
  for (const item of withDefaults) {
    const pos = pol(item.svgDeg, item.radius)
    item.pctX = (pos.x / 600) * 100
    item.pctY = (pos.y / 600) * 100
  }

  return withDefaults
})

// ═══════════════════════════════════════════════════════════════
// Sign Data for DOM Rendering
// ═══════════════════════════════════════════════════════════════
interface SignLabelData {
  name: string
  symbol: string
  signIndex: number
  pctX: number
  pctY: number
}

const signLabels = computed<SignLabelData[]>(() => {
  const ascLon = refAscLongitude.value
  return ZODIACS.map((z, i) => {
    // Center of the sign sector
    const signCenterLon = i * 30 + 15
    const svgDeg = lonToSvgDeg(signCenterLon, ascLon)
    const pos = pol(svgDeg, SIGN_SYMBOL_R)
    return {
      name: z.name,
      symbol: z.symbol,
      signIndex: i,
      pctX: (pos.x / 600) * 100,
      pctY: (pos.y / 600) * 100,
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// House Number Labels
// ═══════════════════════════════════════════════════════════════
interface HouseLabelData {
  number: number
  pctX: number
  pctY: number
}

const houseLabels = computed<HouseLabelData[]>(() => {
  if (!props.data.hasHouses || props.data.ascSignIndex === null) return []
  const ascLon = refAscLongitude.value
  const ascSign = props.data.ascSignIndex

  const labels: HouseLabelData[] = []
  for (let h = 0; h < 12; h++) {
    // Each house center = sign center of (ascSign + h) % 12
    const signIdx = (ascSign + h) % 12
    const signCenterLon = signIdx * 30 + 15
    const svgDeg = lonToSvgDeg(signCenterLon, ascLon)
    const pos = pol(svgDeg, HOUSE_LABEL_R)
    labels.push({
      number: h + 1,
      pctX: (pos.x / 600) * 100,
      pctY: (pos.y / 600) * 100,
    })
  }
  return labels
})

// ═══════════════════════════════════════════════════════════════
// Sign Sector Dividers (SVG lines)
// ═══════════════════════════════════════════════════════════════
interface DividerLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

const signDividers = computed<DividerLine[]>(() => {
  const ascLon = refAscLongitude.value
  const dividers: DividerLine[] = []
  for (let i = 0; i < 12; i++) {
    const boundaryLon = i * 30 // sign boundaries at 0°, 30°, 60°, ...
    const svgDeg = lonToSvgDeg(boundaryLon, ascLon)
    const inner = pol(svgDeg, INNER_RING - 10)
    const outer = pol(svgDeg, SIGN_SYMBOL_R + 8)
    dividers.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y })
  }
  return dividers
})

// ═══════════════════════════════════════════════════════════════
// Asc / MC Lines
// ═══════════════════════════════════════════════════════════════
const ascLinePoints = computed(() => {
  if (!props.data.hasHouses || props.data.ascLongitude === null) return null
  const ascLon = refAscLongitude.value
  const svgDeg = lonToSvgDeg(props.data.ascLongitude, ascLon)
  // Should be exactly 180° (9 o'clock) by definition
  const inner = pol(svgDeg, INNER_RING - 10)
  const outer = pol(svgDeg, OUTER_DECORATION_R)
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }
})

const mcLinePoints = computed(() => {
  if (!props.data.hasHouses || props.data.mcLongitude === null) return null
  const ascLon = refAscLongitude.value
  const svgDeg = lonToSvgDeg(props.data.mcLongitude, ascLon)
  const inner = pol(svgDeg, INNER_RING - 10)
  const outer = pol(svgDeg, OUTER_DECORATION_R)
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }
})

// ═══════════════════════════════════════════════════════════════
// Aspect Lines (SVG)
// ═══════════════════════════════════════════════════════════════
interface AspectRenderData {
  aspect: AspectLine
  x1: number
  y1: number
  x2: number
  y2: number
  harmonious: boolean
  symbol: string
}

const aspectRenderData = computed<AspectRenderData[]>(() => {
  const ascLon = refAscLongitude.value
  const planetMap = new Map(props.data.planets.map(p => [p.id, p]))

  return props.data.aspects.map(aspect => {
    const p1 = planetMap.get(aspect.p1)
    const p2 = planetMap.get(aspect.p2)
    const svgDeg1 = p1 ? lonToSvgDeg(p1.longitude, ascLon) : 0
    const svgDeg2 = p2 ? lonToSvgDeg(p2.longitude, ascLon) : 0

    // For conjunction, draw an outer arc instead of through-center line
    const r = aspect.type === 'conjunction' ? OUTER_RING + 10 : ASPECT_ZONE_INNER
    const pos1 = pol(svgDeg1, r)
    const pos2 = pol(svgDeg2, r)

    const harmonious = ['conjunction', 'sextile', 'trine'].includes(aspect.type)
    const symbols: Record<string, string> = {
      conjunction: '☌',
      sextile: '⚹',
      square: '□',
      trine: '△',
      opposition: '☍',
    }

    return {
      aspect,
      x1: pos1.x,
      y1: pos1.y,
      x2: pos2.x,
      y2: pos2.y,
      harmonious,
      symbol: symbols[aspect.type] ?? '',
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// Orbit Circles
// ═══════════════════════════════════════════════════════════════
const orbitRadii = [INNER_RING, MID_RING, OUTER_RING, SIGN_SYMBOL_R, OUTER_DECORATION_R]

// ═══════════════════════════════════════════════════════════════
// Tooltip State
// ═══════════════════════════════════════════════════════════════
const tooltipVisible = ref(false)
const tooltipContent = ref<{
  title: string
  signHouse: string
  interpretation: string
  aspects: string
  retrograde: boolean
  boundaryWarning: boolean
} | null>(null)
const tooltipStyle = ref({ left: '0px', top: '0px' })

const chartContainer = ref<HTMLDivElement>()
const tooltipRef = ref<HTMLDivElement>()

function onPlanetEnter(e: MouseEvent | FocusEvent, prd: PlanetRenderData) {
  const p = prd.planet
  // Moon uses MOON_INTERPRETATIONS (from useConstellation), other planets use PLANET_SIGN_INTERPRETATIONS
  const interp =
    p.id === 'moon'
      ? (MOON_INTERPRETATIONS[p.signName] ?? '')
      : getPlanetInterpretation(p.id, p.signName)
  const signHouse =
    props.data.hasHouses && p.houseIndex !== null
      ? `${p.signName} · 第${p.houseIndex}宫`
      : p.signName

  // Collect aspects involving this planet
  const relatedAspects = props.data.aspects
    .filter(a => a.p1 === p.id || a.p2 === p.id)
    .map(a => {
      const otherId = a.p1 === p.id ? a.p2 : a.p1
      const otherMeta = PLANET_META[otherId]
      const symbols: Record<string, string> = {
        conjunction: '☌',
        sextile: '⚹',
        square: '□',
        trine: '△',
        opposition: '☍',
      }
      return `${symbols[a.type] ?? ''} ${otherMeta?.name ?? otherId}`
    })

  tooltipContent.value = {
    title: `${p.glyph} ${p.name}`,
    signHouse,
    interpretation: interp,
    aspects: relatedAspects.length > 0 ? relatedAspects.join('  ') : '无紧密相位',
    retrograde: p.retrograde,
    boundaryWarning: p.boundaryWarning,
  }

  // Position tooltip
  const container = chartContainer.value
  const tipEl = tooltipRef.value
  if (!container || !tipEl) {
    tooltipStyle.value = { left: '50%', top: '50%' }
    tooltipVisible.value = true
    return
  }

  const target = e.currentTarget as HTMLElement
  const cr = container.getBoundingClientRect()
  const sr = target.getBoundingClientRect()
  const starCx = sr.left + sr.width / 2 - cr.left
  const starCy = sr.top + sr.height / 2 - cr.top

  nextTick(() => {
    if (!tooltipRef.value || !chartContainer.value) return
    const tw = tipEl.offsetWidth
    const th = tipEl.offsetHeight
    const cw = container.offsetWidth
    const ch = container.offsetHeight

    let tx = starCx + 14
    let ty = starCy - th - 8
    if (ty < 6) ty = starCy + 14
    if (tx + tw > cw - 6) tx = starCx - tw - 14
    if (ty + th > ch - 6) ty = ch - th - 6
    if (tx < 6) tx = 6

    tooltipStyle.value = { left: `${tx}px`, top: `${ty}px` }
  })

  tooltipVisible.value = true
}

function onPlanetLeave() {
  tooltipVisible.value = false
}

// ═══════════════════════════════════════════════════════════════
// Keyboard navigation
// ═══════════════════════════════════════════════════════════════
const focusedPlanetIndex = ref(-1)

function onPlanetKeydown(e: KeyboardEvent, index: number) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    focusedPlanetIndex.value = (index + 1) % 7
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    focusedPlanetIndex.value = (index + 6) % 7
  }
}
</script>

<template>
  <div
    ref="chartContainer"
    class="natal-chart"
    role="img"
    :aria-label="`本命星盘 — 七曜分布图${data.hasHouses ? '，含十二宫位' : ''}`"
  >
    <!-- ═══ SVG 底层：轨道 + 分隔线 + 相位线 + 行星圆点 ═══ -->
    <svg
      class="natal-chart__svg"
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <!-- Orbit circles -->
      <circle
        v-for="r in orbitRadii"
        :key="`orbit-${r}`"
        :cx="CX"
        :cy="CY"
        :r="r"
        fill="none"
        class="orbit-circle"
        :class="{ 'orbit-circle--outer': r === OUTER_DECORATION_R }"
      />

      <!-- Sign sector dividers -->
      <line
        v-for="(d, i) in signDividers"
        :key="`div-${i}`"
        :x1="d.x1"
        :y1="d.y1"
        :x2="d.x2"
        :y2="d.y2"
        class="sign-divider"
      />

      <!-- Asc line (cinnabar, prominent) -->
      <line
        v-if="ascLinePoints"
        :x1="ascLinePoints.x1"
        :y1="ascLinePoints.y1"
        :x2="ascLinePoints.x2"
        :y2="ascLinePoints.y2"
        class="asc-line"
      />

      <!-- MC line (gold, subtle) -->
      <line
        v-if="mcLinePoints"
        :x1="mcLinePoints.x1"
        :y1="mcLinePoints.y1"
        :x2="mcLinePoints.x2"
        :y2="mcLinePoints.y2"
        class="mc-line"
      />

      <!-- Aspect lines -->
      <line
        v-for="(al, i) in aspectRenderData"
        :key="`aspect-${i}`"
        :x1="al.x1"
        :y1="al.y1"
        :x2="al.x2"
        :y2="al.y2"
        class="aspect-line"
        :class="al.harmonious ? 'aspect-line--harmonious' : 'aspect-line--challenging'"
        :stroke-dasharray="al.aspect.type === 'sextile' ? '3,3' : undefined"
      />

      <!-- Planet orbs (SVG circles behind DOM labels) -->
      <circle
        v-for="prd in planetRenderData"
        :key="`orb-${prd.planet.id}`"
        :cx="pol(prd.svgDeg, prd.radius).x"
        :cy="pol(prd.svgDeg, prd.radius).y"
        r="7"
        class="planet-orb"
        :class="`planet-orb--${PLANET_META[prd.planet.id]?.colorClass ?? 'gray'}`"
      />
    </svg>

    <!-- ═══ DOM: 星座符号 ═══ -->
    <div class="signs-layer" aria-hidden="true">
      <span
        v-for="sl in signLabels"
        :key="`sign-${sl.signIndex}`"
        class="sign-symbol"
        :style="{ left: sl.pctX + '%', top: sl.pctY + '%' }"
        >{{ sl.symbol }}</span
      >
    </div>

    <!-- ═══ DOM: 宫位编号 ═══ -->
    <div v-if="houseLabels.length > 0" class="houses-layer" aria-hidden="true">
      <span
        v-for="hl in houseLabels"
        :key="`house-${hl.number}`"
        class="house-number"
        :style="{ left: hl.pctX + '%', top: hl.pctY + '%' }"
        >{{ hl.number }}</span
      >
    </div>

    <!-- ═══ DOM: 行星标签（交互层） ═══ -->
    <div class="planets-layer">
      <button
        v-for="(prd, idx) in planetRenderData"
        :key="`planet-${prd.planet.id}`"
        type="button"
        class="planet-btn"
        :class="{
          'planet-btn--retrograde': prd.planet.retrograde,
          'planet-btn--focused': idx === focusedPlanetIndex,
        }"
        :style="{ left: prd.pctX + '%', top: prd.pctY + '%' }"
        :tabindex="idx === 0 ? 0 : -1"
        :aria-label="`${prd.planet.name}${prd.planet.glyph} ${prd.planet.signName}${data.hasHouses && prd.planet.houseIndex ? ' 第' + prd.planet.houseIndex + '宫' : ''}${prd.planet.retrograde ? ' 逆行中' : ''}`"
        @mouseenter="onPlanetEnter($event, prd)"
        @mouseleave="onPlanetLeave"
        @focus="onPlanetEnter($event, prd)"
        @blur="onPlanetLeave"
        @keydown="onPlanetKeydown($event, idx)"
      >
        <span class="planet-glyph">{{ prd.planet.glyph }}</span>
        <span class="planet-name">{{ prd.planet.name }}</span>
        <span v-if="prd.planet.retrograde" class="planet-retrograde" aria-hidden="true">℞</span>
      </button>
    </div>

    <!-- ═══ DOM: 中心印章 ═══ -->
    <div class="center-seal" aria-hidden="true">
      <div class="center-seal__disc">
        <span class="center-seal__char">命</span>
      </div>
    </div>

    <!-- ═══ DOM: Tooltip ═══ -->
    <div
      ref="tooltipRef"
      class="natal-tooltip"
      :class="{ 'natal-tooltip--visible': tooltipVisible }"
      :style="tooltipStyle"
      role="tooltip"
      :aria-hidden="!tooltipVisible"
    >
      <template v-if="tooltipContent">
        <div class="natal-tooltip__title">{{ tooltipContent.title }}</div>
        <div class="natal-tooltip__location">
          落入：{{ tooltipContent.signHouse }}
          <span v-if="tooltipContent.boundaryWarning" class="natal-tooltip__warning"
            >⚠ 靠近星座交界</span
          >
        </div>
        <div v-if="tooltipContent.interpretation" class="natal-tooltip__interp">
          {{ tooltipContent.interpretation }}
        </div>
        <div class="natal-tooltip__aspects">相位：{{ tooltipContent.aspects }}</div>
        <div v-if="tooltipContent.retrograde" class="natal-tooltip__retrograde">逆行中 ℞</div>
      </template>
    </div>

    <!-- Screen reader live region -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ tooltipContent?.title }} {{ tooltipContent?.signHouse }}
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   Container
   ═══════════════════════════════════════════════════════════════ */
.natal-chart {
  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 1;
  margin: 0 auto;
  user-select: none;
  overflow: visible;
  isolation: isolate;
}

/* Paper glow — soft radial ink wash */
.natal-chart::before {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 50% 48%,
    color-mix(in srgb, var(--color-paper-darker) 16%, transparent) 0%,
    color-mix(in srgb, var(--color-paper-medium) 8%, transparent) 40%,
    transparent 75%
  );
  pointer-events: none;
  z-index: -1;
}

/* ═══════════════════════════════════════════════════════════════
   SVG Layer
   ═══════════════════════════════════════════════════════════════ */
.natal-chart__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.orbit-circle {
  stroke: var(--color-ink-faint);
  stroke-width: 0.6;
  opacity: 0.2;
}

.orbit-circle--outer {
  stroke-width: 1;
  opacity: 0.3;
}

.sign-divider {
  stroke: var(--color-ink-faint);
  stroke-width: 0.4;
  opacity: 0.12;
  stroke-dasharray: 2, 4;
}

.asc-line {
  stroke: var(--color-cinnabar);
  stroke-width: 1.5;
  opacity: 0.5;
}

.mc-line {
  stroke: var(--color-gold);
  stroke-width: 1;
  opacity: 0.35;
}

.aspect-line {
  stroke-width: 1;
  opacity: 0.2;
  transition:
    opacity 200ms ease,
    stroke-width 200ms ease;
}

.aspect-line--harmonious {
  stroke: var(--color-jade-light);
}

.aspect-line--challenging {
  stroke: var(--color-cinnabar);
}

.planet-orb {
  stroke-width: 1;
  transition:
    transform 200ms ease,
    opacity 200ms ease;
}

.planet-orb--gold {
  fill: #d4a84b;
  stroke: rgba(212, 168, 75, 0.5);
}
.planet-orb--ice {
  fill: #6ba8c8;
  stroke: rgba(107, 168, 200, 0.5);
}
.planet-orb--jade {
  fill: #4a8c6f;
  stroke: rgba(74, 140, 111, 0.5);
}
.planet-orb--cinnabar {
  fill: var(--color-cinnabar);
  stroke: color-mix(in srgb, var(--color-cinnabar) 50%, transparent);
}
.planet-orb--purple {
  fill: #7b6fa0;
  stroke: rgba(123, 111, 160, 0.5);
}
.planet-orb--gray {
  fill: var(--color-ink-muted);
  stroke: color-mix(in srgb, var(--color-ink-muted) 40%, transparent);
}

/* ═══════════════════════════════════════════════════════════════
   DOM Layers
   ═══════════════════════════════════════════════════════════════ */
.signs-layer,
.houses-layer,
.planets-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.signs-layer {
  z-index: 1;
}
.houses-layer {
  z-index: 1;
}
.planets-layer {
  z-index: 2;
}

/* ═══════════════════════════════════════════════════════════════
   Sign Symbols
   ═══════════════════════════════════════════════════════════════ */
.sign-symbol {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 1.1rem;
  color: var(--color-ink-medium);
  opacity: 0.55;
  line-height: 1;
}

/* ═══════════════════════════════════════════════════════════════
   House Numbers
   ═══════════════════════════════════════════════════════════════ */
.house-number {
  position: absolute;
  transform: translate(-50%, -50%);
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--color-ink-light);
  opacity: 0.45;
  line-height: 1;
}

/* ═══════════════════════════════════════════════════════════════
   Planet Buttons
   ═══════════════════════════════════════════════════════════════ */
.planet-btn {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: transparent;
  border: none;
  white-space: nowrap;
  opacity: 0;
  z-index: 2;
  animation: planet-enter 500ms cubic-bezier(0.34, 1.32, 0.64, 1) var(--enter-delay, 0ms) forwards;
}

.planet-btn:hover,
.planet-btn:focus-visible {
  z-index: 10;
}

.planet-glyph {
  font-size: 0.9rem;
  color: var(--color-ink);
  line-height: 1;
  transition: transform 200ms ease;
}

.planet-name {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  color: var(--color-ink-muted);
  opacity: 0.7;
  letter-spacing: 0.04em;
  transition:
    opacity 200ms ease,
    color 200ms ease;
}

.planet-btn:hover .planet-glyph {
  transform: scale(1.25);
}

.planet-btn:hover .planet-name {
  opacity: 1;
  color: var(--color-cinnabar);
}

.planet-retrograde {
  font-size: 0.55rem;
  color: var(--color-cinnabar);
  opacity: 0.8;
  font-weight: 500;
}

.planet-btn--focused .planet-glyph {
  transform: scale(1.2);
}

.planet-btn:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
  border-radius: 3px;
}

/* ═══════════════════════════════════════════════════════════════
   Center Seal
   ═══════════════════════════════════════════════════════════════ */
.center-seal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
}

.center-seal__disc {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 32%,
    #dd4848 0%,
    var(--color-cinnabar) 48%,
    var(--color-cinnabar-dark) 100%
  );
  border: 1.5px solid #d4a84b;
  box-shadow:
    0 0 14px color-mix(in srgb, var(--color-ink-muted) 20%, transparent),
    0 0 32px color-mix(in srgb, var(--color-ink-muted) 8%, transparent),
    inset 0 0 4px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-seal__char {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 1.25rem;
  color: #d4a84b;
  text-shadow: 0 0 4px rgba(212, 168, 75, 0.3);
  line-height: 1;
}

/* ═══════════════════════════════════════════════════════════════
   Tooltip
   ═══════════════════════════════════════════════════════════════ */
.natal-tooltip {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  background: color-mix(in srgb, var(--color-paper) 97%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
  border-left: 2.5px solid var(--color-cinnabar);
  border-radius: 4px 8px 8px 4px;
  padding: 0.6rem 0.75rem;
  max-width: 240px;
  min-width: 140px;
  box-shadow:
    0 6px 18px color-mix(in srgb, var(--color-ink-muted) 14%, transparent),
    0 1px 3px color-mix(in srgb, var(--color-ink-muted) 8%, transparent);
  opacity: 0;
  transform: translateY(2px);
  transition:
    opacity 200ms cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1);
  line-height: 1.55;
}

.natal-tooltip--visible {
  opacity: 1;
  transform: translateY(0);
}

.natal-tooltip__title {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-ink);
  margin-bottom: 2px;
}

.natal-tooltip__location {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  color: var(--color-ink-medium);
  margin-bottom: 4px;
}

.natal-tooltip__warning {
  display: inline-block;
  font-size: 0.55rem;
  color: var(--color-cinnabar);
  opacity: 0.7;
  margin-left: 4px;
}

.natal-tooltip__interp {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  color: var(--color-ink-medium);
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink-faint) 20%, transparent);
}

.natal-tooltip__aspects {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  color: var(--color-ink-light);
  margin-bottom: 2px;
}

.natal-tooltip__retrograde {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  color: var(--color-cinnabar);
  font-weight: 500;
}

/* ═══════════════════════════════════════════════════════════════
   Keyframes — MUST be outside @layer
   ═══════════════════════════════════════════════════════════════ */
@keyframes planet-enter {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  60% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(1.06);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes chart-fade-in {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* ═══════════════════════════════════════════════════════════════
   Reduced Motion
   ═══════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .planet-btn {
    animation: none;
    opacity: 0.92;
    transform: translate(-50%, -50%);
  }
  .natal-tooltip {
    transition: opacity 120ms linear;
    transform: none;
  }
  .natal-tooltip--visible {
    transform: none;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Responsive (≤ 600px)
   ═══════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .sign-symbol {
    font-size: 0.85rem;
  }
  .house-number {
    font-size: 0.52rem;
  }
  .planet-glyph {
    font-size: 0.75rem;
  }
  .planet-name {
    font-size: 0.52rem;
  }
  .planet-retrograde {
    font-size: 0.48rem;
  }
  .center-seal__disc {
    width: 36px;
    height: 36px;
  }
  .center-seal__char {
    font-size: 1rem;
  }
  .natal-tooltip {
    font-size: 0.6rem;
    max-width: 200px;
    padding: 0.45rem 0.6rem;
  }
  .natal-tooltip__title {
    font-size: 0.7rem;
  }
  .natal-tooltip__interp {
    font-size: 0.58rem;
  }
}
</style>
```

- [ ] **Step 2: 运行 TypeScript 类型检查**

```bash
npx nuxi typecheck
```

Expected: 零错误

- [ ] **Step 3: 运行测试确保无回归**

```bash
npx vitest run
```

Expected: 全部通过

- [ ] **Step 4: Commit**

```bash
git add components/tools/constellation/NatalChart.vue
git commit -m "feat: add NatalChart SVG star chart component

- Hybrid SVG+DOM architecture (SVG for geometry, DOM for text/interaction)
- 5-layer z-index system: SVG → signs → houses → planets → tooltip
- Whole Sign House system with Asc/MC lines
- 5 major aspect lines (conjunction/sextile/square/trine/opposition)
- Planet collision resolution (different radius rings)
- Keyboard navigation (arrow keys between 7 planets)
- Tooltip with interpretation, aspects, retrograde status
- prefers-reduced-motion support + responsive ≤600px
- Follows ZiWeiCelestialChart.vue patterns (pol() cache, percentage positioning)"
```

---

### Task 5: 集成星盘到星座页面

**Files:**

- Modify: `pages/tools/constellation.vue`

**Purpose:** 在 三垣·星盘 卡片区与 HoroscopePanel 之间插入 NatalChart section。计算独立于 `calculateConstellation()`，仅使用出生数据。

- [ ] **Step 1: 修改 constellation.vue — 添加 import 和计算逻辑**

在 `<script setup>` 顶部添加 import（约第 3 行之后）：

```typescript
import { calculateNatalChart } from '~/composables/useNatalChart'
import NatalChart from '~/components/tools/constellation/NatalChart.vue'
import type { NatalChartData } from '~/composables/useNatalChart'
```

- [ ] **Step 1: 修改 constellation.vue — 添加 import 和计算逻辑**

在 `<script setup>` 顶部添加 import（约第 3 行之后）：

```typescript
const natalChartData = ref<NatalChartData | null>(null)
```

在 `computeResult()` 函数中，`savedDivinationId.value = null` 之后（约第 85 行），添加：

```typescript
// 计算本命星盘（仅在首次加载时，使用真实出生数据）
if (!natalChartData.value && currentProfile.value?.birth_date) {
  const parsedBirth = parseDate(currentProfile.value.birth_date)
  if (parsedBirth) {
    natalChartData.value = calculateNatalChart(
      parsedBirth.year,
      parsedBirth.month,
      parsedBirth.day,
      currentProfile.value?.birth_hour ?? null,
      currentProfile.value?.birth_minute ?? null,
    )
  }
}
```

- [ ] **Step 2: 修改 constellation.vue — 添加星盘 section 模板**

在模板中，找到 `<!-- ═══ 三垣 · 星盘 ═══ -->` 区块的结束 `</div>`（约第 378 行 `</div>` 闭合标签之后，`<p class="text-xs text-ink-medium/90...">` 之前），插入：

```html
<!-- ═══ 本命星盘 ═══ -->
<div v-if="natalChartData" class="fade-in mt-8 mb-6" :style="{ '--delay': '0.3s' }">
  <div class="section-header">
    <h2>本命星盘</h2>
  </div>
  <div class="card-warm rounded-xl p-4 sm:p-6 flex justify-center">
    <NatalChart :data="natalChartData" />
  </div>
  <p class="text-center mt-3">
    <span class="text-[0.6rem] text-ink-light/50 font-sans tracking-wider">
      ── 基于出生日期计算，Astrolog 标准布局（Asc 左侧 9 点钟方向）──
    </span>
  </p>
</div>

<!-- 缺少出生年份时的提示 -->
<div
  v-else-if="!natalChartData && !loading && !error"
  class="fade-in mt-8 mb-6"
  :style="{ '--delay': '0.3s' }"
>
  <div class="section-header">
    <h2>本命星盘</h2>
  </div>
  <div class="card-warm rounded-xl p-8 text-center opacity-65">
    <p class="font-sans text-sm text-ink-medium mb-3">需要出生年份以计算行星位置</p>
    <NuxtLink
      :to="`/profile/${currentProfile?.id}`"
      class="text-xs text-cinnabar font-sans underline underline-offset-2"
      >编辑档案 → 填写完整出生日期</NuxtLink
    >
  </div>
</div>
```

- [ ] **Step 3: 运行 TypeScript 类型检查**

```bash
npx nuxi typecheck
```

Expected: 零错误

- [ ] **Step 4: 运行全部测试**

```bash
npx vitest run
```

Expected: 全部通过

- [ ] **Step 5: Commit**

```bash
git add pages/tools/constellation.vue
git commit -m "feat: integrate NatalChart into constellation page

- Compute natal chart from birth data (independent of horoscope/exploration)
- Show chart section between 三垣 cards and HoroscopePanel
- Degrade gracefully when birth year is missing
- Chart computed once on mount, not recalculated on zodiac exploration"
```

---

### Task 6: 最终验证

**Files:** 无新建/修改，仅验证。

- [ ] **Step 1: 全量 TypeScript 类型检查**

```bash
npx nuxi typecheck
```

Expected: 零错误

- [ ] **Step 2: 全量测试运行**

```bash
npx vitest run
```

Expected: 全部通过（含新增 `useNatalChart.test.ts` 的 ~14 个测试用例）

- [ ] **Step 3: 开发服务器启动 + 手动验证**

```bash
npm run dev
```

手动验证清单：

- [ ] 有完整出生信息的 profile → 看到完整星盘（7 行星 + 12 宫位 + 相位线）
- [ ] 无出生年份的 profile → 看到「需要出生年份以计算行星位置」提示
- [ ] 无出生时辰的 profile → 看到星盘但无宫位编号和 Asc/MC 线
- [ ] 行星 hover → tooltip 显示解读 + 相位 + 星座/宫位
- [ ] `prefers-reduced-motion: reduce` → 无动画
- [ ] 375px / 768px / 1024px → 布局正常
- [ ] 键盘 Tab 键可达 7 颗行星，方向键可切换
- [ ] Screen reader 读出 aria-label

- [ ] **Step 4: 构建验证（可选）**

```bash
npm run build
```

Expected: 构建成功，无错误

---

## 验收清单（对照 Spec §九）

- [ ] `npx nuxi typecheck` 零错误
- [ ] `npx vitest run` 全部通过（含新增 `useNatalChart.test.ts`）
- [ ] 三个参考日期行星位置误差 < 3°（astronomy-engine VSOP87 保证）
- [ ] 星座判定 100% 正确（边界情况有 warning 标记）
- [ ] 星盘在 375px / 768px / 1024px 下布局正常
- [ ] `prefers-reduced-motion: reduce` 关掉动画
- [ ] 无出生年份时不渲染星盘 section
- [ ] 无出生时辰时渲染简化星盘（无宫位）
- [ ] 键盘导航可达 7 颗行星
- [ ] screen reader 读出 aria-label
- [ ] 墨韵配色一致，无越界元素
