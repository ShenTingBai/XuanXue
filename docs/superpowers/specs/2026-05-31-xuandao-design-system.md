# 玄·道 设计系统

## 概述

玄学平台品牌升级，从"玄学"重塑为"玄·道"——融合玄学的神秘主义与道的哲学深度，以传统中式书房美学（墨韵）为视觉基调，打造民间术数工具的沉浸式体验。

## 设计原则

- **文人书房之雅**：克制、留白、纸墨质感，避免数字产品的冰冷感
- **术数符箓之秘**：朱砂印、卦象、符头顶线等元素暗示神秘学属性
- **暖纸暖笺之温**：以暖色调纸张为基底，区别于纯白背景的现代风格

## 色彩体系

| Token | 色值 | 用途 |
|-------|------|------|
| `paper-lightest` | #FBF8F4 | 最浅纸色 |
| `paper` / `paper-light` | #F5F0E8 | 页面背景（暖纸底） |
| `paper-medium` | #EDE4D3 | 分割线/装饰 |
| `paper-card` | #E8DCC6 | 卡片背景（暖笺） |
| `paper-dark` | #E0D5C0 | 边框/分割线 |
| `cinnabar` | #C62828 | 标准朱砂（旧，兼容） |
| `cinnabar-deeper` | #9C1A1C | 朱砂主色（新） |
| `cinnabar-deepest` | #7A1416 | 朱砂深色/hover |
| `ink-darkest` | #1A0F0A | 最深墨色（标题） |
| `ink` / `ink-dark` | #2C1810 | 正文墨色 |
| `ink-medium` | #6B5B4F | 辅助文字 |
| `ink-light` | #5E5045 | 次要文字 |
| `ink-faint` | #D4C5B0 | 极淡文字/装饰 |

## 品牌标识

### 名称
- **正式名**：玄·道（中间为间隔号 U+00B7）
- **英文/代码引用**：XuanDao

### Zhan 印（seal-icon）
- 朱砂红底（`cinnabar-deeper: #9C1A1C`），暖纸色字
- 轻微旋转（-5deg ~ -7deg），模拟手工盖印
- 带纹理叠加（repeating-linear-gradient 模拟印泥颗粒）
- 尺寸变体：`.seal-icon`（默认）、`.seal-icon--lg`（52px）、`.seal-icon--hero`（100px）

### 咒语副标题（hero-incant）
- 五行堆叠："玄天机 / 道命理 / 玄道在手 / 天地万物 / 皆可问之"
- 行间用小朱砂虚线分隔
- hover 时文字不透明度变化

## 组件规范

### 工具卡片（tool-card--new）
- 暖笺底色（`paper-card: #E8DCC6`）
- **符头顶线**：`::before` 伪元素，朱砂色重复虚线，hover 时左右延展
- **右下卦象**：每个工具分配唯一八卦符号
  - 八字☰ / 六爻☵ / 生肖☷ / 星座☲ / 紫微☴
- **朱砂印**：工具字符在 seal-icon 中显示，hover 旋转放大
- **标题**：hover 变朱砂色
- 悬停：上移 4px + 阴影增强 + 外发光

### 按钮
- **btn-cin**：朱砂实心按钮，双边框效果（`::before` 内框 + `::after` 外框模糊），hover 加深 + 上移
- **btn-ink**：墨色描边按钮，hover 加深边框 + 微背景

### 暖笺卡片（card-warm）
- 暖笺底色，带微弱内阴影边框
- `card-warm--elevated`：增强阴影
- 用于命盘预览、运势签、命簿卡片

### 登录卡片
- 暖笺卡片 + 四角卦象（☰☷☵☲）
- 顶部/底部符头顶线
- 号令/密令输入标签
- 入卷/立卷 btn-cin 按钮

### 装饰元素
- **talisman-line**：朱砂虚线，用于卡片顶部装饰
- **rule-boundary**：线装书天地界栏（上下重复虚线）
- **fish-tail**：线装书鱼尾装饰
- **corner-mark**：卦象角标
- **divider-seal**：带朱砂印的分割线
- **section-header**：朱砂短杠 + 标题

## 动画

- 入场：`.anim-rise`（opacity 0→1，translateY 20→0），延迟类 `.anim-delay-1` ~ `.anim-delay-5`
- 印章交互：scale + rotate 微变换
- 卡片 hover：translateY + shadow 过渡

## 页面状态

### 已实现
- [x] tailwind.config.ts 色板扩展
- [x] main.css 组件类（30+ 新类）
- [x] index.vue 未登录态（英雄区 + 工具卡片 + 命盘预览 + 运势签 + 命簿卡片 + 分割线 + footer）
- [x] index.vue 已登录态（问候语 + 工具网格）
- [x] login.vue（结缘立卷卡片 + 号令/密令 + 入卷按钮 + 四角卦象）
- [x] layouts/default.vue 品牌名更新

### 待办
- [ ] 各工具页面（bazi/shengxiao/constellation/yijing/ziwei）视觉适配
- [ ] 纸纹纹理（body::after SVG feTurbulence）确认

## 文件结构

```
assets/css/main.css          → 设计系统 CSS 组件类
tailwind.config.ts            → 设计令牌
docs/concepts/talisman-aesthetic.html  → 概念参考稿
```

`feat/design-system-rollout` 分支，渐进式添加，不影响旧样式。
