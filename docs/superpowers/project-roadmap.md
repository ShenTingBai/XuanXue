# 玄·道 — 项目路线图

> 总览文档，整合所有阶段计划与当前状态。

## 项目概述

玄学命理推演平台，提供八字排盘、紫微斗数、六爻占卜、生肖运势、星座星盘等术数工具。品牌从"玄学"升级为"玄·道"，以传统中式书房美学（墨韵 · Ink Resonance）为视觉基调。

**技术栈：** Nuxt 3 + Vue 3 + TypeScript + TailwindCSS + SQLite (sql.js)

## 架构分层

```
┌─────────────────────────────────────────────┐
│  Pages (login / index / tools/* / profile)  │
├─────────────────────────────────────────────┤
│  Components (tools/*, shared UI)            │
├─────────────────────────────────────────────┤
│  Composables (useAuth, useBaZi, useYijing…) │
├─────────────────────────────────────────────┤
│  Constants (bazi, yijing — 唯一数据源)       │
├─────────────────────────────────────────────┤
│  Server (Nitro API: auth, divinations, …)   │
├─────────────────────────────────────────────┤
│  Database (SQLite — profiles, divinations)  │
└─────────────────────────────────────────────┘
```

## 设计系统

详见 [`docs/superpowers/specs/2026-05-31-xuandao-design-system.md`](specs/2026-05-31-xuandao-design-system.md)

- **色板：** 暖纸底 #F5F0E8、暖笺 #E8DCC6、朱砂 #9C1A1C、墨 #2C1810
- **品牌：** 玄·道（间隔号连接）
- **关键组件：** btn-cin、btn-ink、seal-icon、card-warm、tool-card--new、input-warm
- **装饰元素：** 符头顶线、卦象角标、线装书鱼尾、天地界栏、朱砂印分割线

## 阶段状态

| 阶段 | 名称 | 状态 | 分支 |
|------|------|------|------|
| Phase 1 | 基础系统（Auth + SQLite + 登录/注册） | ✅ 完成 | `main` |
| Phase 2 | 生肖 + 星座工具 | ✅ 完成 | `main` |
| Phase 3 | 八字排盘 | ✅ 完成 | `main` |
| Phase 4 | 八字增强（神煞/流年/大运） | ✅ 完成 | `main` |
| Phase 5 | 六爻占卜 | ✅ 完成 | `main` |
| Phase 6 | 紫微斗数 | ✅ 完成 | `main` |
| — | 紫微天星图重设计 | ✅ 完成 | `main` |
| — | 设计系统落地（玄·道品牌） | ✅ 完成 | `main` |
| — | 工具页面视觉适配 | ✅ 完成 | `main` |
| — | 纸纹纹理确认 | ✅ 完成 | `main` |
| — | Batch 4A（八字增强 + 紫微补齐 + 配对解释） | ✅ 完成 | `main` |
| — | Batch 4B（星座星盘） | ✅ 完成 | `main` |
| — | Batch 1（太岁关系 + 月亮星座 + 流年签） | ✅ 完成 | `main` |
| — | Batch 2（化太岁 + 纳音性格 + 本命佛） | ✅ 完成 | `main` |
| — | Batch 3（八字合婚 + 姓名测试） | ✅ 完成 | `main` |
| Phase 7+ | Batch 5（测字/月运/用户系统/导出/择吉日） | 📋 规划中 | — |

## 设计系统落地范围

### 已实现（feat/design-system-rollout）
- [x] tailwind.config.ts 色板扩展（cinnabar-deeper/deepest, paper-card）
- [x] main.css 组件类（30+ 新类：btn-cin, seal-icon, card-warm, tool-card--new, anim-rise…）
- [x] index.vue 重设计（英雄区 + 工具卡片 + 命盘预览 + 运势签 + 命簿卡片 + footer）
- [x] login.vue 重设计（结缘立卷 + 四角卦象 + 号令/密令 + 入卷）
- [x] layouts/default.vue 品牌名更新（玄学 → 玄·道）
- [x] 工具页面视觉适配（bazi / shengxiao / constellation / yijing / ziwei）
- [x] profile/[id].vue 命簿页面重设计
- [x] 纸纹纹理（body::after SVG feTurbulence）确认

## 分支策略

- `main`：始终可部署，只接收经过 PR 合并的完成功能
- `feat/*` / `fix/*`：功能/修复分支，完成后 PR → `main`，**必须 `--no-ff` 合并**

## 参考文档

| 文档 | 路径 |
|------|------|
| 设计系统规范 | [`specs/2026-05-31-xuandao-design-system.md`](specs/2026-05-31-xuandao-design-system.md) |
| 概念参考稿 | [`concepts/talisman-aesthetic.html`](../concepts/talisman-aesthetic.html) |
| Phase 1 计划 | [`plans/2026-05-24-phase-1-base-system.md`](plans/2026-05-24-phase-1-base-system.md) |
| Phase 2 计划 | [`plans/2026-05-25-phase-2-shengxiao-constellation.md`](plans/2026-05-25-phase-2-shengxiao-constellation.md) |
| Phase 3 计划 | [`plans/2026-05-25-phase-3-bazi.md`](plans/2026-05-25-phase-3-bazi.md) |
| Phase 4 计划 | [`plans/2026-05-25-phase-4-bazi-enhancement.md`](plans/2026-05-25-phase-4-bazi-enhancement.md) |
| Phase 5 计划 | [`plans/2026-05-26-phase-5-yijing-divination.md`](plans/2026-05-26-phase-5-yijing-divination.md) |
| Phase 6 计划 | [`plans/2026-05-26-phase-6-ziwei-implementation.md`](plans/2026-05-26-phase-6-ziwei-implementation.md) |
| 紫微天星图重设计 | [`plans/2026-05-31-ziwei-celestial-redesign.md`](plans/2026-05-31-ziwei-celestial-redesign.md) |
| Batch 4A 计划 | [`plans/2026-06-04-batch-4a-bazi-ziwei-pairing.md`](plans/2026-06-04-batch-4a-bazi-ziwei-pairing.md) |
| Batch 4B 设计 | [`specs/2026-06-04-batch-4b-constellation-natal-chart-design.md`](specs/2026-06-04-batch-4b-constellation-natal-chart-design.md) |
| Batch 4B 计划 | [`plans/2026-06-04-batch-4b-constellation-natal-chart.md`](plans/2026-06-04-batch-4b-constellation-natal-chart.md) |
| Phase 7+ 路线图 | [`plans/2026-05-31-xuandao-phase-7-plus-roadmap.md`](plans/2026-05-31-xuandao-phase-7-plus-roadmap.md) |
