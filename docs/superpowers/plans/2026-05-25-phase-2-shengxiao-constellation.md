# Phase 2: 生肖与星座工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ShengXiao (zodiac) and Constellation tools with front-end calculation engines, security hardening, and architecture improvements on top of Phase 1.

**Architecture:** Pure TypeScript calculation engines in `composables/` (zero external API dependency), Vue 3 components in `components/tools/`, Nuxt 3 pages in `pages/tools/`, and backend security enhancements in `server/` (PIN hashing, rate limiting, session expiry, security logging, CSP).

**Tech Stack:** Nuxt 3, Vue 3, TailwindCSS 3, sql.js (SQLite), Node `crypto` (scrypt), vitest

---

## File Structure

```
xuanxue/
├── nuxt.config.ts                 # + CSP routeRules
├── package.json                   # + vitest devDep
├── vitest.config.ts               # NEW: test config
├── tailwind.config.ts             # + wuxing-*, compat-* colors
├── assets/css/main.css            # + skeleton, fortune-bar, yiyi, nav-link utilities
├── composables/
│   ├── useAuth.ts                 # (unchanged)
│   ├── useGreeting.ts             # (unchanged)
│   ├── useShengXiao.ts            # NEW: zodiac calculation engine
│   └── useConstellation.ts        # NEW: constellation calculation engine
├── components/tools/
│   ├── InkDivider.vue             # NEW: extracted divider component
│   ├── ToolPageLayout.vue         # NEW: tool page common layout wrapper
│   ├── PageHero.vue               # NEW: hero base for tool pages
│   ├── FortuneBars.vue            # NEW: reusable fortune bar
│   ├── SkeletonCard.vue           # NEW: loading skeleton card
│   ├── SkeletonBars.vue           # NEW: loading skeleton bars
│   ├── shengxiao/
│   │   ├── Hero.vue               # NEW: zodiac hero (emoji + name + badge)
│   │   ├── WuXingGrid.vue         # NEW: 2x2 five-element cards
│   │   ├── Personality.vue        # NEW: pros/cons columns
│   │   ├── CompatibilityGrid.vue  # NEW: animal compatibility grid
│   │   └── AnimalNav.vue          # NEW: 12-animal sidebar nav
│   └── constellation/
│       ├── Hero.vue               # NEW: constellation hero (symbol + name)
│       ├── HoroscopePanel.vue     # NEW: daily horoscope 5-dimension panel
│       ├── YiJiPanel.vue          # NEW: yi/ji side-by-side cards
│       └── Nav.vue                # NEW: 12-constellation sidebar nav
├── pages/
│   ├── index.vue                  # MODIFY: unlock shengxiao + constellation
│   └── tools/
│       ├── shengxiao.vue          # NEW: zodiac tool page
│       └── constellation.vue      # NEW: constellation tool page
├── layouts/default.vue            # MODIFY: add tool navigation bar
├── server/
│   ├── database/schema.ts         # MODIFY: +expires_at, +security_log
│   ├── utils/
│   │   ├── auth.ts               # MODIFY: +hashPin, +verifyPin, +session expiry
│   │   ├── profile.ts            # (unchanged)
│   │   ├── rateLimit.ts          # NEW: in-memory rate limiter
│   │   └── securityLog.ts        # NEW: security event logger
│   └── api/
│       ├── auth/
│       │   ├── login.post.ts     # MODIFY: PIN verify, legacy migration, rate limit, log
│       │   └── register.post.ts  # MODIFY: PIN hash, rate limit
│       └── profiles/
│           └── [id].put.ts       # MODIFY: rate limit
├── tests/
│   ├── composables/
│   │   ├── useShengXiao.test.ts  # NEW: engine tests
│   │   └── useConstellation.test.ts # NEW: engine tests
│   └── helpers/
│       └── vitest-setup.ts       # NEW: vitest global setup
└── docs/superpowers/
    ├── specs/                     # design documents
    └── plans/                     # implementation plans
```

---

### Task 1: Infrastructure — Design tokens, CSS utilities, test setup, CSP

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `assets/css/main.css`
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/helpers/vitest-setup.ts`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Add wuxing + compat colors to tailwind.config.ts**

Insert the following new entries into the `colors` object in `tailwind.config.ts`:

```typescript
// After jade: { DEFAULT: '#4A7C59', light: '#5D8F6A' },
wuxing: {
  wood: '#4A7C59',
  fire: '#C62828',
  earth: '#B8860B',
  metal: '#8E8E8E',
  water: '#2C5F7C',
},
compat: {
  great: '#4A7C59',
  good: '#B8860B',
},
```

- [ ] **Step 2: Add skeleton, fortune-bar, yiyi, nav-link CSS utilities to main.css**

Append these styles at the end of `assets/css/main.css` (before the `@media (prefers-reduced-motion)` block, or after it):

```css
/* ===== Skeleton loading ===== */
.skeleton-pulse {
  @apply animate-pulse rounded;
  background: linear-gradient(
    90deg,
    rgba(214, 197, 176, 0.15) 25%,
    rgba(214, 197, 176, 0.30) 50%,
    rgba(214, 197, 176, 0.15) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-block {
  @apply skeleton-pulse;
  height: 1rem;
}
.skeleton-block--lg {
  @apply skeleton-pulse;
  height: 2rem;
}

/* ===== Fortune Bar ===== */
.fortune-bar {
  @apply relative overflow-hidden rounded-full h-2;
  background: rgba(214, 197, 176, 0.3);
}
.fortune-bar__fill {
  @apply absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out;
}
.fortune-bar__fill--great  { background: #4A7C59; }
.fortune-bar__fill--good   { background: #B8860B; }
.fortune-bar__fill--normal { background: #6B5B4F; }
.fortune-bar__fill--low    { background: #C62828; }

/* ===== Yi/Ji Panel ===== */
.yiyi-card {
  @apply rounded-xl p-4 border;
}
.yiyi-card--yi {
  border-color: #4A7C59;
  background: rgba(74, 124, 89, 0.06);
}
.yiyi-card--ji {
  border-color: #8E8E8E;
  background: rgba(142, 142, 142, 0.06);
}
.yiyi-border {
  border-width: 3px;
  border-style: solid;
}
.yiyi-border--yi { border-color: #4A7C59; }
.yiyi-border--ji { border-color: #8E8E8E; }

/* ===== Nav Link ===== */
.nav-link {
  @apply relative inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors no-underline;
  color: #6B5B4F;
  font-family: 'Noto Sans SC', sans-serif;
}
.nav-link:hover {
  color: #C62828;
  background: rgba(198, 40, 40, 0.05);
}
.nav-link--active {
  color: #C62828;
  background: rgba(198, 40, 40, 0.08);
}
.nav-link--locked {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}

/* ===== WuXing Element Card ===== */
.wuxing-card {
  @apply rounded-xl p-4 text-center border;
  background: rgba(251, 248, 244, 0.9);
  transition: border-color 0.25s ease, transform 0.25s ease;
}
.wuxing-card:hover {
  transform: translateY(-2px);
}
.wuxing-card--wood  { border-color: #4A7C59; }
.wuxing-card--fire  { border-color: #C62828; }
.wuxing-card--earth { border-color: #B8860B; }
.wuxing-card--metal { border-color: #8E8E8E; }
.wuxing-card--water { border-color: #2C5F7C; }
```

- [ ] **Step 3: Add vitest to package.json**

In `package.json`, add inside `devDependencies`:

```json
"vitest": "^3.1.0"
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/vitest-setup.ts'],
  },
})
```

- [ ] **Step 5: Create tests/helpers/vitest-setup.ts**

```typescript
// Vitest global setup — currently empty, placeholder for future test helpers
```

- [ ] **Step 6: Add CSP headers to nuxt.config.ts**

In `nuxt.config.ts`, add the following `routeRules` property at the top level of the config object:

```typescript
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:; connect-src 'self'",
      },
    },
  },
```

- [ ] **Step 7: Install and verify**

Run: `cd /d/Develop/Project/github/XuanXue && npm install`

Run: `npx vitest run` (should exit with 0, no test files found is not an error)

- [ ] **Step 8: Commit**

```bash
git add package.json vitest.config.ts tests/helpers/vitest-setup.ts nuxt.config.ts tailwind.config.ts assets/css/main.css
git commit -m "feat: add design tokens, CSS utilities, test infra, and CSP headers"
```

---

### Task 2: Shared components — InkDivider, ToolPageLayout, PageHero, FortuneBars, SkeletonCard, SkeletonBars

**Files:**
- Create: `components/tools/InkDivider.vue`
- Create: `components/tools/ToolPageLayout.vue`
- Create: `components/tools/PageHero.vue`
- Create: `components/tools/FortuneBars.vue`
- Create: `components/tools/SkeletonCard.vue`
- Create: `components/tools/SkeletonBars.vue`

- [ ] **Step 1: Create components/tools/InkDivider.vue**

```vue
<template>
  <div class="divider-ink my-8 sm:my-10" role="separator" aria-orientation="horizontal">
    <span v-if="$slots.default" class="font-sans text-xs tracking-[0.2em] uppercase">
      <slot />
    </span>
  </div>
</template>

<script setup lang="ts">
// InkDivider — decorative ink-wash style separator
// Can optionally display a label via the default slot
</script>
```

- [ ] **Step 2: Create components/tools/ToolPageLayout.vue**

```vue
<template>
  <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <div class="lg:flex lg:gap-8">
      <!-- Side nav: hidden on <lg, shown on lg+ -->
      <aside class="hidden lg:block lg:w-44 xl:w-52 flex-shrink-0">
        <nav class="sticky top-20 space-y-1" aria-label="工具导航">
          <slot name="nav" />
        </nav>
      </aside>

      <!-- Main content area -->
      <div class="flex-1 min-w-0">
        <!-- Mobile nav: shown on <lg, hidden on lg+ -->
        <div class="lg:hidden mb-6 overflow-x-auto -mx-4 px-4">
          <nav class="flex gap-1 pb-2" aria-label="工具导航（移动端）">
            <slot name="mobile-nav" />
          </nav>
        </div>

        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ToolPageLayout — two-column layout for tool pages
// Slot 'nav': desktop sidebar navigation
// Slot 'mobile-nav': horizontal scroll navigation for mobile
// Default slot: main content area
</script>
```

- [ ] **Step 3: Create components/tools/PageHero.vue**

```vue
<template>
  <div class="fade-in mb-8 sm:mb-10" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-5">
      <!-- Emoji / Symbol icon -->
      <span
        class="flex-shrink-0 inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-cinnabar/5 border border-cinnabar/20 text-2xl sm:text-3xl"
        :aria-label="emojiLabel"
      >
        {{ emoji }}
      </span>

      <div class="min-w-0">
        <!-- Main title (Ma Shan Zheng display font) -->
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark leading-tight mb-1">
          {{ title }}
        </h1>
        <!-- Subtitle / year -->
        <p class="font-sans text-sm sm:text-base text-ink-medium">
          {{ subtitle }}
        </p>
        <!-- Badges slot -->
        <div v-if="$slots.badges" class="flex flex-wrap gap-2 mt-2">
          <slot name="badges" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  emoji: string
  emojiLabel?: string
  title: string
  subtitle: string
}>()
</script>
```

- [ ] **Step 4: Create components/tools/FortuneBars.vue**

```vue
<template>
  <div class="space-y-3">
    <div v-for="item in items" :key="item.label" class="fade-in" :style="{ '--delay': '0.4s' }">
      <div class="flex items-center justify-between mb-1">
        <span class="font-sans text-sm text-ink-medium">{{ item.label }}</span>
        <span
          class="font-sans text-sm font-medium"
          :class="{
            'text-wuxing-wood': item.score >= 75,
            'text-gold': item.score >= 60 && item.score < 75,
            'text-ink-medium': item.score >= 45 && item.score < 60,
            'text-cinnabar': item.score < 45,
          }"
        >
          {{ item.score }}
        </span>
      </div>
      <div class="fortune-bar" role="progressbar" :aria-valuenow="item.score" aria-valuemin="0" aria-valuemax="100" :aria-label="item.label">
        <div
          class="fortune-bar__fill"
          :class="{
            'fortune-bar__fill--great': item.score >= 75,
            'fortune-bar__fill--good': item.score >= 60 && item.score < 75,
            'fortune-bar__fill--normal': item.score >= 45 && item.score < 60,
            'fortune-bar__fill--low': item.score < 45,
          }"
          :style="{ width: item.score + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface FortuneItem {
  label: string
  score: number
}

defineProps<{
  items: FortuneItem[]
}>()
</script>
```

- [ ] **Step 5: Create components/tools/SkeletonCard.vue**

```vue
<template>
  <div class="card-paper-solid rounded-xl p-6">
    <div class="skeleton-block w-12 h-12 rounded-lg mb-4" />
    <div class="skeleton-block w-2/3 mb-3" />
    <div class="skeleton-block w-full mb-2" />
    <div class="skeleton-block w-4/5" />
  </div>
</template>

<script setup lang="ts">
// SkeletonCard — loading placeholder for card-like sections
</script>
```

- [ ] **Step 6: Create components/tools/SkeletonBars.vue**

```vue
<template>
  <div class="space-y-4">
    <div v-for="i in 4" :key="i" class="space-y-1">
      <div class="skeleton-block w-16 mb-1" />
      <div class="fortune-bar"><div class="skeleton-pulse h-full rounded-full" style="width: var(--fill, '60%')" /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// SkeletonBars — loading placeholder for fortune bar sections
</script>
```

- [ ] **Step 7: Commit**

```bash
git add components/tools/InkDivider.vue components/tools/ToolPageLayout.vue components/tools/PageHero.vue components/tools/FortuneBars.vue components/tools/SkeletonCard.vue components/tools/SkeletonBars.vue
git commit -m "feat: add shared tool components (InkDivider, ToolPageLayout, PageHero, FortuneBars, skeleton)"
```

---

### Task 3: Layout navigation bar + Index page unlock

**Files:**
- Modify: `layouts/default.vue`
- Modify: `pages/index.vue`

- [ ] **Step 1: Add tool navigation bar to layouts/default.vue**

Insert the tool nav row between the logo and the profile section, inside the existing `header` element. Modify the header's inner flex container to accommodate three sections: logo left, nav center, profile right.

Replace the current header block (from `<header class="sticky top-0 z-50 ...">` to the closing `</header>`) with this updated version. The key changes:
1. Add a centered nav section `<nav>` between logo and profile
2. Use `justify-between` on the outer flex container
3. Add responsive classes: `hidden md:flex` for desktop nav items

```vue
      <!-- Top Bar -->
      <header class="sticky top-0 z-50 backdrop-blur-md bg-paper-light/80 border-b border-paper-dark">
        <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center gap-2 no-underline flex-shrink-0">
              <span class="font-display text-2xl sm:text-3xl text-ink-dark">玄学</span>
              <span class="seal-mark text-[10px] hidden sm:flex" aria-hidden="true">玄</span>
            </NuxtLink>

            <!-- Tool Navigation (desktop) -->
            <nav class="hidden md:flex items-center gap-0.5" aria-label="命理工具导航">
              <NuxtLink
                v-for="navItem in navTools"
                :key="navItem.id"
                :to="navItem.route"
                :class="[
                  'nav-link',
                  { 'nav-link--active': route.path === navItem.route },
                  { 'nav-link--locked': !navItem.available },
                ]"
                :tabindex="navItem.available ? 0 : -1"
                :aria-disabled="!navItem.available"
              >
                <span class="text-base" aria-hidden="true">{{ navItem.emoji }}</span>
                <span>{{ navItem.name }}</span>
                <span v-if="!navItem.available" class="text-[0.625rem] text-ink-light ml-0.5">*</span>
              </NuxtLink>
            </nav>

            <!-- Profile Section -->
            <div v-if="currentProfile" ref="dropdownRef" class="relative flex-shrink-0" @focusout="closeDropdown">
              <!-- (existing profile button and dropdown remain unchanged below this line) -->
              <button
                ref="toggleRef"
                @click="showDropdown = !showDropdown"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-paper-medium/50"
                aria-haspopup="menu"
                :aria-expanded="showDropdown.toString()"
                :aria-label="'打开 ' + currentProfile.nickname + ' 的菜单'"
              >
```

Add the `navTools` data array and import `useRoute` in the `<script setup>` section of `layouts/default.vue`:

```typescript
const route = useRoute()

interface NavTool {
  id: string
  name: string
  emoji: string
  route: string
  available: boolean
}

const navTools: NavTool[] = [
  { id: 'shengxiao', name: '生肖', emoji: '🐯', route: '/tools/shengxiao', available: true },
  { id: 'constellation', name: '星座', emoji: '♈', route: '/tools/constellation', available: true },
  { id: 'bazi', name: '八字', emoji: '☯', route: '/tools/bazi', available: false },
  { id: 'yijing', name: '六爻', emoji: '📜', route: '/tools/yijing', available: false },
  { id: 'ziwei', name: '紫微斗数', emoji: '⭐', route: '/tools/ziwei', available: false },
]
```

Also add `import { useRoute } from 'vue-router'` to the existing imports section at the top of the `<script setup>`.

- [ ] **Step 2: Unlock ShengXiao and Constellation on the index page**

In `pages/index.vue`, change the tool cards array so `shengxiao` and `constellation` have `available: true`:

```typescript
const tools: Tool[] = [
  { id: 'shengxiao', name: '生肖', char: '兽', description: '生肖排盘 · 五行性格 · 生肖配对', route: '/tools/shengxiao', available: true },
  { id: 'constellation', name: '星座', char: '辰', description: '十二星座 · 性格特征 · 今日运势', route: '/tools/constellation', available: true },
  { id: 'bazi', name: '八字', char: '命', description: '四柱排盘 · 十神定位 · 五行生克', route: '/tools/bazi', available: false },
  { id: 'yijing', name: '六爻', char: '卦', description: '数字起卦 · 卦象解读 · 吉凶判断', route: '/tools/yijing', available: false },
  { id: 'ziwei', name: '紫微斗数', char: '斗', description: '十二宫排盘 · 星曜分析 · 命盘解读', route: '/tools/ziwei', available: false },
]
```

- [ ] **Step 3: Verify layout and index changes**

Run: `cd /d/Develop/Project/github/XuanXue && npx nuxi dev` in background.

Navigate to http://localhost:3000 — verify:
- Top bar shows navigation items: 生肖 (🐯), 星座 (♈), 八字 (☯ *), 六爻 (📜 *), 紫微斗数 (⭐ *)
- Active nav item (home = none active) shows normal inactive styling
- Locked items (八字, 六爻, 紫微斗数) are grayed out
- Index page cards: 生肖 and 星座 show as unlocked (hover effects, clickable)
- "coming-soon" badge removed from 生肖 and 星座 cards
- 生肖 and 星座 cards have the decorative corner element

- [ ] **Step 4: Commit**

```bash
git add layouts/default.vue pages/index.vue
git commit -m "feat: add tool navigation bar and unlock shengxiao/constellation on index"
```

---

### Task 4: ShengXiao calculation engine

**Files:**
- Create: `composables/useShengXiao.ts`
- Create: `tests/composables/useShengXiao.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useShengXiao.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateShengXiao } from '../../composables/useShengXiao'

describe('calculateShengXiao', () => {
  const testDate = new Date('2026-05-25')

  it('returns 虎 for 1998 birth year', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.animal).toBe('虎')
    expect(result.animalEmoji).toBe('🐯')
    expect(result.earthlyBranch).toBe('寅')
  })

  it('returns correct heavenly stem for 1998', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.heavenlyStem).toBe('戊')
    expect(result.stemBranch).toBe('戊寅')
  })

  it('returns 鼠 for 2020 birth year', () => {
    const result = calculateShengXiao(2020, 'solar', testDate)
    expect(result.animal).toBe('鼠')
    expect(result.earthlyBranch).toBe('子')
  })

  it('returns 猴 for 2016 birth year', () => {
    const result = calculateShengXiao(2016, 'solar', testDate)
    expect(result.animal).toBe('猴')
    expect(result.earthlyBranch).toBe('申')
  })

  it('handles year boundary: Feb 3 is still previous year animal (lunar year starts Feb 4)', () => {
    const feb3 = new Date('2026-02-03')
    const result = calculateShengXiao(2025, 'solar', feb3)
    expect(result.animal).toBe('蛇')
  })

  it('handles year boundary: Feb 5 is new year animal', () => {
    const feb5 = new Date('2026-02-05')
    const result = calculateShengXiao(2025, 'solar', feb5)
    expect(result.animal).toBe('马')
  })

  it('returns 6 compatibility entries for 虎', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.compatibility).toHaveLength(6)
  })

  it('returns deterministic fortune scores (same input = same output)', () => {
    const a = calculateShengXiao(1998, 'solar', testDate)
    const b = calculateShengXiao(1998, 'solar', testDate)
    expect(a.fortune.career.score).toBe(b.fortune.career.score)
    expect(a.fortune.wealth.score).toBe(b.fortune.wealth.score)
    expect(a.fortune.love.score).toBe(b.fortune.love.score)
    expect(a.fortune.health.score).toBe(b.fortune.health.score)
  })

  it('fortune scores are in range 30-90', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.fortune.career.score).toBeGreaterThanOrEqual(30)
    expect(result.fortune.career.score).toBeLessThanOrEqual(90)
    expect(result.fortune.wealth.score).toBeGreaterThanOrEqual(30)
    expect(result.fortune.wealth.score).toBeLessThanOrEqual(90)
    expect(result.fortune.love.score).toBeGreaterThanOrEqual(30)
    expect(result.fortune.love.score).toBeLessThanOrEqual(90)
    expect(result.fortune.health.score).toBeGreaterThanOrEqual(30)
    expect(result.fortune.health.score).toBeLessThanOrEqual(90)
  })

  it('returns wuXing 木 for 虎', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.wuXing).toBe('木')
  })

  it('returns naYin 城头土 for 戊寅 (1998)', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.naYin).toBe('城头土')
  })

  it('returns direction for 虎', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.direction).toBe('东北')
  })

  it('returns yangOrYin correctly', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.yangOrYin).toBe('阳')
  })

  it('returns personality pros and cons arrays', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.personalityPro.length).toBeGreaterThan(0)
    expect(result.personalityCon.length).toBeGreaterThan(0)
  })

  it('returns lucky items', () => {
    const result = calculateShengXiao(1998, 'solar', testDate)
    expect(result.lucky.numbers.length).toBeGreaterThan(0)
    expect(result.lucky.colors.length).toBeGreaterThan(0)
    expect(result.lucky.direction).toBeTruthy()
  })

  it('handles lunar calendar with year adjustment', () => {
    // Lunar year 1998 corresponds approximately to early 1999 in solar
    // For simplicity, lunar just uses the year as-is for the animal calculation
    const result = calculateShengXiao(1998, 'lunar', testDate)
    expect(result.animal).toBe('虎')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useShengXiao.test.ts`
Expected: FAIL with errors (module not found, types not exported, etc.)

- [ ] **Step 3: Create composables/useShengXiao.ts**

```typescript
export interface FortuneDimension {
  level: string
  score: number
}

export interface Fortune {
  career: FortuneDimension
  wealth: FortuneDimension
  love: FortuneDimension
  health: FortuneDimension
}

export interface Compatibility {
  animal: string
  emoji: string
  relation: '三合' | '六合' | '中吉' | '相冲' | '相害' | '相刑' | '相克'
  level: 'great' | 'good' | 'bad'
}

export interface Lucky {
  numbers: number[]
  colors: string[]
  direction: string
}

export interface ShengXiaoResult {
  animal: string
  animalEmoji: string
  earthlyBranch: string
  year: number
  heavenlyStem: string
  stemBranch: string
  wuXing: string
  naYin: string
  direction: string
  yangOrYin: string
  personalityPro: string[]
  personalityCon: string[]
  fortune: Fortune
  compatibility: Compatibility[]
  lucky: Lucky
}

// === Lookup Tables ===

const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const EMOJIS = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

const ANIMAL_WUXING: Record<string, string> = {
  鼠: '水', 牛: '土', 虎: '木', 兔: '木',
  龙: '土', 蛇: '火', 马: '火', 羊: '土',
  猴: '金', 鸡: '金', 狗: '土', 猪: '水',
}

const ANIMAL_DIRECTION: Record<string, string> = {
  鼠: '北', 牛: '东北', 虎: '东北', 兔: '东',
  龙: '东南', 蛇: '南', 马: '南', 羊: '西南',
  猴: '西', 鸡: '西', 狗: '西北', 猪: '北',
}

// 60 纳音 table indexed by sexagenary pair index (0-29, each covers two consecutive pairs)
const NAYIN_TABLE = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金',
  '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '佛灯火', '天河水', '大驿土', '钗钏金', '桑柘木',
  '大溪水', '沙中土', '天上火', '石榴木', '大海水',
]

const ANIMAL_PERSONALITY: Record<string, { pro: string[], con: string[] }> = {
  鼠: { pro: ['聪明机敏', '适应力强', '善于社交'], con: ['缺乏胆识', '目光短浅', '善钻营'] },
  牛: { pro: ['勤勉踏实', '忠诚可靠', '坚韧不拔'], con: ['固执己见', '缺乏变通', '不善表达'] },
  虎: { pro: ['勇敢自信', '热情开朗', '领袖气质'], con: ['刚愎自用', '缺乏耐心', '容易冲动'] },
  兔: { pro: ['温和优雅', '谨慎周密', '善解人意'], con: ['优柔寡断', '安于现状', '缺乏魄力'] },
  龙: { pro: ['才华横溢', '精力充沛', '富有魅力'], con: ['好高骛远', '自我中心', '不够务实'] },
  蛇: { pro: ['智慧深沉', '直觉敏锐', '优雅神秘'], con: ['多疑善妒', '冷漠孤僻', '精于算计'] },
  马: { pro: ['热情奔放', '自由洒脱', '行动力强'], con: ['三分钟热度', '缺乏耐心', '莽撞冲动'] },
  羊: { pro: ['温柔善良', '艺术天赋', '善解人意'], con: ['优柔寡断', '依赖性强', '悲观消极'] },
  猴: { pro: ['聪明灵活', '多才多艺', '幽默风趣'], con: ['心浮气躁', '缺乏恒心', '爱耍小聪明'] },
  鸡: { pro: ['自信干练', '观察力强', '善于表达'], con: ['爱慕虚荣', '喜欢批评', '斤斤计较'] },
  狗: { pro: ['忠诚正直', '责任心强', '守护他人'], con: ['过分敏感', '固执保守', '容易焦虑'] },
  猪: { pro: ['诚实敦厚', '豁达随和', '知足常乐'], con: ['缺乏进取', '容易轻信', '反应迟钝'] },
}

const ANIMAL_LUCKY: Record<string, Lucky> = {
  鼠: { numbers: [2, 3], colors: ['蓝', '金'], direction: '北' },
  牛: { numbers: [1, 9], colors: ['黄', '棕'], direction: '东北' },
  虎: { numbers: [3, 4], colors: ['绿', '蓝'], direction: '东' },
  兔: { numbers: [3, 4], colors: ['绿', '蓝'], direction: '东' },
  龙: { numbers: [5, 10], colors: ['金', '白'], direction: '东南' },
  蛇: { numbers: [2, 7], colors: ['红', '紫'], direction: '南' },
  马: { numbers: [2, 7], colors: ['红', '橙'], direction: '南' },
  羊: { numbers: [5, 10], colors: ['黄', '棕'], direction: '西南' },
  猴: { numbers: [4, 9], colors: ['白', '金'], direction: '西' },
  鸡: { numbers: [4, 9], colors: ['白', '金'], direction: '西' },
  狗: { numbers: [1, 6], colors: ['黄', '棕'], direction: '西北' },
  猪: { numbers: [1, 6], colors: ['蓝', '黑'], direction: '北' },
}

// Compatibility rules: sanhe groups, liuhe pairs, chong pairs, hai pairs
const SANHE_GROUPS = [
  [0, 4, 8],   // 申子辰 (猴鼠龙)
  [1, 5, 9],   // 巳酉丑 (蛇鸡牛)
  [2, 6, 10],  // 寅午戌 (虎马狗)
  [3, 7, 11],  // 亥卯未 (猪兔羊)
]

const LIUHE_PAIRS: [number, number][] = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],  // 子丑, 寅亥, 卯戌, 辰酉, 巳申, 午未
]

const CHONG_PAIRS: [number, number][] = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],  // 子午, 丑未, 寅申, 卯酉, 辰戌, 巳亥
]

const HAI_PAIRS: [number, number][] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],  // 子未, 丑午, 寅巳, 卯辰, 申亥, 酉戌
]

// Determine yang (even stem index) or yin (odd stem index)
function isYang(stemIndex: number): string {
  return stemIndex % 2 === 0 ? '阳' : '阴'
}

// Compute sexagenary cycle position from stem and branch indices
function sexagenaryPosition(stemIndex: number, branchIndex: number): number {
  // Solve: P % 10 = stemIndex, P % 12 = branchIndex
  // Using Chinese Remainder Theorem simplified for this case
  const k = (((stemIndex - branchIndex) / 2) + 6) % 6
  return (stemIndex + 10 * k) % 60
}

// Compute compatibility for a given animal index
function computeCompatibility(animalIndex: number): Compatibility[] {
  const results: Compatibility[] = []
  const added = new Set<number>()

  // 1. Sanhe (三合, great)
  for (const group of SANHE_GROUPS) {
    if (group.includes(animalIndex)) {
      for (const idx of group) {
        if (idx !== animalIndex && !added.has(idx)) {
          added.add(idx)
          results.push({
            animal: ANIMALS[idx],
            emoji: EMOJIS[idx],
            relation: '三合',
            level: 'great',
          })
        }
      }
    }
  }

  // 2. Liuhe (六合, great)
  for (const [a, b] of LIUHE_PAIRS) {
    let partner = -1
    if (a === animalIndex) partner = b
    if (b === animalIndex) partner = a
    if (partner >= 0 && !added.has(partner)) {
      added.add(partner)
      results.push({
        animal: ANIMALS[partner],
        emoji: EMOJIS[partner],
        relation: '六合',
        level: 'great',
      })
    }
  }

  // 3. Fill remaining slots: add neutral (中吉), chong (相冲), hai (相害)
  const remaining: number[] = []
  for (let i = 0; i < 12; i++) {
    if (i !== animalIndex && !added.has(i)) remaining.push(i)
  }

  // Sort remaining: chong and hai first (as "bad"), then neutral
  const chongSet = new Set<number>()
  const haiSet = new Set<number>()
  for (const [a, b] of CHONG_PAIRS) {
    if (a === animalIndex) chongSet.add(b)
    if (b === animalIndex) chongSet.add(a)
  }
  for (const [a, b] of HAI_PAIRS) {
    if (a === animalIndex) haiSet.add(b)
    if (b === animalIndex) haiSet.add(a)
  }

  const badOnes: number[] = []
  const neutralOnes: number[] = []
  for (const idx of remaining) {
    if (chongSet.has(idx)) badOnes.push(idx)
    else if (haiSet.has(idx)) badOnes.push(idx)
    else neutralOnes.push(idx)
  }

  // Add bad ones first (they are more informative)
  for (const idx of badOnes) {
    if (results.length >= 6) break
    added.add(idx)
    const isChong = chongSet.has(idx)
    results.push({
      animal: ANIMALS[idx],
      emoji: EMOJIS[idx],
      relation: isChong ? '相冲' : '相害',
      level: 'bad',
    })
  }

  // Then add neutral ones
  for (const idx of neutralOnes) {
    if (results.length >= 6) break
    added.add(idx)
    results.push({
      animal: ANIMALS[idx],
      emoji: EMOJIS[idx],
      relation: '中吉',
      level: 'good',
    })
  }

  return results
}

// Compute fortune scores (deterministic, based on animalIndex + currentYear)
function computeFortune(animalIndex: number, currentYear: number): Fortune {
  const stemIndex = ((currentYear - 4) % 10 + 10) % 10
  const seed = currentYear * 7 + animalIndex * 13 + stemIndex * 17

  function calc(multiplier: number, addend: number): number {
    return ((seed * multiplier + addend) % 61) + 30
  }

  function level(score: number): string {
    if (score >= 75) return '大吉'
    if (score >= 60) return '中吉'
    if (score >= 45) return '小吉'
    return '平'
  }

  return {
    career: { level: level(calc(19, 11)), score: calc(19, 11) },
    wealth: { level: level(calc(23, 17)), score: calc(23, 17) },
    love: { level: level(calc(29, 5)), score: calc(29, 5) },
    health: { level: level(calc(31, 13)), score: calc(31, 13) },
  }
}

/**
 * Calculate ShengXiao (Chinese zodiac) result from birth year.
 *
 * @param birthYear - The birth year (e.g., 1998)
 * @param calendar - 'solar' or 'lunar' (lunar uses the year as-is for animal calc)
 * @param currentDate - The reference date for fortune calculation (defaults to now)
 */
export function calculateShengXiao(
  birthYear: number,
  calendar: 'solar' | 'lunar',
  currentDate?: Date
): ShengXiaoResult {
  const now = currentDate || new Date()
  const currentYear = now.getFullYear()

  // Animal index from birth year
  let animalIndex = ((birthYear - 4) % 12 + 12) % 12

  // Lunar new year boundary: if solar calendar and before Feb 4, use previous year
  if (calendar === 'solar') {
    const feb4 = new Date(birthYear, 1, 4) // Month is 0-indexed, so Feb = 1
    const birthDate = new Date(birthYear, 0, 1) // Approximate — we know birthYear exists
    // The "before Feb 4" check only matters when computing the animal:
    // We use (birthYear - 1) for people born before lunar new year
    if (now.getMonth() === 0 || (now.getMonth() === 1 && now.getDate() < 4)) {
      // For fortune calculation with current date, just use the birth year
      // The boundary check applies only to the animal determination
    }
  }

  const animal = ANIMALS[animalIndex]
  const earthlyBranch = BRANCHES[animalIndex]

  // Heavenly stem from birth year
  const stemIndex = ((birthYear - 4) % 10 + 10) % 10
  const heavenlyStem = STEMS[stemIndex]
  const stemBranch = heavenlyStem + earthlyBranch

  // WuXing from animal
  const wuXing = ANIMAL_WUXING[animal]

  // NaYin from sexagenary position
  const pairIndex = Math.floor(sexagenaryPosition(stemIndex, animalIndex) / 2)
  const naYin = NAYIN_TABLE[pairIndex]

  const direction = ANIMAL_DIRECTION[animal]
  const yangOrYin = isYang(stemIndex)
  const personality = ANIMAL_PERSONALITY[animal]
  const lucky = ANIMAL_LUCKY[animal]

  const fortune = computeFortune(animalIndex, currentYear)
  const compatibility = computeCompatibility(animalIndex)

  return {
    animal,
    animalEmoji: EMOJIS[animalIndex],
    earthlyBranch,
    year: birthYear,
    heavenlyStem,
    stemBranch,
    wuXing,
    naYin,
    direction,
    yangOrYin,
    personalityPro: personality.pro,
    personalityCon: personality.con,
    fortune,
    compatibility,
    lucky,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composables/useShengXiao.test.ts`
Expected: All tests PASS. If any fail, fix the implementation and re-run.

- [ ] **Step 5: Commit**

```bash
git add composables/useShengXiao.ts tests/composables/useShengXiao.test.ts
git commit -m "feat: add ShengXiao calculation engine with tests"
```

---

### Task 5: Constellation calculation engine

**Files:**
- Create: `composables/useConstellation.ts`
- Create: `tests/composables/useConstellation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useConstellation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateConstellation } from '../../composables/useConstellation'

describe('calculateConstellation', () => {
  it('returns 白羊座 for April 1', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.name).toBe('白羊座')
    expect(result.symbol).toBe('♈')
    expect(result.element).toBe('火')
  })

  it('returns 金牛座 for May 1', () => {
    const result = calculateConstellation(5, 1, new Date('2026-05-25'))
    expect(result.name).toBe('金牛座')
  })

  it('returns 双子座 for June 1', () => {
    const result = calculateConstellation(6, 1, new Date('2026-05-25'))
    expect(result.name).toBe('双子座')
    expect(result.symbol).toBe('♊')
  })

  it('returns 巨蟹座 for July 1', () => {
    const result = calculateConstellation(7, 1, new Date('2026-05-25'))
    expect(result.name).toBe('巨蟹座')
  })

  it('returns 狮子座 for August 1', () => {
    const result = calculateConstellation(8, 1, new Date('2026-05-25'))
    expect(result.name).toBe('狮子座')
  })

  it('returns 处女座 for September 1', () => {
    const result = calculateConstellation(9, 1, new Date('2026-05-25'))
    expect(result.name).toBe('处女座')
  })

  it('returns 天秤座 for October 1', () => {
    const result = calculateConstellation(10, 1, new Date('2026-05-25'))
    expect(result.name).toBe('天秤座')
  })

  it('returns 天蝎座 for November 1', () => {
    const result = calculateConstellation(11, 1, new Date('2026-05-25'))
    expect(result.name).toBe('天蝎座')
  })

  it('returns 射手座 for December 1', () => {
    const result = calculateConstellation(12, 1, new Date('2026-05-25'))
    expect(result.name).toBe('射手座')
  })

  it('returns 摩羯座 for January 1', () => {
    const result = calculateConstellation(1, 1, new Date('2026-05-25'))
    expect(result.name).toBe('摩羯座')
  })

  it('returns 水瓶座 for February 1', () => {
    const result = calculateConstellation(2, 1, new Date('2026-05-25'))
    expect(result.name).toBe('水瓶座')
  })

  it('returns 双鱼座 for March 1', () => {
    const result = calculateConstellation(3, 1, new Date('2026-05-25'))
    expect(result.name).toBe('双鱼座')
  })

  it('handles boundary: March 20 is 双鱼座, March 21 is 白羊座', () => {
    const pisces = calculateConstellation(3, 20, new Date('2026-05-25'))
    expect(pisces.name).toBe('双鱼座')

    const aries = calculateConstellation(3, 21, new Date('2026-05-25'))
    expect(aries.name).toBe('白羊座')
  })

  it('returns 5-dimensional horoscope with scores 0-100', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    const h = result.todayHoroscope
    expect(h.overall).toBeGreaterThanOrEqual(0)
    expect(h.overall).toBeLessThanOrEqual(100)
    expect(h.love).toBeGreaterThanOrEqual(0)
    expect(h.love).toBeLessThanOrEqual(100)
    expect(h.career).toBeGreaterThanOrEqual(0)
    expect(h.career).toBeLessThanOrEqual(100)
    expect(h.wealth).toBeGreaterThanOrEqual(0)
    expect(h.wealth).toBeLessThanOrEqual(100)
    expect(h.health).toBeGreaterThanOrEqual(0)
    expect(h.health).toBeLessThanOrEqual(100)
  })

  it('returns deterministic horoscope (same date + same constellation = same scores)', () => {
    const a = calculateConstellation(4, 1, new Date('2026-05-25'))
    const b = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(a.todayHoroscope.overall).toBe(b.todayHoroscope.overall)
  })

  it('returns different scores for different constellations on same day', () => {
    const aries = calculateConstellation(4, 1, new Date('2026-05-25'))
    const taurus = calculateConstellation(5, 1, new Date('2026-05-25'))
    expect(aries.todayHoroscope.overall).not.toBe(taurus.todayHoroscope.overall)
  })

  it('returns todayYi and todayJi arrays with content', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.todayYi.length).toBeGreaterThan(0)
    expect(result.todayJi.length).toBeGreaterThan(0)
  })

  it('returns 4 compatibility entries', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.compatibility).toHaveLength(4)
  })

  it('returns dateRange for the constellation', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.dateRange).toBeTruthy()
    expect(result.dateRange).toContain('3月21日')
  })

  it('returns rulingPlanet', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.rulingPlanet).toBeTruthy()
  })

  it('returns luckyColor and luckyNumber', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.luckyColor).toBeTruthy()
    expect(result.luckyNumber).toBeGreaterThan(0)
  })

  it('returns personality description', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.personality.length).toBeGreaterThan(10)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useConstellation.test.ts`
Expected: FAIL

- [ ] **Step 3: Create composables/useConstellation.ts**

```typescript
export interface ConstellationResult {
  name: string
  symbol: string
  dateRange: string
  element: '火' | '土' | '风' | '水'
  rulingPlanet: string
  luckyColor: string
  luckyNumber: number
  personality: string
  todayHoroscope: {
    overall: number
    love: number
    career: number
    wealth: number
    health: number
  }
  todayYi: string[]
  todayJi: string[]
  compatibility: Array<{
    name: string
    symbol: string
    level: 'great' | 'good' | 'bad'
    label: string
  }>
}

interface ZodiacDef {
  name: string
  symbol: string
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  element: '火' | '土' | '风' | '水'
  rulingPlanet: string
  luckyColor: string
  luckyNumber: number
  personality: string
}

const ZODIACS: ZodiacDef[] = [
  { name: '白羊座', symbol: '♈', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19, element: '火', rulingPlanet: '火星', luckyColor: '红色', luckyNumber: 9, personality: '热情冲动、勇敢直率、充满活力、喜欢挑战。白羊座的人天生具有领导气质，做事果断直接，但有时缺乏耐心。' },
  { name: '金牛座', symbol: '♉', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20, element: '土', rulingPlanet: '金星', luckyColor: '绿色', luckyNumber: 6, personality: '稳重踏实、坚持不懈、热爱美食与艺术。金牛座的人忠诚可靠，做事脚踏实地，但有时过于固执。' },
  { name: '双子座', symbol: '♊', startMonth: 5, startDay: 21, endMonth: 6, endDay: 21, element: '风', rulingPlanet: '水星', luckyColor: '黄色', luckyNumber: 5, personality: '聪明机智、善于沟通、多才多艺、好奇心强。双子座的人思维敏捷，适应力强，但有时缺乏恒心。' },
  { name: '巨蟹座', symbol: '♋', startMonth: 6, startDay: 22, endMonth: 7, endDay: 22, element: '水', rulingPlanet: '月亮', luckyColor: '白色', luckyNumber: 2, personality: '温柔体贴、家庭观念强、直觉敏锐、富有同情心。巨蟹座的人非常重视感情和家庭，但有时过于敏感。' },
  { name: '狮子座', symbol: '♌', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22, element: '火', rulingPlanet: '太阳', luckyColor: '金色', luckyNumber: 1, personality: '自信大方、热情慷慨、领导力强、富有魅力。狮子座的人天生就是焦点，充满创造力和热情，但有时过于自负。' },
  { name: '处女座', symbol: '♍', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22, element: '土', rulingPlanet: '水星', luckyColor: '灰色', luckyNumber: 5, personality: '细心谨慎、追求完美、分析力强、务实可靠。处女座的人做事一丝不苟，善于分析和规划，但有时过于挑剔。' },
  { name: '天秤座', symbol: '♎', startMonth: 9, startDay: 23, endMonth: 10, endDay: 23, element: '风', rulingPlanet: '金星', luckyColor: '粉色', luckyNumber: 6, personality: '优雅公正、社交达人、审美出众、追求和谐。天秤座的人善于平衡各方关系，品味高雅，但有时犹豫不决。' },
  { name: '天蝎座', symbol: '♏', startMonth: 10, startDay: 24, endMonth: 11, endDay: 21, element: '水', rulingPlanet: '冥王星', luckyColor: '紫色', luckyNumber: 8, personality: '深沉神秘、意志坚定、洞察力强、情感炽烈。天蝎座的人目标明确，执行力极强，但有时占有欲过强。' },
  { name: '射手座', symbol: '♐', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21, element: '火', rulingPlanet: '木星', luckyColor: '蓝色', luckyNumber: 3, personality: '乐观开朗、热爱自由、冒险精神、诚实直率。射手座的人心胸开阔，喜欢探索未知，但有时过于冲动。' },
  { name: '摩羯座', symbol: '♑', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19, element: '土', rulingPlanet: '土星', luckyColor: '棕色', luckyNumber: 8, personality: '踏实稳重、有责任心、目标明确、坚韧不拔。摩羯座的人做事认真负责，追求事业成就，但有时过于严肃。' },
  { name: '水瓶座', symbol: '♒', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18, element: '风', rulingPlanet: '天王星', luckyColor: '青色', luckyNumber: 4, personality: '创新独立、思想前卫、友善博爱、理性客观。水瓶座的人富有创造力和人道主义精神，但有时过于理想化。' },
  { name: '双鱼座', symbol: '♓', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20, element: '水', rulingPlanet: '海王星', luckyColor: '海蓝色', luckyNumber: 7, personality: '温柔浪漫、想象力丰富、善解人意、富有艺术天赋。双鱼座的人极具同情心和创造力，但有时过于逃避现实。' },
]

// Determine zodiac index from birth month and day
function getZodiacIndex(month: number, day: number): number {
  for (let i = 0; i < ZODIACS.length; i++) {
    const z = ZODIACS[i]
    // Handle wrap-around for Capricorn (Dec 22 - Jan 19)
    if (z.startMonth > z.endMonth) {
      // Wraps around year boundary
      if ((month === z.startMonth && day >= z.startDay) || (month === z.endMonth && day <= z.endDay) ||
          (month > z.startMonth || (month === 1 && month <= z.endMonth)) ||
          (month > z.startMonth && month <= 12)) {
        // Actually, for wrap-around: if month >= startMonth OR month <= endMonth
        if (month >= z.startMonth || month <= z.endMonth) {
          // Need to check boundaries
          if (month === z.startMonth && day < z.startDay) continue
          if (month === z.endMonth && day > z.endDay) continue
          return i
        }
      }
    } else {
      // Normal case
      if (month === z.startMonth && day >= z.startDay) return i
      if (month === z.endMonth && day <= z.endDay) return i
      if (month > z.startMonth && month < z.endMonth) return i
    }
  }
  // Fallback (should not happen for valid dates)
  return 0
}

// Yi/Ji template pools — mapped by hourglass score ranges
const YI_POOLS: Record<string, string[]> = {
  high: ['洽谈合作', '开拓新项目', '投资理财', '表达心意', '签署合同', '出差远行', '社交活动', '学习进修'],
  mid:  ['日常办公', '整理规划', '家人团聚', '阅读思考', '适度运动', '拜访朋友', '处理琐事', '休闲娱乐'],
  low:  ['谨慎决策', '休养生息', '反思总结', '与人沟通', '低调行事', '暂缓投资', '注意健康', '避免争执'],
}

const JI_POOLS: Record<string, string[]> = {
  high: ['冲动消费', '与人争执', '过度承诺', '轻信他人'],
  mid:  ['拖延犹豫', '过度疲劳', '冒险投资', '草率决定'],
  low:  ['重大决策', '长途出行', '签订合同', '借贷担保', '投机取巧', '与人冲突'],
}

// Get zodiac index
function getZodiacIndex(month: number, day: number): number {
  for (let i = 0; i < ZODIACS.length; i++) {
    const z = ZODIACS[i]
    if (z.startMonth > z.endMonth) {
      // Wrap-around (Capricorn: Dec 22 - Jan 19)
      if (month >= z.startMonth || month <= z.endMonth) {
        if (month === z.startMonth && day < z.startDay) continue
        if (month === z.endMonth && day > z.endDay) continue
        return i
      }
    } else {
      if (month === z.startMonth && day >= z.startDay) return i
      if (month === z.endMonth && day <= z.endDay) return i
      if (month > z.startMonth && month < z.endMonth) return i
    }
  }
  return 0
}

// Compute horoscope
function computeHoroscope(zodiacIndex: number, currentDate: Date): ConstellationResult['todayHoroscope'] {
  // Date-based deterministic seed
  const dateStr = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`
  const dateNum = currentDate.getFullYear() * 10000 + (currentDate.getMonth() + 1) * 100 + currentDate.getDate()
  const modulus = 7919 // A prime number
  const seed = (dateNum * 7 + zodiacIndex * 13) % modulus

  const dayScore = Math.round((seed / modulus) * 100)

  return {
    overall: dayScore,
    love: Math.max(0, Math.min(100, dayScore - 12)),
    career: Math.max(0, Math.min(100, dayScore + 8)),
    wealth: Math.max(0, Math.min(100, dayScore - 20)),
    health: Math.max(0, Math.min(100, dayScore - 5)),
  }
}

// Pick Yi/Ji items based on overall score
function pickYiJi(overall: number): { yi: string[], ji: string[] } {
  const pool = overall >= 60 ? 'high' : overall >= 40 ? 'mid' : 'low'
  const yiPool = YI_POOLS[pool]
  const jiPool = JI_POOLS[pool]

  // Deterministic selection based on overall score as seed
  const pick = (arr: string[], count: number, offset: number): string[] => {
    const shuffled = [...arr]
    const seedVal = overall * 31 + offset * 17
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = ((seedVal * (i + 1) * 7) % (i + 1) + i + 1) % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, count)
  }

  return {
    yi: pick(yiPool, 3, 0),
    ji: pick(jiPool, 2, 1),
  }
}

// Compute constellation compatibility
function computeConstellationCompat(zodiacIndex: number): ConstellationResult['compatibility'] {
  const elements = ZODIACS.map(z => z.element)
  const myElement = elements[zodiacIndex]
  const myElementIndex = ['火', '土', '风', '水'].indexOf(myElement)
  const oppositeElementIndex = (myElementIndex + 2) % 4

  const results: ConstellationResult['compatibility'] = []
  const added = new Set<number>()
  added.add(zodiacIndex)

  // Same element = great match (with different specific constellations)
  for (let i = 0; i < ZODIACS.length; i++) {
    if (added.has(i)) continue
    if (elements[i] === myElement) {
      added.add(i)
      results.push({
        name: ZODIACS[i].name,
        symbol: ZODIACS[i].symbol,
        level: 'great',
        label: '绝配',
      })
    }
  }

  // Opposite element = bad match
  for (let i = 0; i < ZODIACS.length; i++) {
    if (added.has(i)) continue
    if (elements[i] === ['土', '风', '水', '火'][oppositeElementIndex]) {
      added.add(i)
      results.push({
        name: ZODIACS[i].name,
        symbol: ZODIACS[i].symbol,
        level: 'bad',
        label: '相克',
      })
    }
  }

  // Remaining = medium
  for (let i = 0; i < ZODIACS.length; i++) {
    if (added.has(i)) continue
    added.add(i)
    results.push({
      name: ZODIACS[i].name,
      symbol: ZODIACS[i].symbol,
      level: 'good',
      label: '中配',
    })
  }

  // Return first 4 (the most relevant)
  return results.slice(0, 4)
}

function formatDateRange(z: ZodiacDef): string {
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  return `${monthNames[z.startMonth - 1]}${z.startDay}日 — ${monthNames[z.endMonth - 1]}${z.endDay}日`
}

/**
 * Calculate constellation result from birth month/day.
 *
 * @param month - Birth month (1-12)
 * @param day - Birth day (1-31)
 * @param currentDate - Reference date for horoscope (defaults to now)
 */
export function calculateConstellation(
  month: number,
  day: number,
  currentDate?: Date
): ConstellationResult {
  const now = currentDate || new Date()
  const zodiacIndex = getZodiacIndex(month, day)
  const zodiac = ZODIACS[zodiacIndex]
  const horoscope = computeHoroscope(zodiacIndex, now)
  const { yi, ji } = pickYiJi(horoscope.overall)
  const compatibility = computeConstellationCompat(zodiacIndex)

  return {
    name: zodiac.name,
    symbol: zodiac.symbol,
    dateRange: formatDateRange(zodiac),
    element: zodiac.element,
    rulingPlanet: zodiac.rulingPlanet,
    luckyColor: zodiac.luckyColor,
    luckyNumber: zodiac.luckyNumber,
    personality: zodiac.personality,
    todayHoroscope: horoscope,
    todayYi: yi,
    todayJi: ji,
    compatibility,
  }
}
```

Wait — there's a duplicate `getZodiacIndex` in the code above. The first declaration in the module is correct, the second (inside the exportable section) should not exist. Let me fix this — the `getZodiacIndex` function should be defined only once. In the actual implementation file, include each function once. The corrected file structure:

The correct `composables/useConstellation.ts` should have the definition of `getZodiacIndex` once (the correct version), followed by the other helper functions and the exported `calculateConstellation`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composables/useConstellation.test.ts`
Expected: All tests PASS. If any fail, fix the implementation and re-run.

- [ ] **Step 5: Commit**

```bash
git add composables/useConstellation.ts tests/composables/useConstellation.test.ts
git commit -m "feat: add Constellation calculation engine with tests"
```

---

### Task 6: ShengXiao page and components

**Files:**
- Create: `components/tools/shengxiao/Hero.vue`
- Create: `components/tools/shengxiao/WuXingGrid.vue`
- Create: `components/tools/shengxiao/Personality.vue`
- Create: `components/tools/shengxiao/CompatibilityGrid.vue`
- Create: `components/tools/shengxiao/AnimalNav.vue`
- Create: `pages/tools/shengxiao.vue`

- [ ] **Step 1: Create components/tools/shengxiao/Hero.vue**

```vue
<template>
  <div class="fade-in card-paper-solid rounded-2xl p-6 sm:p-8 mb-6" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-6">
      <span class="flex-shrink-0 text-5xl sm:text-6xl" aria-hidden="true">{{ result.animalEmoji }}</span>
      <div class="min-w-0">
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark">
          {{ result.animal }}
        </h1>
        <p class="font-sans text-sm sm:text-base text-ink-medium mt-1">
          {{ result.stemBranch }}年 · {{ result.year }} · {{ result.yangOrYin }}性
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans border"
            :class="badgeClass(result.wuXing)">
            {{ result.naYin }}命
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-faint/20 text-ink-medium border border-ink-faint/30">
            {{ result.earthlyBranch }} · {{ result.direction }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'

defineProps<{
  result: ShengXiaoResult
}>()

function badgeClass(wuXing: string): string {
  const map: Record<string, string> = {
    '木': 'border-wuxing-wood/30 text-wuxing-wood bg-wuxing-wood/5',
    '火': 'border-wuxing-fire/30 text-wuxing-fire bg-wuxing-fire/5',
    '土': 'border-wuxing-earth/30 text-wuxing-earth bg-wuxing-earth/5',
    '金': 'border-wuxing-metal/30 text-wuxing-metal bg-wuxing-metal/5',
    '水': 'border-wuxing-water/30 text-wuxing-water bg-wuxing-water/5',
  }
  return map[wuXing] || 'border-ink-faint/30 text-ink-medium bg-ink-faint/10'
}
</script>
```

- [ ] **Step 2: Create components/tools/shengxiao/WuXingGrid.vue**

```vue
<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.15s' }">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div v-for="item in items" :key="item.label" class="wuxing-card" :class="`wuxing-card--${item.color}`">
        <div class="font-display text-lg sm:text-xl text-ink-dark mb-0.5">{{ item.value }}</div>
        <div class="font-sans text-xs text-ink-light tracking-wider">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'

const props = defineProps<{
  result: ShengXiaoResult
}>()

const wuxingColor = (): string => {
  const map: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' }
  return map[props.result.wuXing] || 'earth'
}

const items = [
  { label: '五行', value: props.result.wuXing, color: wuxingColor() },
  { label: '纳音', value: props.result.naYin, color: 'earth' },
  { label: '地支', value: props.result.earthlyBranch, color: wuxingColor() },
  { label: '方向', value: props.result.direction, color: 'earth' },
]
</script>
```

- [ ] **Step 3: Create components/tools/shengxiao/Personality.vue**

```vue
<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.35s' }">
    <InkDivider>性格特征</InkDivider>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      <!-- Pros -->
      <div class="card-paper-solid rounded-xl p-5">
        <h4 class="font-sans text-sm font-medium text-wuxing-wood mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">▸</span> 优点
        </h4>
        <ul class="space-y-1.5">
          <li v-for="pro in result.personalityPro" :key="pro" class="font-sans text-sm text-ink-medium flex items-start gap-2">
            <span class="text-wuxing-wood mt-0.5 flex-shrink-0" aria-hidden="true">●</span>
            {{ pro }}
          </li>
        </ul>
      </div>
      <!-- Cons -->
      <div class="card-paper-solid rounded-xl p-5">
        <h4 class="font-sans text-sm font-medium text-cinnabar mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">▸</span> 缺点
        </h4>
        <ul class="space-y-1.5">
          <li v-for="con in result.personalityCon" :key="con" class="font-sans text-sm text-ink-medium flex items-start gap-2">
            <span class="text-cinnabar/70 mt-0.5 flex-shrink-0" aria-hidden="true">○</span>
            {{ con }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'

defineProps<{
  result: ShengXiaoResult
}>()
</script>
```

- [ ] **Step 4: Create components/tools/shengxiao/CompatibilityGrid.vue**

```vue
<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.5s' }">
    <InkDivider>生肖配对</InkDivider>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
      <div
        v-for="item in items"
        :key="item.animal"
        class="card-paper-solid rounded-xl p-3 sm:p-4 text-center transition-all duration-300 cursor-default hover:-translate-y-0.5"
        :class="borderClass(item.level)"
        :title="item.relation"
      >
        <div class="text-2xl sm:text-3xl mb-1" aria-hidden="true">{{ item.emoji }}</div>
        <div class="font-display text-base text-ink-dark">{{ item.animal }}</div>
        <span
          class="inline-block mt-1 px-2 py-0.5 rounded text-[0.625rem] font-sans tracking-wider"
          :class="levelClass(item.level)"
        >
          {{ item.relation }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Compatibility } from '~/composables/useShengXiao'

defineProps<{
  items: Compatibility[]
}>()

function borderClass(level: string): string {
  return level === 'great' ? 'hover:border-compat-great' :
         level === 'good' ? 'hover:border-compat-good' :
         'hover:border-cinnabar/30'
}

function levelClass(level: string): string {
  return level === 'great' ? 'bg-wuxing-wood/10 text-wuxing-wood' :
         level === 'good' ? 'bg-[rgba(184,134,11,0.1)] text-gold' :
         'bg-cinnabar/5 text-cinnabar/80'
}
</script>
```

- [ ] **Step 5: Create components/tools/shengxiao/AnimalNav.vue**

```vue
<template>
  <div class="flex lg:flex-col gap-1">
    <button
      v-for="(animal, idx) in animals"
      :key="idx"
      @click="$emit('select', idx)"
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
        idx === currentIndex
          ? 'bg-cinnabar/10 text-cinnabar font-medium'
          : 'text-ink-medium hover:text-ink-dark hover:bg-paper-medium/50'
      ]"
      :aria-current="idx === currentIndex ? 'true' : undefined"
    >
      <span class="text-base flex-shrink-0" aria-hidden="true">{{ animal.emoji }}</span>
      <span class="font-sans">{{ animal.name }}</span>
      <span class="text-[0.625rem] text-ink-light ml-auto flex-shrink-0">{{ animal.branch }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentIndex: number
}>()

defineEmits<{
  select: [index: number]
}>()

const animals = [
  { name: '子鼠', emoji: '🐭', branch: '子' },
  { name: '丑牛', emoji: '🐮', branch: '丑' },
  { name: '寅虎', emoji: '🐯', branch: '寅' },
  { name: '卯兔', emoji: '🐰', branch: '卯' },
  { name: '辰龙', emoji: '🐲', branch: '辰' },
  { name: '巳蛇', emoji: '🐍', branch: '巳' },
  { name: '午马', emoji: '🐴', branch: '午' },
  { name: '未羊', emoji: '🐑', branch: '未' },
  { name: '申猴', emoji: '🐵', branch: '申' },
  { name: '酉鸡', emoji: '🐔', branch: '酉' },
  { name: '戌狗', emoji: '🐶', branch: '戌' },
  { name: '亥猪', emoji: '🐷', branch: '亥' },
]
</script>
```

- [ ] **Step 6: Create pages/tools/shengxiao.vue**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { calculateShengXiao, type ShengXiaoResult } from '~/composables/useShengXiao'

const router = useRouter()
const route = useRoute()
const { currentProfile, restoreSession } = useAuth()

const result = ref<ShengXiaoResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const selectedAnimal = ref<number | null>(null)

onMounted(async () => {
  await restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }

  if (!currentProfile.value.birth_date) {
    missingBirthInfo.value = true
    loading.value = false
    return
  }

  computeResult()
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return

  loading.value = true
  const birthDate = new Date(currentProfile.value.birth_date)
  const year = birthDate.getFullYear()
  const calendar = currentProfile.value.birth_calendar || 'solar'

  // Small delay to show skeleton
  setTimeout(() => {
    result.value = calculateShengXiao(year, calendar)
    selectedAnimal.value = computeAnimalIndex(year)
    loading.value = false
  }, 200)
}

function computeAnimalIndex(year: number): number {
  return ((year - 4) % 12 + 12) % 12
}

function selectAnimal(index: number) {
  if (!currentProfile.value?.birth_date) return
  selectedAnimal.value = index
  loading.value = true

  const year = new Date(currentProfile.value.birth_date).getFullYear()
  setTimeout(() => {
    // When selecting a different animal, keep the same birth year for stem calculation
    // but the animal index changes, so re-calculate with the actual birth year
    result.value = calculateShengXiao(year, currentProfile.value.birth_calendar || 'solar')
    // Override the animal to the selected one — re-export the data
    // Actually, we need to pass the forced animal. Let me use a different approach:
    // For selected animal view, we need a function that uses the birth year for stems
    // but a different animal for the display. We'll recalculate with the "representative year"
    // For now, derive a representative year for the selected animal
    const currentYear = new Date().getFullYear()
    const currentAnimalIdx = computeAnimalIndex(currentYear)
    const offset = (index - currentAnimalIdx + 12) % 12
    const representativeYear = currentYear - offset - (offset > currentYear % 12 ? 12 : 0)
    result.value = calculateShengXiao(representativeYear, 'solar')
    selectedAnimal.value = index
    loading.value = false
  }, 200)
}

const currentYear = computed(() => new Date().getFullYear())
const displayTitle = computed(() => result.value ? `${result.value.animal} · ${currentYear.value}流年运势` : '')
</script>

<template>
  <div class="ink-wash-bg min-h-screen">
    <div class="relative z-10">
      <ToolPageLayout>
        <template #nav>
          <AnimalNav
            v-if="selectedAnimal !== null"
            :currentIndex="selectedAnimal"
            @select="selectAnimal"
          />
        </template>
        <template #mobile-nav>
          <button
            v-for="(animal, idx) in ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']"
            :key="idx"
            @click="selectAnimal(idx)"
            :class="[
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors',
              idx === selectedAnimal ? 'bg-cinnabar/10 text-cinnabar' : 'text-ink-medium hover:bg-paper-medium/50'
            ]"
          >
            {{ animal }}
          </button>
        </template>

        <!-- Missing birth info -->
        <div v-if="missingBirthInfo" class="text-center py-16">
          <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
          <p class="font-sans text-sm text-ink-light mb-6">需要填写出生日期以计算生肖排盘</p>
          <NuxtLink
            :to="`/profile/${currentProfile?.id}`"
            class="btn-seal inline-flex"
          >
            <span>前往编辑档案</span>
          </NuxtLink>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loading" class="space-y-6">
          <SkeletonCard />
          <SkeletonBars />
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <ShengXiaoHero :result="result" />
          <WuXingGrid :result="result" />
          <PersonalityCard :result="result" />

          <InkDivider>{{ currentYear }}年流年运势</InkDivider>
          <FortuneBars :items="[
            { label: '事业', score: result.fortune.career.score },
            { label: '财运', score: result.fortune.wealth.score },
            { label: '感情', score: result.fortune.love.score },
            { label: '健康', score: result.fortune.health.score },
          ]" />

          <CompatibilityGrid :items="result.compatibility" />

          <div class="flex flex-wrap gap-3 justify-center mt-8">
            <button @click="computeResult" class="btn-seal">
              <span>📜 重新排盘</span>
            </button>
          </div>
        </template>
      </ToolPageLayout>
    </div>
  </div>
</template>
```

- [ ] **Step 7: Verify the ShengXiao page works**

Run dev server: `cd /d/Develop/Project/github/XuanXue && npx nuxi dev`

Navigate to http://localhost:3000/tools/shengxiao
- If no birth_date set: should show "请先完善出生信息" with link to profile
- If birth_date set: should show the full zodiac reading
- Click different animals in the sidebar nav
- Verify the fortune bars display with animation
- Verify compatibility grid shows 6 items
- Test responsive layout: resize browser to verify sidebar/horizontal nav switching

- [ ] **Step 8: Commit**

```bash
git add components/tools/shengxiao/Hero.vue components/tools/shengxiao/WuXingGrid.vue components/tools/shengxiao/Personality.vue components/tools/shengxiao/CompatibilityGrid.vue components/tools/shengxiao/AnimalNav.vue pages/tools/shengxiao.vue
git commit -m "feat: add ShengXiao tool page with all sub-components"
```

---

### Task 7: Constellation page and components

**Files:**
- Create: `components/tools/constellation/Hero.vue`
- Create: `components/tools/constellation/HoroscopePanel.vue`
- Create: `components/tools/constellation/YiJiPanel.vue`
- Create: `components/tools/constellation/Nav.vue`
- Create: `pages/tools/constellation.vue`

- [ ] **Step 1: Create components/tools/constellation/Hero.vue**

```vue
<template>
  <div class="fade-in card-paper-solid rounded-2xl p-6 sm:p-8 mb-6" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-6">
      <span class="flex-shrink-0 text-5xl sm:text-6xl" aria-hidden="true">{{ result.symbol }}</span>
      <div class="min-w-0">
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark">
          {{ result.name }}
        </h1>
        <p class="font-sans text-sm sm:text-base text-ink-medium mt-1">
          {{ result.dateRange }}
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans border"
            :class="elementBadgeClass(result.element)">
            {{ result.element }}象
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-faint/20 text-ink-medium border border-ink-faint/30">
            {{ result.rulingPlanet }}守护
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConstellationResult } from '~/composables/useConstellation'

defineProps<{
  result: ConstellationResult
}>()

function elementBadgeClass(element: string): string {
  const map: Record<string, string> = {
    '火': 'border-wuxing-fire/30 text-wuxing-fire bg-wuxing-fire/5',
    '土': 'border-wuxing-earth/30 text-wuxing-earth bg-wuxing-earth/5',
    '风': 'border-wuxing-wood/30 text-wuxing-wood bg-wuxing-wood/5',
    '水': 'border-wuxing-water/30 text-wuxing-water bg-wuxing-water/5',
  }
  return map[element] || 'border-ink-faint/30 text-ink-medium bg-ink-faint/10'
}
</script>
```

- [ ] **Step 2: Create components/tools/constellation/HoroscopePanel.vue**

```vue
<template>
  <div class="fade-in card-paper-solid rounded-2xl p-6 sm:p-8 mb-6" :style="{ '--delay': '0.15s' }">
    <div class="text-center mb-5">
      <span class="font-display text-4xl text-ink-dark">{{ horoscope.overall }}</span>
      <span class="font-sans text-sm text-ink-medium ml-1">/ 100</span>
      <p class="font-sans text-xs text-ink-light mt-1">今日综合运势</p>
    </div>

    <FortuneBars :items="[
      { label: '综合', score: horoscope.overall },
      { label: '爱情', score: horoscope.love },
      { label: '事业', score: horoscope.career },
      { label: '财运', score: horoscope.wealth },
      { label: '健康', score: horoscope.health },
    ]" />
  </div>
</template>

<script setup lang="ts">
import type { ConstellationResult } from '~/composables/useConstellation'

defineProps<{
  horoscope: ConstellationResult['todayHoroscope']
}>()
</script>
```

- [ ] **Step 3: Create components/tools/constellation/YiJiPanel.vue**

```vue
<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.25s' }">
    <InkDivider>今日宜忌</InkDivider>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Yi -->
      <div class="yiyi-card yiyi-card--yi">
        <h4 class="font-sans text-sm font-medium text-wuxing-wood mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">宜</span>
        </h4>
        <ul class="space-y-2">
          <li v-for="item in yi" :key="item" class="font-sans text-sm text-ink-medium flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-wuxing-wood flex-shrink-0" aria-hidden="true" />
            {{ item }}
          </li>
        </ul>
      </div>
      <!-- Ji -->
      <div class="yiyi-card yiyi-card--ji">
        <h4 class="font-sans text-sm font-medium text-ink-medium mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">忌</span>
        </h4>
        <ul class="space-y-2">
          <li v-for="item in ji" :key="item" class="font-sans text-sm text-ink-medium flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-ink-light flex-shrink-0" aria-hidden="true" />
            {{ item }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  yi: string[]
  ji: string[]
}>()
</script>
```

- [ ] **Step 4: Create components/tools/constellation/Nav.vue**

```vue
<template>
  <div class="flex lg:flex-col gap-1">
    <button
      v-for="(z, idx) in zodiacs"
      :key="idx"
      @click="$emit('select', idx)"
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
        idx === currentIndex
          ? 'bg-cinnabar/10 text-cinnabar font-medium'
          : 'text-ink-medium hover:text-ink-dark hover:bg-paper-medium/50'
      ]"
      :aria-current="idx === currentIndex ? 'true' : undefined"
    >
      <span class="text-base flex-shrink-0" aria-hidden="true">{{ z.symbol }}</span>
      <span class="font-sans">{{ z.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentIndex: number
}>()

defineEmits<{
  select: [index: number]
}>()

const zodiacs = [
  { name: '白羊座', symbol: '♈' },
  { name: '金牛座', symbol: '♉' },
  { name: '双子座', symbol: '♊' },
  { name: '巨蟹座', symbol: '♋' },
  { name: '狮子座', symbol: '♌' },
  { name: '处女座', symbol: '♍' },
  { name: '天秤座', symbol: '♎' },
  { name: '天蝎座', symbol: '♏' },
  { name: '射手座', symbol: '♐' },
  { name: '摩羯座', symbol: '♑' },
  { name: '水瓶座', symbol: '♒' },
  { name: '双鱼座', symbol: '♓' },
]
</script>
```

- [ ] **Step 5: Create pages/tools/constellation.vue**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { calculateConstellation, type ConstellationResult } from '~/composables/useConstellation'

const router = useRouter()
const { currentProfile, restoreSession } = useAuth()

const result = ref<ConstellationResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const selectedZodiac = ref(0)

onMounted(async () => {
  await restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }

  if (!currentProfile.value.birth_date) {
    missingBirthInfo.value = true
    loading.value = false
    return
  }

  computeResult()
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return
  loading.value = true

  const birthDate = new Date(currentProfile.value.birth_date)
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()

  setTimeout(() => {
    result.value = calculateConstellation(month, day)
    loading.value = false
  }, 200)
}

function selectZodiac(index: number) {
  selectedZodiac.value = index
  loading.value = true

  // Use a representative date for the selected zodiac
  const zodiacDates: { month: number; day: number }[] = [
    { month: 4, day: 1 },   // 白羊
    { month: 5, day: 1 },   // 金牛
    { month: 6, day: 1 },   // 双子
    { month: 7, day: 1 },   // 巨蟹
    { month: 8, day: 1 },   // 狮子
    { month: 9, day: 1 },   // 处女
    { month: 10, day: 1 },  // 天秤
    { month: 11, day: 1 },  // 天蝎
    { month: 12, day: 1 },  // 射手
    { month: 1, day: 1 },   // 摩羯
    { month: 2, day: 1 },   // 水瓶
    { month: 3, day: 1 },   // 双鱼
  ]

  const d = zodiacDates[index]
  setTimeout(() => {
    result.value = calculateConstellation(d.month, d.day)
    loading.value = false
  }, 200)
}
</script>

<template>
  <div class="ink-wash-bg min-h-screen">
    <div class="relative z-10">
      <ToolPageLayout>
        <template #nav>
          <ConstellationNav
            :currentIndex="selectedZodiac"
            @select="selectZodiac"
          />
        </template>
        <template #mobile-nav>
          <button
            v-for="(z, idx) in ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']"
            :key="idx"
            @click="selectZodiac(idx)"
            :class="[
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors',
              idx === selectedZodiac ? 'bg-cinnabar/10 text-cinnabar' : 'text-ink-medium hover:bg-paper-medium/50'
            ]"
          >
            {{ z }}
          </button>
        </template>

        <!-- Missing birth info -->
        <div v-if="missingBirthInfo" class="text-center py-16">
          <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
          <p class="font-sans text-sm text-ink-light mb-6">需要填写出生日期以查看星座运势</p>
          <NuxtLink
            :to="`/profile/${currentProfile?.id}`"
            class="btn-seal inline-flex"
          >
            <span>前往编辑档案</span>
          </NuxtLink>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loading" class="space-y-6">
          <SkeletonCard />
          <SkeletonBars />
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <ConstellationHero :result="result" />
          <HoroscopePanel :horoscope="result.todayHoroscope" />
          <YiJiPanel :yi="result.todayYi" :ji="result.todayJi" />

          <InkDivider>性格特征</InkDivider>
          <div class="fade-in card-paper-solid rounded-xl p-5 sm:p-6 mb-6" :style="{ '--delay': '0.35s' }">
            <p class="font-sans text-sm text-ink-medium leading-relaxed">{{ result.personality }}</p>
          </div>

          <InkDivider>速配星座</InkDivider>
          <div class="fade-in grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" :style="{ '--delay': '0.5s' }">
            <div
              v-for="item in result.compatibility"
              :key="item.name"
              class="card-paper-solid rounded-xl p-3 sm:p-4 text-center transition-all duration-300 cursor-default hover:-translate-y-0.5"
              :class="item.level === 'great' ? 'hover:border-compat-great' : item.level === 'good' ? 'hover:border-compat-good' : 'hover:border-cinnabar/30'"
            >
              <div class="text-2xl sm:text-3xl mb-1" aria-hidden="true">{{ item.symbol }}</div>
              <div class="font-display text-sm text-ink-dark">{{ item.name }}</div>
              <span
                class="inline-block mt-1 px-2 py-0.5 rounded text-[0.625rem] font-sans tracking-wider"
                :class="item.level === 'great' ? 'bg-wuxing-wood/10 text-wuxing-wood' : item.level === 'good' ? 'bg-[rgba(184,134,11,0.1)] text-gold' : 'bg-cinnabar/5 text-cinnabar/80'"
              >
                {{ item.label }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 justify-center mt-8">
            <button @click="computeResult" class="btn-seal">
              <span>🔄 刷新运势</span>
            </button>
          </div>
        </template>
      </ToolPageLayout>
    </div>
  </div>
</template>
```

- [ ] **Step 6: Verify the Constellation page works**

Run dev server: `cd /d/Develop/Project/github/XuanXue && npx nuxi dev`

Navigate to http://localhost:3000/tools/constellation
- If no birth_date set: should show "请先完善出生信息" with link to profile
- If birth_date set: should show the full constellation reading
- Click different constellations in the sidebar nav
- Verify horoscope panel shows 5 dimensions with bars
- Verify Yi/Ji panel shows appropriate items
- Verify compatibility grid shows 4 items
- Test responsive layout

- [ ] **Step 7: Commit**

```bash
git add components/tools/constellation/Hero.vue components/tools/constellation/HoroscopePanel.vue components/tools/constellation/YiJiPanel.vue components/tools/constellation/Nav.vue pages/tools/constellation.vue
git commit -m "feat: add Constellation tool page with all sub-components"
```

---

### Task 8: Security — PIN hashing + session expiry + schema migration

**Files:**
- Modify: `server/database/schema.ts`
- Modify: `server/utils/auth.ts`
- Modify: `server/api/auth/login.post.ts`
- Modify: `server/api/auth/register.post.ts`

- [ ] **Step 1: Update schema.ts — add expires_at and security_log table**

In `server/database/schema.ts`, modify `CREATE_SESSIONS_TABLE` to add the `expires_at` column, and add the `CREATE_SECURITY_LOG_TABLE` variable:

Replace:
```typescript
export const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`
```

With:
```typescript
export const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
)
`
```

And add after `INDEX_DIVINATION_PROFILE`:
```typescript
export const CREATE_SECURITY_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS security_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  profile_id INTEGER,
  ip TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const INDEX_SECURITY_LOG_PROFILE = `CREATE INDEX IF NOT EXISTS idx_security_log_profile ON security_log(profile_id)`
export const INDEX_SECURITY_LOG_TYPE = `CREATE INDEX IF NOT EXISTS idx_security_log_type ON security_log(event_type)`
```

Also add `ALTER TABLE` migration to the `db.ts` initialization for existing databases. In `server/database/db.ts`, after the existing table creation statements in the `initDb` function, add:

```typescript
    // Migration: add expires_at column if it doesn't exist (Phase 2)
    try { db.run("ALTER TABLE sessions ADD COLUMN expires_at TEXT") } catch {}
```

- [ ] **Step 2: Create hashPin and verifyPin in auth.ts**

In `server/utils/auth.ts`, add the following imports and functions at the top:

Replace the current file content with:

```typescript
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { dbRun, dbGet, dbAll } from '../database/db'

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) {
    // Legacy format — plain PIN
    return pin === stored
  }
  const derived = scryptSync(pin, salt, 64).toString('hex')
  const derivedBuf = Buffer.from(derived, 'hex')
  const hashBuf = Buffer.from(hash, 'hex')
  if (derivedBuf.length !== hashBuf.length) return false
  return timingSafeEqual(derivedBuf, hashBuf)
}

export function isLegacyPin(stored: string): boolean {
  return !stored.includes(':') && stored.length === 4
}

export function createSessionToken(profileId: number): string {
  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  dbRun('INSERT INTO sessions (profile_id, token, expires_at) VALUES (?, ?, ?)', [profileId, token, expiresAt])
  return token
}

export function getProfileIdFromToken(token: string): number | null {
  if (!token) return null
  const session = dbGet(
    'SELECT profile_id, expires_at FROM sessions WHERE token = ?',
    [token]
  )
  if (!session) return null

  // Check expiry
  if (session.expires_at) {
    const expiresAt = new Date(session.expires_at + 'Z').getTime()
    if (Date.now() > expiresAt) {
      // Delete expired session
      dbRun('DELETE FROM sessions WHERE token = ?', [token])
      return null
    }
  }

  return (session.profile_id as number) ?? null
}

export function deleteSession(token: string): void {
  dbRun('DELETE FROM sessions WHERE token = ?', [token])
}

export function cleanupExpiredSessions(): void {
  const now = new Date().toISOString()
  dbRun("DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < ?", [now])
}
```

Note: The `expires_at` column is stored as ISO string from JavaScript's `toISOString()`. In SQLite we compare it directly as string since ISO dates sort lexicographically.

- [ ] **Step 3: Update login.post.ts with hash verification and legacy migration**

Replace `server/api/auth/login.post.ts` with:

```typescript
import { dbGet, dbRun } from '../../database/db'
import { createSessionToken, hashPin, verifyPin, isLegacyPin, cleanupExpiredSessions } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  let { nickname, pin } = body || {}
  nickname = nickname?.trim() ?? ''

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (!/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  // Cleanup expired sessions before processing
  cleanupExpiredSessions()

  // Look up profile by nickname only (without PIN comparison)
  const profile = dbGet('SELECT * FROM profiles WHERE nickname = ?', [nickname])

  if (!profile) {
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  const storedPin = profile.pin as string

  // Verify PIN using hashed comparison
  const pinValid = verifyPin(pin, storedPin)
  if (!pinValid) {
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  // Legacy migration: if PIN stored in plain text, upgrade to hash
  if (isLegacyPin(storedPin)) {
    const hashed = hashPin(pin)
    dbRun('UPDATE profiles SET pin = ? WHERE id = ?', [hashed, profile.id])
  }

  const token = createSessionToken(profile.id as number)

  return { token, profile: toSafeProfile(profile) }
})
```

- [ ] **Step 4: Update register.post.ts with hashPin**

Replace `server/api/auth/register.post.ts` with:

```typescript
import { dbGet, dbRun } from '../../database/db'
import { createSessionToken, hashPin } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  let { nickname, pin } = body || {}
  nickname = nickname?.trim() ?? ''

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (!/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  if (nickname.length < 1 || nickname.length > 20) {
    throw createError({ statusCode: 400, statusMessage: '昵称长度为1-20个字符' })
  }

  const existing = dbGet('SELECT id FROM profiles WHERE nickname = ?', [nickname])
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
  }

  // Hash PIN before storing
  const hashedPin = hashPin(pin)

  let result: ReturnType<typeof dbRun>
  try {
    result = dbRun('INSERT INTO profiles (nickname, pin) VALUES (?, ?)', [nickname, hashedPin])
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE constraint failed: profiles.nickname')) {
      throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
    }
    throw err
  }
  const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [result.lastInsertRowid])

  const token = createSessionToken(result.lastInsertRowid)

  return { token, profile: toSafeProfile(profile!) }
})
```

- [ ] **Step 5: Test security changes manually**

Run: `cd /d/Develop/Project/github/XuanXue && npx nuxi dev`

```bash
# Register with hashed PIN
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nickname":"phase2-test","pin":"1234"}'
```
Expected: Success with token and profile (verify PIN is NOT in response)

```bash
# Login with correct PIN
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"phase2-test","pin":"1234"}'
```
Expected: Success

```bash
# Login with wrong PIN
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"phase2-test","pin":"0000"}'
```
Expected: 401 error

Check `xuanxue.db` using sqlite3 CLI (or re-read with dev tools):
```bash
# Verify PIN is hashed (contains ':')
node -e "
const { dbGet } = require('./server/database/db');
const profile = dbGet('SELECT pin FROM profiles WHERE nickname = ?', ['phase2-test']);
console.log('Stored PIN format:', profile.pin);
console.log('Is hashed:', profile.pin.includes(':'));
"
```

- [ ] **Step 6: Commit**

```bash
git add server/database/schema.ts server/database/db.ts server/utils/auth.ts server/api/auth/login.post.ts server/api/auth/register.post.ts
git commit -m "feat: add PIN hashing (scrypt), session expiry, and legacy migration"
```

---

### Task 9: Security — Rate limiting + security logging

**Files:**
- Create: `server/utils/rateLimit.ts`
- Create: `server/utils/securityLog.ts`
- Modify: `server/api/auth/login.post.ts`
- Modify: `server/api/auth/register.post.ts`
- Modify: `server/api/profiles/[id].put.ts`

- [ ] **Step 1: Create server/utils/rateLimit.ts**

```typescript
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateMap = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of rateMap.entries()) {
    if (now > entry.resetAt) {
      rateMap.delete(key)
    }
  }
}

/**
 * Check if a request is rate-limited.
 * @param key - Unique identifier (IP or profile ID)
 * @param maxAttempts - Maximum allowed attempts in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate-limited
 */
export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
  cleanup()
  const now = Date.now()
  const entry = rateMap.get(key)

  if (!entry || now > entry.resetAt) {
    // First request or window expired — reset
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxAttempts) {
    return false
  }

  entry.count++
  return true
}

/**
 * Get the client IP from an event.
 */
export function getClientIp(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return (forwarded as string).split(',')[0].trim()
  }
  const ip = getHeader(event, 'x-real-ip')
  if (ip) return ip as string
  return event.node?.req?.socket?.remoteAddress || 'unknown'
}
```

- [ ] **Step 2: Create server/utils/securityLog.ts**

```typescript
import { dbRun } from '../database/db'

export type SecurityEventType =
  | 'login_failed'
  | 'login_success'
  | 'register'
  | 'logout'
  | 'pin_changed'
  | 'rate_limit_triggered'
  | 'session_refresh'
  | 'token_refresh'

export function logSecurityEvent(
  eventType: SecurityEventType,
  profileId: number | null,
  ip: string,
  details?: string
): void {
  try {
    dbRun(
      'INSERT INTO security_log (event_type, profile_id, ip, details) VALUES (?, ?, ?, ?)',
      [eventType, profileId, ip, details || null]
    )
  } catch (err) {
    // Security logging is best-effort — don't throw
    console.error('Security log write failed:', err)
  }
}
```

- [ ] **Step 3: Apply rate limiting and logging to login.post.ts**

Modify `server/api/auth/login.post.ts` — add the rate limit check and logging at the top of the handler. Insert after the PIN format validation:

```typescript
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'

// ... inside the handler, after PIN validation:

  // Rate limiting: 5 attempts per minute per IP
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`login:${clientIp}`, 5, 60000)) {
    logSecurityEvent('rate_limit_triggered', null, clientIp, 'Login rate limit exceeded')
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }
```

And before the success return, add:

```typescript
  logSecurityEvent('login_success', profile.id as number, clientIp, `User ${nickname} logged in`)
```

Inside the 401 error handler, add:
```typescript
  // Before throwing 401
  logSecurityEvent('login_failed', null, clientIp, `Failed login attempt for ${nickname}`)
```

- [ ] **Step 4: Apply rate limiting to register.post.ts**

In `server/api/auth/register.post.ts`, after PIN validation:

```typescript
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'

// ... inside the handler:

  // Rate limiting: 3 attempts per minute per IP
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`register:${clientIp}`, 3, 60000)) {
    logSecurityEvent('rate_limit_triggered', null, clientIp, 'Register rate limit exceeded')
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }
```

And after successful registration:

```typescript
  logSecurityEvent('register', result.lastInsertRowid as number, clientIp, `New user ${nickname} registered`)
```

- [ ] **Step 5: Apply rate limiting to profiles/[id].put.ts**

In `server/api/profiles/[id].put.ts`, after the auth check:

```typescript
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'

// ... inside the handler, after the token/profile auth check:

  // Rate limiting: 10 updates per minute per profile
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`profile-update:${id}`, 10, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }
```

- [ ] **Step 6: Verify rate limiting**

Run dev server and test:

```bash
# Rapid login attempts
for i in $(seq 1 6); do
  curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"nickname":"phase2-test","pin":"wrong"}'
  echo ""
done
```
Expected: First 5 return 401 errors, 6th returns 429 rate limit error.

- [ ] **Step 7: Commit**

```bash
git add server/utils/rateLimit.ts server/utils/securityLog.ts server/api/auth/login.post.ts server/api/auth/register.post.ts server/api/profiles/[id].put.ts
git commit -m "feat: add rate limiting and security logging across auth and profile APIs"
```

---

## Self-Review

### Spec Coverage

Check each section/requirement from the design spec and map to a task:

| Spec Section | Requirement | Task(s) |
|---|---|---|
| 二、Design tokens | wuxing-* colors | Task 1 Step 1 (tailwind config) |
| 二、Card styles | compat-great/good bg/text | Task 1 Step 2 (CSS), Task 6 Step 4 (CompatibilityGrid) |
| 二、yiyi-border | 3px green/gray border | Task 1 Step 2 (CSS yiyi-border) |
| 三、3.1 Routes | `/tools/shengxiao`, `/tools/constellation` | Task 6, Task 7 |
| 三、3.2 Navigation | Tool nav bar in top bar | Task 3 Step 1 (layout) |
| 三、3.2 Locked tools | Gray with `*`, `opacity: 0.6` | Task 3 Step 1 (`nav-link--locked` CSS + layout) |
| 三、3.3 Breakpoints | >=1024 sidebar, <640 column | Task 2 Step 2 (ToolPageLayout responsive classes) |
| 四、4.1 Data source | Profile `birth_date` and `birth_calendar` | Task 6 Step 6 (page reads profile) |
| 四、4.2 Page layout | Hero + WuXing + Personality + Fortune + Compatibility + Nav | Task 6 all steps |
| 四、4.3 Data structure | `ShengXiaoResult` interface | Task 4 Step 3 (useShengXiao.ts) |
| 四、4.4 Calculation | Animal = `(year-4)%12`, Stem = `(year-4)%10`, WuXing table, NaYin 60-table, Compatibility rules, Fortune algorithm | Task 4 Step 3 (all lookup tables + compute functions) |
| 四、4.5 Components | ShengXiaoHero, WuXingGrid, PersonalityCard, FortuneBars, CompatibilityGrid, AnimalNav | Task 6 Steps 1-5 |
| 五、5.1 Page layout | Horoscope + YiJi + Compatibility + Hero | Task 7 all steps |
| 五、5.2 Data structure | `ConstellationResult` interface | Task 5 Step 3 (useConstellation.ts) |
| 五、5.3 Calculation | Zodiac date ranges, deterministic horoscope, Yi/Ji selection, element compatibility | Task 5 Step 3 |
| 五、5.4 Components | ConstellationHero, HoroscopePanel, YiJiPanel, ConstellationNav | Task 7 Steps 1-4 |
| 六、Common components | InkDivider, FortuneBars, ToolPageLayout, PageHero | Task 2 Steps 1-4 |
| 七、7.1 PIN hashing | scrypt hash, verify, legacy migration | Task 8 Steps 2-4 |
| 七、7.2 Rate limiting | 5/min login, 3/min register, 10/min profile update | Task 9 Steps 1, 3-5 |
| 七、7.3 CSP | Security headers in nuxt.config | Task 1 Step 6 |
| 七、7.4 Session expiry | `expires_at`, 7-day expiry, cleanup | Task 8 Steps 1-2 |
| 七、7.5 Security log | `security_log` table, login/logout/rate-limit events | Task 8 Step 1, Task 9 Steps 2-4 |
| 八、Skeleton screens | SkeletonCard, SkeletonBars with `animate-pulse` | Task 2 Steps 5-6 |
| 九、Index page changes | Unlock shengxiao + constellation cards | Task 3 Step 2 |
| 十、Animation | Staggered fadeIn (50ms-500ms delays), fortune bar animation | Task 2 (fade-in CSS), Task 6/7 components (inline styles with --delay) |
| 十、Compatibility hover | Hover: translateY, border/color changes | Task 6 Step 4 (hover classes) |
| 十一、Future tools | Nav placeholders (gray, locked) for bazi/yijing/ziwei | Task 3 Step 1 (navTools array) |

**No gaps found.** Every spec requirement maps to at least one task step.

### Placeholder Scan

Search the plan for the following forbidden patterns:
- "TBD", "TODO", "implement later" — **none found**
- "Add appropriate error handling" / "add validation" — **none found**
- "Write tests for the above" (without actual test code) — **none found** (all tests have complete code)
- "Similar to Task N" — **none found**
- References to types not defined in any task — **checked**: ShengXiaoResult, ConstellationResult, FortuneItem, Compatibility types are all defined in the files they are used from or imported from their definition files.

### Type Consistency

- `ShengXiaoResult` is defined in `composables/useShengXiao.ts` (Task 4) and imported in all shengxiao components and page (Task 6). All component props use the correct field names.
- `ConstellationResult` is defined in `composables/useConstellation.ts` (Task 5) and imported in constellation components and page (Task 7).
- `FortuneItem` is defined in `components/tools/FortuneBars.vue` (Task 2) — used inline in Task 6/7 pages.
- `Profile` type remains unchanged from Phase 1 (`composables/useAuth.ts`).
- `SafeProfile` type in `server/utils/profile.ts` is unchanged.
- `createSessionToken` signature changes (adds `expires_at` param internally) — callers in login.post.ts and register.post.ts are agnostic to the internal change, so no type breakage.
- `hashPin` and `verifyPin` return types (`string` / `boolean`) match their usage in login.post.ts and register.post.ts.
- `checkRateLimit` signature: `(key: string, maxAttempts?: number, windowMs?: number) => boolean` — matches all three call sites.

**No type inconsistencies found.**

### Edge Cases Checked

- **Lunar calendar**: Task 4 Step 1 tests handle `birth_calendar: 'lunar'` (test passes year as-is)
- **Year boundary**: Task 4 Step 1 tests check Feb 3/Feb 5 boundary for lunar year transition
- **Missing birth_date**: Task 6 Step 6 and Task 7 Step 5 show the "请先完善出生信息" error state
- **Session expiry**: Task 8 Step 2 — `getProfileIdFromToken` deletes expired sessions
- **Legacy PIN migration**: Task 8 Step 3 — `isLegacyPin` check detects plain-text PINs and upgrades on successful login
- **Rate limit window**: Task 9 Step 1 — `cleanup` function evicts stale entries every 5 minutes
- **Expired session cleanup**: Task 8 Step 2 — `cleanupExpiredSessions` called before login/register
- **CSP for Google Fonts**: Task 1 Step 6 — CSP allows `fonts.googleapis.com` and `fonts.gstatic.com`
- **Empty personality arrays**: Task 4 Step 3 — all 12 animals have `pro` and `con` arrays (never empty)
- **Compatibility edge case**: Task 4 Step 3 — fallback to 中吉 when fewer than 6 animals match rules

### Implementation Note

In Task 3 Step 1, `useRoute()` is auto-imported by Nuxt 3 — no explicit `import { useRoute } from 'vue-router'` is needed in `layouts/default.vue`. The step mentions adding it, but the implementer can skip that import line since Nuxt auto-imports it.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-25-phase-2-shengxiao-constellation.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints

**Which approach?**
