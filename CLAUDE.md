# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx nuxi dev          # Start dev server (port 3000 default)
npx nuxi build        # Build for production
npx nuxi preview      # Preview production build
npx nuxi typecheck    # Run TypeScript check
npx vitest run        # Run all tests
```

## Project Structure

```
├── app.vue                          # Root: <NuxtLayout> + <NuxtPage>
├── nuxt.config.ts                   # Nuxt config, modules, CSS, fonts
├── tailwind.config.ts               # Design tokens (ink/paper/cinnabar colors, fonts, shadows)
├── vitest.config.ts                 # Vitest config with ~ alias for tests
├── assets/css/main.css              # Design system: textures, components
├── constants/
│   └── bazi.ts                      # Shared: STEMS, BRANCHES, WUXING_COLORS
├── composables/
│   ├── useAuth.ts                   # Auth state (useState-based, localStorage session)
│   ├── useGreeting.ts               # Greeting settings (localStorage only, no API)
│   ├── useSolarTerms.ts             # Solar term date calculation + month pillar
│   └── useBaZi.ts                   # BaZi engine: four pillars, ten gods, da yun
├── components/tools/
│   ├── bazi/                        # BaZi tool components
│   │   ├── BaziGrid.vue             # Four pillars grid (desktop grid + mobile scroll)
│   │   ├── ElementAnalysis.vue      # WuXing element bar chart
│   │   ├── DayMasterCard.vue        # Day master strength + 喜用神/忌神
│   │   ├── DaYunTimeline.vue        # Great fortune cycle cards
│   │   └── BaziInfoSidebar.vue      # Sidebar with basic info summary
│   ├── constellation/               # Constellation tool components
│   ├── shengxiao/                   # Chinese zodiac tool components
│   ├── FortuneBars.vue, InkDivider.vue, etc.
│   └── ToolPageLayout.vue           # Three-column layout with conditional sidebars
├── layouts/default.vue              # Top bar (logo + profile dropdown), ink-wash bg
├── pages/
│   ├── login.vue                    # Login / Register (tabs, PIN auth)
│   ├── index.vue                    # Home: greeting + tool card grid
│   ├── profile/[id].vue             # Profile edit (readonly nickname, gender, birth info)
│   └── tools/
│       ├── bazi.vue                 # BaZi tool: compute + render all pillars, elements, da yun
│       ├── shengxiao.vue
│       └── constellation.vue
├── tests/composables/
│   ├── useSolarTerms.test.ts
│   └── useBaZi.test.ts
└── docs/superpowers/
    ├── specs/                       # Design specifications
    └── plans/                       # Implementation plans
```

No `server/` directory yet — Phase 1-3 frontend only. Backend API endpoints (`/api/auth/*`, `/api/profiles/*`) are consumed but not implemented.

## Architecture

### State Management

- Composables use `useState()` (not `ref()`) for shared state. `useAuth` uses `useState<Profile | null>('auth:profile', ...)` so layout and pages share the same reactive instance.
- Synchronous composable functions must NOT be `async`. Use `async` only when `await` is needed.
- Pure-computation composables (e.g., `useBaZi.ts`, `useSolarTerms.ts`) export typed functions, not Vue reactivity — they are zero-dependency calculation engines called from page/component setup.

### Persistence

- **Session**: `localStorage` key `xuanxue:session` storing `{ token, profile }`.
- **Greeting**: `localStorage` key `xuanxue:greeting` storing `{ prefix, subtitle }` — self-contained, no API dependency.
- `restoreSession()` reads from localStorage; must be called in **both** `layouts/default.vue` and each page's `onMounted`.
- After profile save, call `updateProfile(response)` (not `restoreSession()`) to sync both `useState` and localStorage.

### Auth Flow

1. Page loads → `restoreSession()` reads localStorage → `currentProfile` populated.
2. If no session → redirect to `/login`.
3. Login/Register → API returns `{ token, profile }` → written to localStorage + `useState`.
4. Logout → DELETE `/api/auth/logout` (best-effort) → clear localStorage + `useState`.

### UI Design: 墨韵 · Ink Resonance

Traditional Chinese scholar's study aesthetic:

- **Palette**: ink (5 shades), paper (6 shades), cinnabar (#C62828 primary), gold, jade.
- **Paper grain**: `body::after` SVG feTurbulence at `z-index: 40`, page content at `.relative.z-10`.
- **Components**: `btn-seal` (stamp button), `input-ink` (underline input), `tool-card` (glass card), `divider-ink`, `seal-mark`, `dropdown-panel`.
- Cards use `backdrop-filter: blur(8px)` over ink-wash gradient background.
- Fonts: Ma Shan Zheng (display headings) + Noto Sans SC (body, weights 400/500).

### Git Workflow

- Feature development happens in dedicated branches (`phase-*`, `feat/*`, `fix/*`), never directly on `main`.
- `main` should always remain clean — no in-progress feature commits, no planning/spec commits.
- After feature completion, merge back to `main` via PR (`gh pr create`).

### Key Conventions

- API responses typed with generics: `$fetch<Type>(url, ...)`. Avoid `as any`.
- Types referenced across files must be `export`ed from their defining module (e.g., `export interface Profile` in `useAuth.ts`).
- `setTimeout` handles must be tracked and cleared before setting a new one to prevent stale closures on rapid re-submits. Clean up in `onUnmounted`.
- Number inputs with `min`/`max` must also validate range in JS — HTML `type="number"` does not prevent manual out-of-range entry.
- Dropdown menus must handle Escape keydown on the menu container (not just the toggle button) for keyboard accessibility.
- Greeting fields must NOT appear in profile edit page (`profile/[id].vue`).
- All input fields have `<label for="id">` association.
- Custom radios use `sr-only` input + styled `<span>`, with `focus-visible` ring via `.sr-only:focus-visible + span`.
- Form cards (`card-paper-solid`) must use `p-8` (not `p-6 sm:p-8`) to keep 32px padding on mobile per spec.
- `aria-haspopup` should be `"menu"` not `"true"` (ARIA 1.1+).
- `@keyframes` rules must be placed outside `@layer` blocks in CSS (Tailwind PostCSS may drop or misorder them otherwise).
- Elements with `role="tablist"` must support ArrowLeft/ArrowRight keyboard navigation.
- Elements with `role="menu"` must support ArrowDown/ArrowUp keyboard navigation and click-outside-to-close.
- Nullable form fields (e.g. `birth_hour`, `birth_minute`) must always be explicitly sent in API requests — use `null` instead of omitting the key, so the server can clear the value.
- Interactive elements (click + keyboard) must include both `@click` and `@keydown.enter`/`@keydown.space` handlers.

### Shared Constants

- `constants/bazi.ts` is the single source of truth for `STEMS`, `BRANCHES`, `WUXING_COLORS`, and `WUXING_FALLBACK_COLOR`. Import from here — never redefine these in components or composables.
- `WUXING_COLORS` maps element names to hex colors: `'{ '木': '#4A7C59', '火': '#C62828', '土': '#B8860B', '金': '#8E8E8E', '水': '#2C5F7C' }'`. Use `WUXING_FALLBACK_COLOR` (`#6B5B4F`) for fallback, not a hardcoded value.

### BaZi Engine Conventions

- **`getTenGod` must NEVER return `'日主'`.** The `'日主'` label is a display concept, not a ten god. Assign it exclusively to the day pillar's stem after construction: `dayPillar.stemTenGod = '日主'`. The ten god matrix correctly returns `'比肩'` for same-stem targets.
- **Solar term boundaries**: Use `getSolarTerm()` from `useSolarTerms.ts` for 节气 boundary detection. Never hardcode dates like `day < 4` for 立春 — the solar term date varies by year.
- **NaYin formula**: Stem and branch indices must have the same parity (both even or both odd) for valid sexagenary pairs. Add a parity guard: `if ((stemIdx - branchIdx) % 2 !== 0) return ''`.
- **DaYun start age** is currently a simplified formula `((birthYear * 7 + 13) % 6) + 3`. Real BaZi computes it from the distance between the birth date and the nearest 节气 boundary divided by 3. This is a known limitation.
- **Date parsing**: Use explicit `parseDate(str)` (split on `-` and `parseInt`) instead of `new Date(str)`, which is timezone-dependent and unreliable for YYYY-MM-DD strings.
- **Lunar calendar**: Birth dates marked as 农历 are treated as Gregorian in day pillar calculations. This is a known limitation — results for lunar births are approximate.

### Nuxt Auto-Import Caveats

- Components in `components/tools/` may auto-register with a `Tools` prefix only (e.g., `ToolsInkDivider`). Short-name aliases like `InkDivider` may not resolve in some Nuxt versions. When a component fails to resolve at runtime, add an explicit import: `import InkDivider from '~/components/tools/InkDivider.vue'`.
- `computed` and `ref` are auto-imported by Vue. Do not import them unless explicitly needed.

### ToolPageLayout Conventions

- Three named slots: `#nav` (desktop left sidebar), `#mobile-nav` (mobile horizontal scroll), `#nav-right` (right sidebar, xl+ screens).
- All three sidebars conditionally render via `v-if="$slots.nav"` etc. — tools omit slots they don't need.
- Left sidebar (`#nav`) is for in-tool navigation (animal/zodiac selector, anchor links). It should NOT duplicate top-bar cross-tool navigation links.
- Right sidebar (`#nav-right`) is for personal summary info (BaZi only) — sticky at `top-20`, xl+ only.
- BaZi: no `#nav`, only `#nav-right` (BaziInfoSidebar). Shengxiao: `#nav` (AnimalNav) + `#mobile-nav`. Constellation: `#nav` (ConstellationNav) + `#mobile-nav`.

### SSR & Client-Side Guards

- Composables that read `localStorage` in their initialization need `if (import.meta.client)` guard. Nuxt runs composable setup on the server where `localStorage` is unavailable.
- Layout should watch `route.path` to close dropdowns on navigation: `watch(() => route.path, () => { showDropdown.value = false })`.
