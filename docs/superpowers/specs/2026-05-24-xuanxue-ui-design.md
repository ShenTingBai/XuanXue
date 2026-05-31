# 玄学 Web 应用 — UI 设计文档

> **⚠️ 已废弃** — 品牌已升级为"玄·道"，本设计文档已被以下两份文档取代：
>
> - [`2026-05-31-xuandao-design-system.md`](2026-05-31-xuandao-design-system.md)（设计系统规范）
> - [`2026-05-24-xuanxue-interactive-web-design.md`](2026-05-24-xuanxue-interactive-web-design.md)（总设计文档）

## 概述

玄学 Web 应用的 UI 设计，覆盖 Phase 1 基础系统的全部页面：登录/注册、首页工具网格、档案编辑。

## 美学方向：墨韵 · Ink Resonance

> 传统文人书房美学 — 宣纸为底、墨汁为字、朱砂为印

| 维度 | 选择 | 理由 |
|------|------|------|
| 基调 | 暖白古纸 + 墨色文字 | 呼应传统典籍、书画卷轴质感 |
| 主色 | 朱砂红 `#C62828` | 中国传统印章色，高辨识度且文化关联强 |
| 辅色 | 金色 `#B8860B` / 翠绿 `#4A7C59` | 金为点缀（预留给星曜、五行），绿为状态反馈（成功） |
| 字体 | 马善政 Ma Shan Zheng（书法体）+ Noto Sans SC（正文） | 书法体用于标题营造文人气息，无衬线保证正文可读性 |
| 核心符号 | 印章（seal stamp） | 交互按钮模仿"盖印"动作，页面装饰烙朱砂印 |

### 设计原则

1. **质感优先** — 每张页面都有"纸张"的触感，避免纯平/纯色数字感
2. **文化符号节制使用** — 印章、书法仅用于关键节点（logo、按钮、分隔），不淹没内容
3. **克制的动效** — 入场淡入、盖印按压、下拉展开，服务于交互反馈而非炫技
4. **移动端不妥协** — 同一套设计语言完整适配手机，不做"桌面版缩小"

---

## 设计 Token

### Color

```
ink-darkest  #1A0F0A  — 最深墨色，极少使用
ink-dark     #2C1810  — 标题/主要文字
ink-medium   #6B5B4F  — 正文/次要文字、标签
ink-light    #A69586  — 占位符、禁用态
ink-faint    #D4C5B0  — 边框、分割线

paper-lightest  #FBF8F4  — 卡片背景、最浅纸色
paper-light     #F5F0E8  — 页面主背景
paper-medium    #EDE4D3  — 卡片悬浮态背景
paper-dark      #E0D5C0  — 卡片边框

cinnabar    #C62828  — 主色（朱砂红），用于按钮/激活态/焦点
cinnabar-dark  #8E1D1D  — hover 加深
cinnabar-light #E53935  — 极少数强调场景

gold        #B8860B  — 辅助色（未定用途，预留给星曜/五行）
jade        #4A7C59  — 成功反馈色

额外 Tailwind token（实现中定义，文档补充）：
- `paper-darker`  #D0C0A8  — 极少使用的深纸色
- `gold-light`    #D4A017  — 金色高亮
- `jade-light`    #5D8F6A  — 翠绿高亮
```

### Typography

| 用途 | 字体 | 字重 | 尺寸（移动端/桌面端） |
|------|------|------|-------------------|
| Logo（登录页） | Ma Shan Zheng | 400 | 2.25rem / 3rem (`text-4xl sm:text-5xl`) |
| Logo（顶栏） | Ma Shan Zheng | 400 | 1.5rem / 1.875rem (`text-2xl sm:text-3xl`) |
| 问候语 | Ma Shan Zheng | 400 | 1.875rem / 2.25rem (`text-3xl sm:text-4xl`) |
| 工具名称 | Ma Shan Zheng | 400 | 1.25rem (`text-xl`) |
| 正文/表单 | Noto Sans SC | 400/500 | 1rem |
| 辅助文字 | Noto Sans SC | 400 | 0.75rem-0.875rem |
| 徽章/标签 | Noto Sans SC | 400 | 0.625rem-0.75rem |
| 标签/按钮 | Noto Sans SC | 500 | 0.875rem-0.9375rem |

### Shadow

```
--shadow-card:      0 2px  12px rgba(44,24,16,0.06)  — 默认卡片
--shadow-elevated:  0 4px  24px rgba(44,24,16,0.10)  — 卡片hover
--shadow-dropdown:  0 8px  32px rgba(44,24,16,0.12)  — 下拉面板
```

影子使用墨色 (ink) 而非灰色或黑色，维持暖调统一。

### Border Radius

| 元素 | 值 |
|------|----|
| 登录/档案卡片 | 16px (`rounded-2xl`)，所有断点一致 |
| 工具卡片 | 12px (`rounded-xl`)，所有断点一致 |
| 按钮 | 0（直角，模仿印章方形） |
| 输入框 | 0（下划线式） |
| 徽章/标签 | 4px |

---

## 纸纹质感实现

全局覆盖一层 SVG feTurbulence 噪声纹理，`mix-blend-mode: multiply` 叠加在暖白背景上，模拟宣纸纤维颗粒感。

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 40;         /* 覆盖 .ink-wash-bg > .relative.z-10（含 header） */
  pointer-events: none;  /* 不干扰点击交互 */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200'...");
  mix-blend-mode: multiply;
  opacity: 0.3;
}
```

层叠上下文：页面内容包裹在 `<div class="relative z-10">` 中（z-index: 10，创建子层叠上下文），纸纹在 `body::after` 的 z-index: 40（根层叠上下文）。纸纹以 0.3 透明度 + multiply 混合模式覆盖整个页面（包括顶栏），产生全局宣纸质感。sticky header 在内容包装器内部 z-50，不影响纸纹覆盖。

墨晕背景使用多层 radial-gradient 径向渐变，模拟宣纸上墨汁自然晕染的效果：

```css
background:
  radial-gradient(ellipse 600px 400px at 15% 30%, rgba(44,24,16,0.04), transparent 70%),
  radial-gradient(ellipse 500px 500px at 85% 70%, rgba(44,24,16,0.03), transparent 70%),
  radial-gradient(circle 300px at 50% 50%, rgba(180,140,100,0.05), transparent 70%);  /* 暖调点缀 */
```

---

## 组件设计

### 印章按钮（btn-seal）

灵感：在宣纸上盖下朱砂印的动作。

| 状态 | 效果 |
|------|------|
| 默认 | 红色边框 + 红色文字，背景透明 |
| hover | 红色从右到左填充（`scaleX` 动画），文字变白 |
| active (click) | `sealPress` 缩放动画：scale(1) → 0.92 → 1.03 → 1 |
| focus-visible | 2px 红色轮廓 (`outline: 2px solid #C62828`) |
| disabled | 50% 透明度，无填充动画 |

```
默认:  ┌──────────┐
       │  登 录   │  红色描边，红字
       └──────────┘

hover: ┌██████████┐
       │  登 录   │  红色填充，白字（从右到左动画）
       └──────────┘
```

### 墨水下划线输入框（input-ink）

灵感：毛笔在宣纸上写字，留下墨迹底线。

| 状态 | 效果 |
|------|------|
| 默认 | 底部 2px `ink-faint` 灰线 |
| focus | 底部线过渡到 `cinnabar` 红色 |
| focus-visible | 2px 红色底部线 + 阴影 (`box-shadow: 0 1px 0 #C62828`) |
| placeholder | `ink-light` 灰字 |

输入框无边框、无圆角、无背景，只靠底线区分，保持页面清爽。

### 工具卡片（tool-card）

| 状态 | 效果 |
|------|------|
| 默认 | 浅纸色背景（`rgba(251,248,244,0.85)` + `backdrop-filter: blur(8px)` 毛玻璃），`paper-dark` 边框，微阴影 |
| hover（可用） | 边框变红，阴影加深，上移 3px |
| hover（锁定） | 无效果，保持 0.6 透明度 |

背景使用 85% 透明度 + `backdrop-filter: blur(8px)`，让背后的墨晕渐变隐约透出，产生宣纸半透明质感。

卡片包含：
- **图标区**：中文单字符（兽/辰/命/卦/斗）在方形底板中，使用毛笔书法风格
- **名称行**：书法体工具名 + "即将上线"灰底标签（锁定态）
- **描述行**：简短功能说明
- **装饰角**（可用态）：右上角 cinnabar/10 红色圆角三角形装饰，表示可点击

### 印章徽章（seal-mark）

小型朱砂印装饰元素：红色方框 + 旋转 -3deg + 中文单字。用于 logo 旁、标题旁作为视觉点缀。

### 下拉菜单（dropdown-panel）

右上角档案名下接菜单，包含"编辑档案"和"退出"两个菜单项。`backdrop-filter: blur(12px)` 毛玻璃效果，使用 `--shadow-dropdown` 阴影，带 `fade + translateY` 入场/出场过渡。关闭方式：点击菜单外区域、按 Escape 键、或将焦点移出菜单。

### 墨色下拉选择框（select-ink）

与 input-ink 同风格的 select 元素，适配底部下划线设计。

| 状态 | 效果 |
|------|------|
| 默认 | 底部 2px `ink-faint` 灰线，右侧自定义下拉箭头 SVG |
| focus | 底部线过渡到 `cinnabar` 红色 |
| focus-visible | 2px 红色底部线 + 阴影 (`box-shadow: 0 1px 0 #C62828`) |
| disabled | 50% 透明度 |

使用 `appearance: none` 移除原生样式，自定义箭头匹配整体美学。

### 墨色分隔线（divider-ink）

表单章节标题的分隔装饰：

```
  ──── 基本信息 ────
```

左右各一条渐隐横线，居中显示中文标题文字。使用 CSS `::before` / `::after` 伪元素实现，无额外 DOM 元素。

### 幽灵按钮（btn-ghost）

最小化样式的文字按钮，用于次要操作如"取消"。

| 状态 | 效果 |
|------|------|
| 默认 | `ink-medium` 灰色文字 |
| hover | 过渡到 `cinnabar` 红色 |
| focus-visible | 2px 红色轮廓 |

### 纸卡片（card-paper-solid）

表单和内容区域的容器卡片。

- 背景 `rgba(251, 248, 244, 0.95)` 暖白纸色
- 边框 `paper-dark`，`--shadow-card` 阴影
- 圆角 16px（`rounded-2xl`），所有断点一致

---

## 页面布局

### 登录页

```
┌─────────────────────────────────────┐
│         （墨晕渐变背景）              │
│                                     │
│          ┌─────────────┐            │
│          │  玄 学 [印]   │            │
│          │ 命理推演·知己知天│           │
│          │             │            │
│          │  登录 | 注册  │            │
│          │  ─────────  │            │
│          │  ▔▔▔▔▔▔▔▔▔▔│            │
│          │  昵称        │            │
│          │  ·········· │            │
│          │  PIN 码      │            │
│          │  ·········· │            │
│          │  ┌─────────┐│            │
│          │  │  登 录   ││            │
│          │  └─────────┘│            │
│          │  还没有档案？创建新档案  │
│          └─────────────┘            │
│                                     │
└─────────────────────────────────────┘
```

- 全屏居中卡片，卡片材质 `paper-lightest` 浅纸色
- 两个 tab（登录/注册）共用表单，切换时清空错误提示
- 注册模式和登录模式只有 tagline 不同（"命理推演·知己知天" / "结缘立卷·以窥天机"）

### 首页

```
┌─────────────────────────────────────┐
│ 玄学 [玄]                    林玄机 ▼│
├─────────────────────────────────────┤
│                                     │
│  你好，林玄机  [安]                  │
│  择一而探，洞见天机                   │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 兽    │ │ 辰    │ │ 命    │       │
│  │ 生肖   │ │ 星座   │ │ 八字   │       │
│  │ 即将.. │ │ 即将.. │ │ 即将.. │       │
│  └──────┘ └──────┘ └──────┘       │
│  ┌──────┐ ┌──────┐                │
│  │ 卦    │ │ 斗    │                │
│  │ 六爻   │ │ 紫微斗数│               │
│  │ 即将.. │ │ 即将.. │                │
│  └──────┘ └──────┘                │
│                                     │
└─────────────────────────────────────┘
```

- 顶栏：sticky，半透明毛玻璃效果
- 工具网格：3 列（≥1024px）→ 2 列（≥640px）→ 1 列（<640px）
- 入场动画：卡片逐张 `fadeIn`，每张间隔 100ms
- 右上角下拉菜单：编辑档案 + 退出

### 档案编辑页

```
┌─────────────────────────────────────┐
│ ← 返回首页                           │
│                                     │
│  编辑档案 [编]                       │
│  完善个人信息，解锁更多命理推演         │
│                                     │
│  ┌──────────────────────────┐      │
│  │ ──── 基本信息 ────       │      │
│  │ 昵称: [林玄机         ]  │      │
│  │ 性别: ○ 男  ● 女        │      │
│  │                          │      │
│  │ ──── 出生信息 ────       │      │
│  │ 日期: [1995-06-15] [阳历]│      │
│  │ 时辰: [丑时 01-02] [30分]│      │
│  │                          │      │
│  │ [保存]  取消             │      │
│  └──────────────────────────┘      │
└─────────────────────────────────────┘
```

- 昵称 readonly（灰色虚线底线 + 半透明）
- 性别自定义圆按钮（非原生 radio）
- 出生日期输入 + 阳历/农历选择器并排
- 时辰下拉 + 分钟输入并排，分钟可选填
- 保存成功显示翠绿色 toast，2.5s 后自动消失

---

## 响应式断点

| 断点 | 目标 | 布局变化 |
|------|------|---------|
| <640px | 手机 | 1 列工具网格，工具卡片 padding 24px（表单卡片保持 32px），标题字号降级，form-row 变列 |
| 640px+ | 平板及以上 | 工具卡片 padding 28px |
| 640-1024px | 平板 | 2 列工具网格，保持大多数字号 |
| ≥1024px | 桌面 | 3 列工具网格，内容区域 max-width: 1152px 居中（首页/布局使用）；表单页（如档案编辑）使用 `max-w-2xl`（672px）保持适中宽度 |

---

## 文件结构

```
assets/css/main.css       — 设计系统层（CSS变量、纹理、基础组件样式）
tailwind.config.ts         — Tailwind token 映射（色系、字体、阴影、圆角）
nuxt.config.ts             — 引入 main.css + Google Fonts preconnect
app.vue                    — Nuxt 根组件
layouts/default.vue        — TopBar 顶栏（Logo + 档案下拉菜单）
pages/login.vue            — 登录/注册页
pages/index.vue            — 首页工具网格
pages/profile/[id].vue     — 档案编辑页
```

---

## 动画 & 交互

| 元素 | 动画 | 触发 | 时长 |
|------|------|------|------|
| 工具卡片 | fadeIn + stagger | 页面加载 | 0.5s each, stagger 0.1s |
| 印章按钮 | sealPress (scale) | click | 0.4s |
| 印章按钮 | 填充 (scaleX) | hover | 0.35s |
| 工具卡片 | 上移 3px + 阴影加深 | hover | 0.35s |
| 下拉菜单 | opacity + translateY | toggle | 0.2s |
| 登录/注册 tab | 下划线滑动（CSS transition + translateX） | click | 0.2s |
| toast（成功/错误） | fade + translateY（偏移: -4px 登录页, -8px 配置页） | 出现/消失 | 0.3s |
| 输入框焦点 | border-color 过渡 | focus | 0.2s |

---

## 可访问性

| 措施 | 实现 |
|------|------|
| 视觉焦点 | 输入框用 `box-shadow` 下划线，按钮用 `outline: 2px solid #C62828` |
| 对比度 | 正文级文字使用 `ink-medium (#6B5B4F)`，符合 WCAG AA 4.5:1；`ink-light (#A69586)` 仅用于占位符（WCAG 豁免）和纯装饰元素 |
| 语言声明 | `<html lang="zh-CN">` |
| 表单标签 | 所有输入框通过 `for/id` 与 label 关联 |
| 自定义 radio | 使用 `sr-only` 保留原生 input 供屏幕阅读器，视觉用 span 替代 |
| ARIA | 错误提示 `role="alert"`，加载按钮 `aria-busy` |
| 动画控制 | `@media (prefers-reduced-motion: reduce)` 禁用动画 |
| 装饰元素 | 纯装饰字符（印章徽章）加 `aria-hidden="true"` |

## 组件状态清单

### btn-seal

- default / hover / active(click) / focus-visible / disabled（opacity: 0.5, no fill animation）/ loading（aria-busy, cursor: wait）

### input-ink

- default / focus / placeholder / disabled（opacity: 0.5, dashed border-bottom）
- Modifier: `input-ink--readonly`（半透明 + 虚线底线）

### select-ink

- default / focus（chevron turns cinnabar red）/ disabled（opacity: 0.5）

### tool-card

- default / hover（可用，border cinnabar + elevated shadow + translateY -3px）/ locked（opacity: 0.6, cursor: default, tabindex="-1"）/ focus-visible（outline: 2px cinnabar）/ active（scale: 0.98）

### btn-ghost

- default（ink-medium）/ hover（cinnabar）/ focus-visible（outline: 2px cinnabar）

### seal-mark（装饰元素）

- 默认旋转 -3deg，红色方框 + 中文单字
- 纯装饰，`aria-hidden="true"`
- 尺寸在各使用处通过 Tailwind utility 覆盖（w-7/h-7/text-[9px] 等）

### card-paper-solid

- 默认：rgba(251,248,244,0.95) 背景，paper-dark 边框，shadow-card 阴影
- 圆角 16px（rounded-2xl），通过 Tailwind 类在各页面应用

### divider-ink

- 默认：flex 居中标题 + ::before/::after 渐隐横线
- 文字色 ink-medium，横线 ink-faint 渐隐

## 未定事项

- **星座"今日运势"**：设计已留好星座卡片位置，但"今日运势"需要确定是纯函数（基于日期计算）还是占位展示
- **工具上线的视觉区分**：Phase 2 激活生肖/星座后，可用卡片需增加互动提示（如箭头指示可点击），目前锁定态和可用态差异较小
- **Loading skeleton**：当前页面内容简单未实现 skeleton，Phase 2 数据加载场景（如星座运势）可能需要
