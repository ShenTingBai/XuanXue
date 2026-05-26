# UI Designer Audit — 视觉设计系统与组件一致性

**日期**: 2026-05-26
**评分**: 5.0/10

---

## 各维度评分

| 维度 | 分数 |
|------|------|
| 色彩一致性 | 5/10 |
| 字体与排版 | 5/10 |
| 组件一致性 | 4/10 |
| 视觉层次 | 7/10 |
| 动效与微交互 | 6/10 |
| 暗色模式/主题 | 1/10 |
| 无障碍 | 7/10 |

---

## CRITICAL 问题

### 1. 双重卡片系统（tool-card vs tool-card-alt）
- `tool-card` 在 main.css:218 定义但**从未被使用**
- `tool-card-alt` 在 index.vue scoped CSS 中定义，功能相同
- 修复：删除 tool-card，将 tool-card-alt 提升到 @layer components

### 2. 三种不同的"区块卡片"模式
- card-paper-solid（八字页）vs .section-card（六爻解读）vs .casting-card（起卦面板）
- 背景/圆角/边框各不同
- 修复：统一到 card-paper-solid

---

## HIGH 问题

### 回到顶部按钮两种竞品样式
- 六爻：`w-10 h-10 rounded-full bg-ink-dark/80`
- 八字：`w-14 h-14 rounded-lg border-cinnabar/40`
- 修复：提取共享 ScrollTopButton.vue

### scoped CSS 中 50+ 处硬编码颜色值
- HexagramDisplay: ~20 处
- YijingCastingPanel: ~8 处（金币颜色不在设计系统中）
- 修复：定义 CSS 自定义属性 `--color-cinnabar` 等

### Google Fonts 在中国被墙
- nuxt.config.ts FIXME 已标注但未修复
- 修复：WOFF2 自托管到 /public/fonts/

### 没有暗色模式基础设施
- 无 prefers-color-scheme / dark: 变体
- 建议："深夜书房"变体而非标准暗色模式

---

## MED 问题

### font-family 硬编码 18+ 次 → 使用 Tailwind font-display/font-sans
### ZhuangGuaTable 用 font-mono 但无 mono 字体定义
### 字母间距无系统化比例（0.05em 到 0.25em 随意跳跃）
### section-card 缺少 backdrop-filter: blur
### casting-card 视觉基调完全不同（ink 底色 vs paper 底色）
### 两种分数环实现（YijingInterpretation vs LiuNianTimeline）
### yiyi-card 类名疑似笔误（宜宜→宜忌）
### ink.light / ink.muted / ink.medium 三个 token 同值 #7A6A5C
### color-mix() @supports 回退色值错误（硬编码 #C62828 而非 var(--accent)）

---

## Top 5 设计改进建议

1. **字体自托管** — WOFF2 + @font-face，解决中国大陆用户字体加载问题
2. **统一卡片系统** — 删除死代码，提取 tool-card-alt 到全局组件层
3. **建立 CSS 自定义属性** — 所有颜色 token 导出为 `var()` 可用
4. **提取共享 UI 原语** — ScrollTopButton / ScoreRing / SectionCard
5. **实现"深夜书房"视觉变体** — [data-theme="dim"]，墨水美学 + 低亮度
