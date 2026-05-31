# Phase 4 八字增强 -- UI 设计文档

> **状态：已完成** — 对应设计已实现
>
> **Status:** Design specification for ShenShaPanel and LiuNianTimeline components.
> **Design System:** 墨韵 Ink Resonance (extends existing, no new language).
> **Branch:** `phase-4-bazi-enhancement`

---

## 1. Component Ordering in bazi.vue

The two new components are inserted into the existing page flow. The current order (as of `phase-3-bazi`) is:

```
BaziGrid          -- delay 0.05s
ElementAnalysis   -- delay 0.20s
DayMasterCard     -- delay 0.30s
DaYunTimeline     -- delay 0.40s
Reading Guide     -- no delay (static)
```

New order after Phase 4 integration:

```
BaziGrid          -- delay 0.05s  (unchanged)
ShenShaPanel      -- delay 0.15s  (NEW, after pillars, before elements)
ElementAnalysis   -- delay 0.20s  (unchanged)
DayMasterCard     -- delay 0.30s  (unchanged)
DaYunTimeline     -- delay 0.40s  (unchanged)
LiuNianTimeline   -- delay 0.50s  (NEW, after da yun, before reading guide)
Reading Guide     -- no delay (unchanged)
```

Rationale:
- **ShenShaPanel after BaziGrid**: Shensha are computed from the four pillars. Placing them immediately after the pillar grid means the user reads the pillar data, then sees the derived shensha markers, then proceeds to element analysis. This creates a natural information cascade: static structure (pillars) -> derived markers (shensha) -> elemental balance (elements/strength) -> temporal cycles (da yun/liu nian).
- **LiuNianTimeline after DaYunTimeline**: Both are temporal. Da yun is macro-scale (10-year cycles), liu nian is micro-scale (annual). Reading macro then micro is the standard BaZi interpretation flow.
- Delay values fill the gaps between existing delays (0.05 -> 0.15 -> 0.20) and extend the sequence (0.40 -> 0.50), preserving the staggered cascade animation.

---

## 2. ShenShaPanel.vue -- Design Spec

### 2.1 Purpose

Displays the computed shensha (spirit markers) from the birth chart. Each shensha is a badge showing its name, with hover tooltips revealing its meaning and astrological source.

### 2.2 Layout

```
┌─ InkDivider "神煞" ──────────────────────────────────────────┐
│                                                               │
│  Helper text: one-line explanation of what shensha are        │
│                                                               │
│  ┌─ card-paper-solid ──────────────────────────────────────┐  │
│  │                                                         │  │
│  │  [吉神] section header (text-xs, caps, ink-light)       │  │
│  │  [天乙贵人] [太极贵人] [文昌贵人] [福星贵人] ...     │  │
│  │  (jade green badges, flex-wrap)                         │  │
│  │                                                         │  │
│  │  [中性] section header                                  │  │
│  │  [驿马] [华盖] [桃花]                                   │  │
│  │  (ink brown badges, flex-wrap)                          │  │
│  │                                                         │  │
│  │  [凶煞] section header                                  │  │
│  │  [羊刃] [劫煞] [空亡] [孤辰] ...                    │  │
│  │  (muted cinnabar badges, flex-wrap)                     │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 2.3 Visual Hierarchy

**Section container:**
- Standard pattern: `InkDivider` + helper `<p>` + `card-paper-solid`
- Card padding: `p-4 sm:p-5` (matches BaziGrid, ElementAnalysis)
- Internal spacing: `space-y-4` between the three category groups

**Category headers:**
- `font-sans text-xs font-medium text-ink-light tracking-wider mb-2`
- Examples: `吉神`, `中性`, `凶煞`
- No emoji or icons -- purely typographic

**Badges (吉神):**
- Background: `#4A7C5918` (jade at ~9% opacity)
- Text: `#4A7C59` (jade solid)
- Border: `1px solid #4A7C5930`
- Shape: `rounded` (4px), `px-2 py-0.5`
- Size: `text-xs`
- Font: `font-sans`
- Cursor: `cursor-default` (badges are not interactive, tooltips are informational)

**Badges (中性):**
- Background: `#6B5B4F12` (ink-medium at ~7% opacity)
- Text: `#6B5B4F`
- Border: `1px solid #6B5B4F28`
- Same size/shape as 吉神

**Badges (凶煞):**
- Background: `#C628280E` (cinnabar at ~5.5% opacity -- deliberately subtle)
- Text: `#C6282890` (cinnabar at ~56% opacity -- muted, not alarming)
- Border: `1px solid #C6282820`
- Same size/shape as 吉神
- **Important**: Cinnabar is used muted here because these are informational markers, not warnings. We want to signal "note this" without the visual weight of a danger indicator.

**Empty state:**
- If a category has zero badges, omit the section entirely (`v-if`)
- If ALL shensha arrays are empty (should not happen with full chart, but as a guard), show a single `font-sans text-xs text-ink-light/60` message: "该命局无特殊神煞标记"

### 2.4 Tooltip Behavior

Each badge carries a hover tooltip that appears above the badge:

```
┌──────────────────────────────────┐
│ 主智慧超群，有学术天赋，喜神秘事物   │
│ 日干 · 月柱地支                    │
└──────────────────────────────────┘
         ▼
    [太极贵人]
```

Design decisions:
- **Tooltip appears above** (`bottom-full` positioning with `mb-1.5`)
- **Centered** on badge (`left-1/2 -translate-x-1/2`)
- **Max width**: `max-w-[16rem]` (256px), text wraps (`white-space: normal`)
- **Background**: `#2C2C2C` (near-black, high contrast for readability)
- **Text color**: `#D4C9B8` (warm light tone, readable on dark)
- **Border radius**: `rounded-lg` (8px)
- **Padding**: `px-2.5 py-1.5`
- **Description**: `text-xs font-sans` -- the one-sentence meaning
- **Source line**: `text-[0.65rem] opacity-60` -- shows lookup source (e.g. "日干 · 月柱地支")
- **Transition**: `opacity-0 group-hover:opacity-100 transition-opacity`
- **z-index**: `z-20` (above card content, below page header/grain)
- **pointer-events**: `pointer-events-none` (tooltip does not block hover on adjacent badges)

The `source` display format: `{source} · {pillar}{position}`. Examples:
- `日干 · 月柱地支`
- `年支 · 日柱地支`
- `日支 · 日柱本柱`
- `日柱旬空 · 年柱地支`

### 2.5 Responsive Behavior

- **All breakpoints**: The badge cloud uses `flex flex-wrap gap-1.5`, so badges naturally wrap to the next line when they exceed container width.
- **No grid**: Three separate flex-wrap groups, not a CSS grid. This is more natural for variable badge counts (some users may have 15+ 吉神 and only 2 凶煞).
- **Card padding**: `p-4 sm:p-5` (consistent with all other section cards).

### 2.6 Accessibility

- Badges use `role="list"` on the container and `role="listitem"` on each badge (or use `<ul>`/`<li>` semantics).
- Tooltip content is available to screen readers via `aria-describedby` on each badge, pointing to a visually-hidden description element. (The CSS-only `group-hover` tooltip is a visual affordance; the underlying data must also be in the DOM for AT.)
- Alternatively: each badge has a `title` attribute as a basic fallback.
- Category headers marked with `role="heading" aria-level="4"`.

### 2.7 Interaction States

- **Badge default**: Subtle color with faint border, no shadow.
- **Badge hover**: No visual change on the badge itself (it is not clickable). Only the tooltip appears.
- **Touch devices**: Tooltips do not appear on touch (no `:hover` equivalent). The badge name itself serves as the primary label; users who need the description can infer meaning from the name (most shensha names are self-descriptive in Chinese). A future enhancement could add a tap-to-toggle tooltip for mobile.

### 2.8 Props Interface

```typescript
defineProps<{
  shenSha: ShenSha[]   // from composables/useShenSha.ts
}>()
```

---

## 3. LiuNianTimeline.vue -- Design Spec

### 3.1 Purpose

Displays annual (流年) fortune analysis for a range of years centered on the current calendar year. The current year is presented as an expanded detail card; other years are compact timeline entries that can be expanded on click.

### 3.2 Layout

```
┌─ InkDivider "流年详批（±5年）" ───────────────────────────────┐
│                                                               │
│  Helper text: explains the year span and card types            │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  CURRENT YEAR CARD (expanded, prominent)               │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ 2026  丙午年  偏财              [ring] 75       │  │
│  │  │ Summary sentence...                              │  │
│  │  │ ┌─ Da Yun interaction ─────────────────────────┐ │  │
│  │  │ │ 大运甲子·流年丙午，天地配合有利              │ │  │
│  │  │ └──────────────────────────────────────────────┘ │  │
│  │  │ 四柱地支关系                                      │  │
│  │  │ [合] 年柱(未) 与流年相合，主合作                 │  │
│  │  │ [冲] 日柱(子) 与流年相冲，注意变动               │  │
│  │  │ 流月干支                                          │  │
│  │  │ ┌──┬──┬──┬──┬──┬──┐                          │  │
│  │  │ │寅│卯│辰│巳│午│未│ ... (12 cells)             │  │
│  │  │ │庚│辛│壬│癸│甲│乙│                          │  │
│  │  │ │寅│卯│辰│巳│午│未│                          │  │
│  │  │ └──┴──┴──┴──┴──┴──┘                          │  │
│  │  │ 各柱影响 (text list)                              │  │
│  │  └──────────────────────────────────────────────────┘  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ 2030  庚戌  比肩   [=====     ] 48  ───────────── v ──┐  │
│  │  正财年，戊土为用神，流年合日支...                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ 2029  己酉  劫财   [======    ] 52  ────────────────┐  │
│  │  劫财年，需防破财损耗...                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ... (remaining years in chronological order, past to future)  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 3.3 Year Ordering

Years are displayed from past to future (earliest first, latest last). The full list spans from `currentYear - range` to `currentYear + range`, ordered chronologically ascending. Example for 2026 with range=5: 2021, 2022, 2023, 2024, 2025, **2026 (current)**, 2027, 2028, 2029, 2030, 2031.

This ordering (past before future) creates a narrative: "where you have been, where you are, where you are going."

### 3.4 Current Year Card -- Detailed Design

#### 3.4.1 Card Container

- `card-paper-solid rounded-xl p-4 sm:p-5`
- **Prominence treatment**: `border-2 border-cinnabar bg-cinnabar/3` (thicker red border + light cinnabar tint)
- `mb-4` spacing from the next (compact) year card

#### 3.4.2 Header Row

```
┌──────────────────────────────────────────────────────────────┐
│ 2026  丙午年  偏财                              (ring) 75  │
└──────────────────────────────────────────────────────────────┘
```

Components in the header row, left to right:

1. **Year number**: `font-display text-2xl text-cinnabar font-medium` -- the focal element. Largest text on the card.

2. **Stem-Branch year name**: `font-display text-xl text-ink-dark` -- "丙午年". Slightly smaller than the year number, using the display font for traditional feel.

3. **Ten God label**: `font-sans text-sm text-cinnabar font-medium` -- "偏财". Same color as the year number to visually group them.

4. **Alignment**: `flex items-baseline gap-3`

5. **Score ring** (right-aligned via `ml-auto`):
   - SVG circle, 40x40 viewport (rendered at `w-10 h-10`)
   - Background track: `stroke="#D4C9B820"` (ink-faint at low opacity), `stroke-width="4"`
   - Progress arc: computed from score percentage, `stroke-linecap="round"`
   - Arc color follows score threshold scheme (see section 3.6)
   - Score number displayed next to the ring: `font-sans text-sm font-medium`, same color as the ring arc
   - The ring uses `-rotate-90` so progress starts from the top (12 o'clock position)
   - `stroke-dasharray` formula: circumference = `2 * pi * 14 ≈ 87.96`. Dash array = `87.96 * score/100`, gap = `87.96`

#### 3.4.3 Summary Text

- `font-sans text-sm text-ink-medium mb-3`
- The pre-computed rule-template summary sentence
- Example: "偏财年，土为喜神，流年合日支，有合作良机。"
- One paragraph, no truncation

#### 3.4.4 Da Yun Interaction Banner

- Container: `font-sans text-xs text-ink-light bg-paper-lightest/60 rounded-lg p-2.5`
- Bold prefix: `font-medium text-ink-dark` for "大运甲子"
- Separator dot: `mx-1` with middot character
- Body: the interaction text in `text-ink-light`
- This sits as a compact info banner between the summary and the detailed sections

#### 3.4.5 Earth Relations Section

```
四柱地支关系
[合] 年柱(未)  与2026流年地支六合，主合作、姻缘、贵人相助
[冲] 日柱(子)  与2026流年地支相冲，主变动、奔波、冲击
```

- Section header: `font-sans text-xs font-medium text-ink-dark mb-1.5`
- Each relation row: `flex items-center gap-2 text-xs font-sans`
- **Relation type badge**: `px-1.5 py-0.5 rounded text-[0.65rem] font-medium`
  - `合`: jade background `#4A7C5918`, jade text `#4A7C59`
  - `冲`: cinnabar background `#C6282818`, cinnabar text `#C62828`
  - `刑`: gold background `#B8860B18`, gold text `#B8860B`
  - `害`: ink-metal background `#8E8E8E18`, ink-metal text `#8E8E8E`
- **Target pillar**: `text-ink-medium` -- format: "日柱(子)"
- **Description**: `text-ink-light/60` -- the rule-generated description
- Empty state: `font-sans text-xs text-ink-light/60` -- "流年地支与命局各柱无特殊关系"

#### 3.4.6 Monthly Stems Grid

```
流月干支

┌──────┬──────┬──────┬──────┬──────┬──────┐
│  寅  │  卯  │  辰  │  巳  │  午  │  未  │
│ 庚寅 │ 辛卯 │ 壬辰 │ 癸巳 │ 甲午 │ 乙未 │
└──────┴──────┴──────┴──────┴──────┴──────┘
┌──────┬──────┬──────┬──────┬──────┬──────┐
│  申  │  酉  │  戌  │  亥  │  子  │  丑  │
│ 丙申 │ 丁酉 │ 戊戌 │ 己亥 │ 庚子 │ 辛丑 │
└──────┴──────┴──────┴──────┴──────┴──────┘
```

- Section header: `font-sans text-xs font-medium text-ink-dark mb-2`
- Grid layout: `grid grid-cols-4 sm:grid-cols-6 gap-1.5`
  - Mobile: 4 columns (3 rows of 4)
  - Desktop: 6 columns (2 rows of 6)
- Each cell: `text-center rounded py-1 px-1 bg-paper-lightest/80 border border-paper-dark/30`
- Month label (top of cell): `font-sans text-[0.6rem] text-ink-light` -- the branch name (寅, 卯, etc.)
- Stem+branch (bottom of cell): `font-display text-xs text-ink-dark` -- e.g. "庚寅"
- Cell styling is deliberately compact and subtle -- this is reference data, not the primary reading

#### 3.4.7 Pillars Interaction Section

```
各柱影响
- 与2026流年地支六合，主合作、姻缘、贵人相助
- 与2026流年地支相冲，主变动、奔波、冲击
- 流年与命局关系平和
```

- Section header: `font-sans text-xs font-medium text-ink-dark mb-1.5`
- List: `ul` with `space-y-0.5`
- Each item: `font-sans text-xs text-ink-medium`
- These are verbatim from `detail.pillarsInteraction` strings
- If all are benign (the "关系平和" case), list still shows as single item

#### 3.4.8 Vertical Spacing Within Current Year Card

- `mb-3` after header row
- `mb-3` after summary
- Da Yun banner: no extra margin (inline with flow)
- `space-y-3` for the detail section container (earth relations, monthly stems, pillar interactions)

### 3.5 Compact Year Cards (Non-Current Years)

#### 3.5.1 Card Container

- `card-paper-solid rounded-xl p-3 sm:p-4 border border-paper-dark`
- Hover: `hover:border-ink-faint transition-colors` (subtle border darkening on hover)
- Cursor: `cursor-pointer` (click to expand)
- `mb-2` spacing between compact cards

#### 3.5.2 Row Layout

Each compact card is a single row (horizontal on all breakpoints):

```
┌──────────────────────────────────────────────────────────────┐
│ 2030  庚戌  [比肩]  [========--------] 48                  │
│ 正财年，戊土为用神，流年合日支，有合作良机。                 │
└──────────────────────────────────────────────────────────────┘
```

Left to right:

1. **Year**: `font-sans text-sm text-ink-dark font-medium w-12 flex-shrink-0`
2. **Stem-Branch**: `font-display text-lg text-ink-dark w-14 flex-shrink-0`
3. **Ten God badge**: `font-sans text-xs px-1.5 py-0.5 rounded`
   - Favorable: background `#4A7C5918`, text `#4A7C59`
   - Unfavorable: background `#C628280E`, text `#C6282890`
4. **Score bar**: `flex-1 h-1.5 rounded-full bg-paper-dark/40 overflow-hidden`
   - Fill bar inside: `h-full rounded-full transition-all`, width = score%, color from score threshold scheme
5. **Score number**: `font-sans text-xs font-medium w-8 text-right`, color from score threshold scheme

Row wrapper: `flex items-center gap-2.5`

Below the row: `font-sans text-xs text-ink-light/70 mt-1.5 truncate` showing the summary text (single line, ellipsis overflow).

#### 3.5.3 Expanded Detail (on Click)

When a compact card is clicked, additional detail slides in below the summary:

```
┌──────────────────────────────────────────────────────────────┐
│ 2030  庚戌  [比肩]  [========--------] 48                  │
│ 正财年，戊土为用神，流年合日支...                            │
│ ─────────────────────────────────────────────────────────── │
│ [合] 年柱(未)  与2030流年地支相合                           │
│ [冲] 月柱(丑)  与2030流年地支相冲                           │
└──────────────────────────────────────────────────────────────┘
```

- Separator: `mt-3 pt-3 border-t border-paper-dark/50`
- Earth relations list, same format as the current-year card but without the full description text (just relation type badge + target pillar)
- Empty state: `font-sans text-xs text-ink-light/60` -- "流年地支与命局无特殊关系"
- Only one card is expanded at a time (or none). Clicking a different card closes the previously expanded one. Clicking the same card toggles it closed.
- No animation required for expand/collapse; `v-if` toggle is sufficient.

### 3.6 Score Color Scheme

A four-tier color system based on the 0-100 score:

| Score Range | Color      | Hex       | Meaning          |
|-------------|------------|-----------|------------------|
| 70 - 100    | Jade       | `#4A7C59` | Favorable        |
| 50 - 69     | Gold       | `#B8860B` | Moderate/neutral |
| 30 - 49     | Ink-Metal  | `#8E8E8E` | Cautious         |
| 0 - 29      | Cinnabar   | `#C62828` | Challenging      |

These colors are used for:
- Score ring arc (current year)
- Score bar fill (compact cards)
- Score number text

### 3.7 Responsive Behavior

**Desktop (sm+):**
- Current year card: full-width expanded card
- Compact cards: horizontal row layout as described above
- Monthly stems: 6-column grid
- Everything in a single `space-y-4` stack

**Mobile (< sm):**
- Current year card: same layout but reduced padding (`p-4` instead of `p-5`)
- Header row wraps: year + stem+branch on first line, score ring moves below or stays right-aligned
  - The year + stem/branch + ten god use `flex-wrap` so they wrap naturally
  - Score ring stays with `ml-auto` but may drop to a second row on very narrow screens (< 360px)
- Compact cards: same horizontal row layout (the row is narrow enough at `text-sm`/`text-xs` sizes to fit even on mobile)
- Monthly stems: 4-column grid
- Card padding: `p-3` (mobile) vs `p-4` (desktop) for compact cards

### 3.8 Year Highlighting

- **Current year**: `border-2 border-cinnabar bg-cinnabar/3` -- the only card with a colored border and tint
- **Past years** (year < currentYear): no special treatment beyond the compact card style
- **Future years** (year > currentYear): no special treatment
- **Adjacent years** (currentYear +/- 1): no special treatment (the current year card is the sole focal point; giving special treatment to adjacent years would dilute focus)

### 3.9 Accessibility

- The current year card has `role="region" aria-label="2026年流年详批"` to identify it as a landmark
- Earth relation badges (`合`, `冲`, etc.) are purely visual. Their text content ("合", "冲") is directly in the DOM as text, so screen readers can read them.
- The score ring includes an `aria-label` with the numeric score, e.g. `aria-label="运势评分 75分"`
- Compact cards that can be clicked to expand include `aria-expanded="true|false"` and `role="button"` (since they are `<div>` elements with click handlers)
- Keyboard: Enter/Space on a compact card toggles its expanded state. `tabindex="0"` on each compact card.
- The monthly stems grid uses `role="grid"` with proper `role="row"` and `role="gridcell"` assignments.

### 3.10 Props Interface

```typescript
defineProps<{
  years: LiuNianYear[]     // from composables/useLiuNian.ts
  currentYear: number      // the reference "now" year (center of timeline)
  range: number            // how many years on each side
}>()
```

---

## 4. Integration Points in bazi.vue

### 4.1 New Imports

```typescript
import ShenShaPanel from '~/components/tools/bazi/ShenShaPanel.vue'
import LiuNianTimeline from '~/components/tools/bazi/LiuNianTimeline.vue'
import { calculateShenSha } from '~/composables/useShenSha'
import { calculateLiuNian } from '~/composables/useLiuNian'
```

### 4.2 Reactive State

```typescript
const shenSha = computed(() => {
  if (!result.value) return []
  return calculateShenSha({
    yearPillar: result.value.yearPillar,
    monthPillar: result.value.monthPillar,
    dayPillar: result.value.dayPillar,
    hourPillar: result.value.hourPillar,
    dayMaster: result.value.dayMaster,
    dayMasterIndex: ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(result.value.dayMaster),
    gender: result.value.gender,
  })
})

const liuNian = computed(() => {
  if (!result.value) return []
  return calculateLiuNian({
    baZi: result.value,
    currentYear: new Date().getFullYear(),
    range: 5,
  })
})

const currentYear = computed(() => new Date().getFullYear())
```

### 4.3 Template Insertion Points

**ShenShaPanel** -- inserted between `BaziGrid` and `ElementAnalysis`:

```html
<!-- After BaziGrid closing tag -->
<ShenShaPanel :shen-sha="shenSha" />

<!-- Before ElementAnalysis opening tag -->
<ElementAnalysis ... />
```

**LiuNianTimeline** -- inserted between `DaYunTimeline` and the Reading Guide:

```html
<!-- After DaYunTimeline closing tag -->
<LiuNianTimeline :years="liuNian" :current-year="currentYear" :range="5" />

<!-- Before Reading Guide opening tag -->
<div class="mt-8 p-5 sm:p-6 rounded-xl bg-gradient-to-br ...">
```

### 4.4 Delay Value Assignment

The `fade-in` animation delay values for the two new components are chosen to fit into the existing staggered sequence:

| Component        | Delay  | Notes                                              |
|------------------|--------|----------------------------------------------------|
| BaziGrid         | 0.05s  | Unchanged                                          |
| **ShenShaPanel** | 0.15s  | Midpoint between BaziGrid (0.05) and ElementAnalysis (0.20) |
| ElementAnalysis  | 0.20s  | Unchanged                                          |
| DayMasterCard    | 0.30s  | Unchanged                                          |
| DaYunTimeline    | 0.40s  | Unchanged                                          |
| **LiuNianTimeline** | 0.50s | Continues the 0.10s increment pattern after DaYunTimeline |
| Reading Guide    | n/a    | Unchanged (static, no fade-in)                     |

---

## 5. Typography Summary

All typographic decisions follow the established component patterns:

| Element                     | Font            | Size       | Weight    | Color        |
|-----------------------------|-----------------|------------|-----------|--------------|
| Section heading (InkDivider)| Ma Shan Zheng   | text-xl/sm | 400       | ink-dark     |
| Helper text                 | Noto Sans SC    | text-sm    | 400       | ink-light/70 |
| Category headers (shensha)  | Noto Sans SC    | text-xs    | 500       | ink-light    |
| Badge text (shensha)        | Noto Sans SC    | text-xs    | 400       | varies       |
| Tooltip description         | Noto Sans SC    | text-xs    | 400       | #D4C9B8      |
| Tooltip source              | Noto Sans SC    | text-[0.65rem] | 400   | opacity-60   |
| Year number (current)       | Ma Shan Zheng   | text-2xl   | 500       | cinnabar     |
| Stem+branch (current)       | Ma Shan Zheng   | text-xl    | 400       | ink-dark     |
| Ten god (current)           | Noto Sans SC    | text-sm    | 500       | cinnabar     |
| Summary (current)           | Noto Sans SC    | text-sm    | 400       | ink-medium   |
| Detail section headers      | Noto Sans SC    | text-xs    | 500       | ink-dark     |
| Detail body text            | Noto Sans SC    | text-xs    | 400       | ink-medium   |
| DaYun banner                | Noto Sans SC    | text-xs    | 400       | ink-light    |
| Month grid label            | Noto Sans SC    | text-[0.6rem] | 400    | ink-light    |
| Month grid stem+branch      | Ma Shan Zheng   | text-xs    | 400       | ink-dark     |
| Compact: year               | Noto Sans SC    | text-sm    | 500       | ink-dark     |
| Compact: stem+branch        | Ma Shan Zheng   | text-lg    | 400       | ink-dark     |
| Compact: ten god badge      | Noto Sans SC    | text-xs    | 400       | varies       |
| Compact: summary            | Noto Sans SC    | text-xs    | 400       | ink-light/70 |

---

## 6. Color Reference

All colors are from `tailwind.config.ts` design tokens. No hardcoded values except where explicitly noted for SVG strokes or tooltip backgrounds.

| Usage                          | Color       | Token / Hex          |
|--------------------------------|-------------|----------------------|
| 吉神 badge text/border         | Jade        | `#4A7C59` (wuxing-wood) |
| 中性 badge text/border         | Ink-medium  | `#6B5B4F`           |
| 凶煞 badge text/border         | Cinnabar    | `#C62828` (at ~56% text opacity) |
| Current year card border       | Cinnabar    | `border-cinnabar`   |
| Current year card bg tint      | Cinnabar    | `bg-cinnabar/3`     |
| Score >= 70                    | Jade        | `#4A7C59`           |
| Score 50-69                    | Gold        | `#B8860B`           |
| Score 30-49                    | Ink-metal   | `#8E8E8E`           |
| Score < 30                     | Cinnabar    | `#C62828`           |
| 合 relation badge              | Jade        | `#4A7C59`           |
| 冲 relation badge              | Cinnabar    | `#C62828`           |
| 刑 relation badge              | Gold        | `#B8860B`           |
| 害 relation badge              | Ink-metal   | `#8E8E8E`           |
| Tooltip background             | Near-black  | `#2C2C2C` (hardcoded) |
| Tooltip text                   | Warm light  | `#D4C9B8` (hardcoded) |
| Monthly stem cell border       | Paper-dark  | `#E0D5C0` at 30%   |
| Compact card divider           | Paper-dark  | `border-paper-dark/50` |

The two hardcoded colors (`#2C2C2C` and `#D4C9B8`) for tooltips are deliberate: the tooltip needs high contrast against any background (paper, card, or ink-wash), and using a near-black background with light text achieves this regardless of parent context. No design system token captures this "inverse surface" concept, so hardcoded values are acceptable.

---

## 7. Motion and Animation

- Both components use the existing `.fade-in` utility with custom `--delay` CSS variables (0.15s for ShenShaPanel, 0.50s for LiuNianTimeline).
- The animation is defined once in `assets/css/main.css` as `fadeIn` (opacity 0->1 + translateY 12px->0 over 0.5s ease-out). Reused, not redefined.
- Compact card expand/collapse: no transition animation. `v-if` toggle is immediate. Adding a transition (e.g. `<Transition>`) would be a future polish step; the current priority is correctness and data clarity.
- Respect `prefers-reduced-motion: reduce` -- the main.css already handles this globally.
