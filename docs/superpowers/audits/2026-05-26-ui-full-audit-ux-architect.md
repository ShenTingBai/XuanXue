# UX Architect Audit — CSS Architecture & Technical Implementation

**日期**: 2026-05-26
**评分**: 6.5/10

---

## High Severity

### [HIGH] 重复 `@keyframes fadeIn` 定义

- **main.css:350-355** 全局定义
- **HexagramDisplay.vue:393-407** scoped 重复定义（行为不一致：缺少初始 translateY）
- 修复：删除 scoped 版本，使用全局 `.fade-in` 类

### [HIGH] `box-shadow` 动画触发重绘（GPU 未加速）

- **HexagramDisplay.vue:261-263,269** `pulseGlow` 动画每帧重绘 box-shadow
- 修复：改为 `opacity` 动画 + 伪元素，走 GPU 合成

### [HIGH] 移动优先约定被破坏

- **ShenShaPanel.vue:134** 使用 `@media (max-width: 640px)`，项目其余全用 `min-width`
- 640px 在 min/max 两套规则中产生 1px 重叠
- 修复：转为 mobile-first 写法

### [HIGH] scoped 样式中硬编码颜色值（绕过设计 token）

- 多处出现 `#C62828`, `#7A6A5C`, `#6B5B4F`, `#E0D5C0` 等裸色值
- 修复：在 `@layer base` 定义 `:root` CSS 自定义属性

### [HIGH] 零 GPU 加速提示

- 无 `will-change` 属性，所有动画走主线程
- 修复：`.tool-card` 加 `will-change: transform`，`.fade-in` 加 `will-change: opacity, transform`

---

## Medium Severity

### [MEDIUM] tailwind.config.ts 颜色重复

- `ink.light` = `ink.muted` (both #7A6A5C)
- `paper.light` = `paper.DEFAULT` (both #F5F0E8)
- `compat.great` = `jade.DEFAULT` = `wuxing.wood`
- `compat.good` = `gold.DEFAULT` = `wuxing.earth`

### [MEDIUM] scoped 样式中重复声明 font-family

- 多处硬编码 `font-family: 'Ma Shan Zheng', cursive` 和 `'Noto Sans SC', sans-serif`
- Tailwind 已有 `font-display` / `font-sans` 可用

### [MEDIUM] Transition CSS 类在 5 个文件中重复

- bazi.vue, profile/[id].vue, login.vue, layouts/default.vue 重复几乎一样的展开/收起 CSS

### [MEDIUM] content 路径不包含 composables/ 和 constants/

- composable 中返回的 Tailwind class 字符串可能不会被编译

### [MEDIUM] .ink-wash-bg 固定尺寸径向渐变不随视口缩放

- 4K 屏上渐变过小，手机上 600px 椭圆超出视口

---

## Low Severity

### [LOW] .tool-card 仅在一页中使用却在全局定义

### [LOW] `transition: all` 触发不必要的布局计算（4处）

### [LOW] body::after 纹理始终占用 GPU 合成层

### [LOW] 无响应式排版比例尺（依赖 Tailwind 默认）

### [LOW] color-mix() @supports 回退不完整

### [LOW] :focus-visible outline 颜色与 border-bottom 相同会融合

---

## Top 5 优化建议

1. **定义 CSS 自定义属性** — 在 `:root` 中导出所有设计 token
2. **合并重复的 Transition CSS 类** — 提取到全局 utilities
3. **修复移动优先不一致** — ShenShaPanel.vue 的 max-width 查询
4. **添加 GPU 合成提示** — 动画元素加 will-change
5. **清理 Tailwind 配置重复** — 去重 ink.light/paper.light/compat
