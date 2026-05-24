# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx nuxi dev          # Start dev server (port 3000 default)
npx nuxi build        # Build for production
npx nuxi preview      # Preview production build
npx nuxi typecheck    # Run TypeScript check
```

## Project Structure

```
├── app.vue                          # Root: <NuxtLayout> + <NuxtPage>
├── nuxt.config.ts                   # Nuxt config, modules, CSS, fonts
├── tailwind.config.ts               # Design tokens (ink/paper/cinnabar colors, fonts, shadows)
├── assets/css/main.css              # Design system: textures, components
├── composables/
│   ├── useAuth.ts                   # Auth state (useState-based, localStorage session)
│   └── useGreeting.ts               # Greeting settings (localStorage only, no API)
├── layouts/default.vue              # Top bar (logo + profile dropdown), ink-wash bg
├── pages/
│   ├── login.vue                    # Login / Register (tabs, PIN auth)
│   ├── index.vue                    # Home: greeting + tool card grid
│   └── profile/[id].vue             # Profile edit (readonly nickname, gender, birth info)
└── docs/superpowers/
    ├── specs/                       # Design specifications
    └── plans/                       # Implementation plans
```

No `server/` directory yet — Phase 1 frontend only. Backend API endpoints (`/api/auth/*`, `/api/profiles/*`) are consumed but not implemented.

## Architecture

### State Management

- Composables use `useState()` (not `ref()`) for shared state. `useAuth` uses `useState<Profile | null>('auth:profile', ...)` so layout and pages share the same reactive instance.
- Synchronous composable functions must NOT be `async`. Use `async` only when `await` is needed.

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
