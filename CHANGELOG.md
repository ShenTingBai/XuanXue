# Changelog

## v1.0.0 (unreleased)

### Features

- 11 tool pages: 八字 (BaZi), 紫微斗数 (ZiWei), 六爻 (Yijing), 生肖 (ShengXiao), 星座 (Constellation), 合婚 (HeHun), 测字 (CeZi), 姓名 (NameTest), 择吉 (ZeJi), 称骨 (Chenggu), 梅花易数 (MeiHua YiShu)
- User authentication with scrypt-hashed PIN and session tokens
- Multi-profile management with CRUD API
- Auto-save and history for all divination tools
- Export to image (html-to-image)
- PWA support with offline caching
- 478+ commits, 2000+ tests across 36 test files

### Architecture

- Monolithic Nuxt 3 app with Nitro server engine
- SQLite (sql.js) for persistence, no external database required
- Battery-backed BaZi engine: four pillars, ten gods, DaYun, ShenSha, LiuNian
- External library integrations: iztro (ZiWei), astronomy-engine (natal chart), lunar-javascript (lunar calendar)

### Design

- 墨韵 (Ink Resonance) design system
- Traditional Chinese study aesthetics: ink (墨), paper (纸), cinnabar (朱砂) palette
- Custom SVG paper texture via feTurbulence
- Self-hosted Ma Shan Zheng (display) + Noto Sans SC (body) fonts

### Tech Stack

- Nuxt 3 + Vue 3 + TypeScript + TailwindCSS
- Nitro server with SQLite (sql.js)
- Vitest test framework
- CSP with dynamic nonce injection
- HSTS, X-Content-Type-Options, X-Frame-Options security headers

### Milestones

- **Phase 1** — Foundation: Nuxt app, SQLite backend, auth system, tool layout
- **Phase A** — Remediation: design tokens, CSS utilities, test infra, SVG icons, component audit
- **Phase B** — New tools: ZiWei, HeHun, CeZi, NameTest, ZeJi tool pages with full engines
- **Phase C** — Mobile + quality: responsive layout, skeleton loading, PWA, YueYun, MeiHua
- **Phase D** — Open source: community files (LICENSE, CONTRIBUTING, SECURITY, CHANGELOG)
