# 墨韵 · Ink Resonance — 设计系统

> 状态：Active — 墨韵视觉语言与基础样式规范
>
> 版本：1.2.2 | 最后更新：2026-09-06
>
> XuanXue（玄·道）前端设计规范。本文负责颜色、字体、空间、组件外观和响应式视觉约束；产品行为、内容真实性、数据生命周期与公开状态以 [产品规范索引](product/README.md) 及其引用规范为准。
>
> 新增组件前先查阅，避免凭感觉做设计。当前代码仍含待整改旧组件，记录在本文不表示允许继续公开使用。

---

## 1. 设计理念

**墨韵**：传统中式书房美学。墨色纸纹为底，朱砂印章为眼，金玉点缀其间。

- **气质**：素雅沉静，不张扬。留白即是装饰。
- **配色原则**：墨/纸 7 阶灰度占画面 90%，朱砂占 5%，金/玉占 5%。
- **字体原则**：展示标题用书法（Ma Shan Zheng），正文用无衬线（Noto Sans SC）。不要引入第三种字体。

---

## 2. 色彩系统

### 2.1 墨（Ink）— 文字色阶

| Token         | 色值      | 用途                         |
| ------------- | --------- | ---------------------------- |
| `ink-darkest` | `#1A0F0A` | 极少用                       |
| `ink-dark`    | `#1E1210` | **标题色**、重要文字         |
| `ink`         | `#2C1810` | 正文强调                     |
| `ink-medium`  | `#6B5B4F` | **正文色**（最低对比度要求） |
| `ink-muted`   | `#4D4037` | 辅助信息                     |
| `ink-light`   | `#5E5045` | 标签、占位符                 |
| `ink-faint`   | `#D4C5B0` | 分割线、边框、装饰           |

**规则**：

- 正文文字 **禁止** 使用 `ink-light` 或更低对比度。正文最低为 `ink-medium`。
- 辅助文字/标签最低为 `ink-light`（`0.6875rem` 以上）或 `ink-medium`（`0.6875rem` 以下）。
- Tailwind 类名：`text-ink-dark`、`text-ink`、`text-ink-medium`、`text-ink-light`、`text-ink-faint`。

### 2.2 纸（Paper）— 背景色阶

| Token            | 色值      | 用途                      |
| ---------------- | --------- | ------------------------- |
| `paper-lightest` | `#FBF8F4` | 全页底色                  |
| `paper-light`    | `#F5F0E8` | 浅底卡片                  |
| `paper-medium`   | `#EDE4D3` | hover 态背景              |
| `paper-card`     | `#E8DCC6` | **卡片底色**（card-warm） |
| `paper-dark`     | `#E0D5C0` | 卡片边框                  |
| `paper-darker`   | `#D0C0A8` | 极少用                    |

### 2.2b 卷（Scroll）— 符纸/佛堂底色

用于敕令灵符、本命佛等特殊区块，比纸色阶更暖，模拟古卷/符纸质感：

| Token          | 色值      | 用途     |
| -------------- | --------- | -------- |
| `scroll-light` | `#FDF6E3` | 卷纸浅端 |
| `scroll`       | `#F9EDD4` | 卷纸中段 |
| `scroll-dark`  | `#F5E5C8` | 卷纸深端 |

- 三色用于 `linear-gradient` 渐变，不单独使用
- CSS 变量：`--color-scroll-light`、`--color-scroll`、`--color-scroll-dark`

### 2.3 朱砂（Cinnabar）— 强调色

| Token              | 色值      | 用途                                 |
| ------------------ | --------- | ------------------------------------ |
| `cinnabar`         | `#C62828` | **主强调色**：链接、选中态、重要徽章 |
| `cinnabar-light`   | `#E53935` | hover 高亮                           |
| `cinnabar-dark`    | `#8E1D1D` | 深色点缀                             |
| `cinnabar-deeper`  | `#9C1A1C` | btn-cin 背景                         |
| `cinnabar-deepest` | `#7A1416` | btn-cin hover 背景                   |

**规则**：

- 朱砂是**唯一**的暖色强调。不要引入橙色、粉色等其他暖色。
- `bg-cinnabar/10` 是最常用的浅底强调（选中态、标签背景）。

### 2.4 金（Gold）& 玉（Jade）— 点缀色

| Token        | 色值      | 用途                  |
| ------------ | --------- | --------------------- |
| `gold`       | `#7A5E12` | 中评/中性徽章、MC 线  |
| `gold-light` | `#9A7818` | 亮金色                |
| `jade`       | `#3D6B4B` | 好评/吉徽章、和谐相位 |
| `jade-light` | `#4D7A5A` | 亮玉色                |

### 2.5 五行色

| 元素 | 色值      | Tailwind       |
| ---- | --------- | -------------- |
| 木   | `#3D6B4B` | `wuxing-wood`  |
| 火   | `#C62828` | `wuxing-fire`  |
| 土   | `#7A5E12` | `wuxing-earth` |
| 金   | `#5E5E5E` | `wuxing-metal` |
| 水   | `#2C5F7C` | `wuxing-water` |

回退色：`#6B5B4F`（来自 `WUXING_FALLBACK_COLOR` 常量）。

### 2.6 颜色处理硬规：`color-mix()` 替代 opacity/rgba

**禁止**使用以下方式处理颜色：

| ❌ 禁止                   | ✅ 正确                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `rgba(198, 40, 40, 0.08)` | `color-mix(in srgb, var(--color-cinnabar) 8%, transparent)`                          |
| `bg-cinnabar/10`          | scoped CSS: `background: color-mix(in srgb, var(--color-cinnabar) 10%, transparent)` |
| `opacity-60` 降低文字     | `text-ink-medium` 或 `color-mix(in srgb, var(--color-ink) 60%, transparent)`         |
| `text-cinnabar/80`        | `text-cinnabar`（全饱和度）或 scoped CSS color-mix                                   |

**原因**：

- Tailwind 的 `bg-color/opacity` 用 CSS `opacity` 属性实现，会同时影响文字和子元素
- `color-mix()` 只降低颜色饱和度，不影响元素整体透明度
- 在多层叠加卡片（Ink Resonance 的核心视觉特征）中，`opacity` 会导致叠加区域颜色失真

**适用范围**：所有背景色、边框色、阴影色。文字色仅在不适合用现有 ink token 时使用 color-mix。

---

## 3. 字体系统

### 3.1 字体族

| Token          | 字体                                        | 用途                                 |
| -------------- | ------------------------------------------- | ------------------------------------ |
| `font-display` | Ma Shan Zheng → STKaiti → KaiTi → cursive   | **页面标题、section 标题、大字数据** |
| `font-sans`    | Noto Sans SC → PingFang SC → … → sans-serif | **正文、标签、按钮、表单**           |

**规则**：

- `font-display` 只用于**标题**和**数据展示**（h1、h2、大数字）。不用在段落文本。
- `font-sans` 用于所有其他文字。
- 正文最小字号：`text-sm`（0.875rem）。**禁止** `text-xs` 做正文。
- 辅助文字/脚注最小：`text-xs`（0.75rem），颜色最低 `ink-medium`。
- 超小标签（徽章内、角标）：`0.6875rem` 为硬底线，且必须在高对比度背景上。

**例外：数据可视化标签**。以下场景可使用 `0.6rem`（仅限单字/双字标签，且必须有独立的颜色+形状编码作为备用传达手段）：

| 场景                         | 字号   | 理由                                                                                               |
| ---------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| 紫微星曜分布图标签（SVG 内） | 0.6rem | SVG 坐标空间紧凑，文字过多无法容纳；每个星曜同时有颜色（`StarColorClass`）和形状（SVG 圆）双重编码 |
| 八字排盘表地支小字           | 0.6rem | 表格式数据展示，每格空间有限；信息同时以颜色（五行色）和文字（天干地支）双重传达                   |

- 数据可视化例外**仅限**不能合理缩放的小型 SVG/Canvas 图表或高密度表格
- 例外使用**必须**在本节的表中注册（场景 + 字号 + 理由），否则视为违规
- 仍禁止用 `opacity` 降低对比度——即使在小字号下也必须使用 `ink-medium` 或以上色阶

### 3.2 字阶参考

| 类名               | 大小      | 用途                                |
| ------------------ | --------- | ----------------------------------- |
| `text-5xl`         | 3rem      | Hero 大符号（星座 ♈、生肖 🐀）     |
| `text-4xl`         | 2.25rem   | 页面主标题                          |
| `text-3xl`         | 1.875rem  | Hero 标题                           |
| `text-2xl`         | 1.5rem    | Logo                                |
| `text-xl`          | 1.25rem   | Section 标题（`section-header h2`） |
| `text-base`        | 1rem      | 正文（较少用，多用 text-sm）        |
| `text-sm`          | 0.875rem  | **正文默认值**                      |
| `text-xs`          | 0.75rem   | 标签、辅助信息、脚注                |
| `text-[0.72rem]`   | 0.72rem   | 紧凑标签（需在 ink-medium 级别）    |
| `text-[0.6875rem]` | 0.6875rem | 绝对最小（徽章内文字）              |

---

## 4. 组件库

### 4.1 按钮

#### `btn-cin` — 主按钮

```
<button class="btn-cin"><span>按钮文字</span></button>
```

- 朱砂深红底 + 白字 + 双层边框效果
- hover: 更深底 + 上浮 2px
- active: 缩至 96%
- disabled: 50% 透明度
- **必须内嵌 `<span>` 子元素**（不能用纯文本）
- 适用：主要操作（登录、提交、刷新、展开/收起）

#### `btn-seal` — 印章按钮

```
<button class="btn-seal"><span>按钮文字</span></button>
```

- 朱砂描边 + 透明底，hover 填充
- 适用：对应产品契约允许的主要操作（例如“生成结果”）
- **禁止前缀字符**：`<span>` 内只放纯文字，不放 "⟲"、">" 等前缀。重新操作的按钮使用准确的动作文字，不以装饰符号代替标签

#### `btn-ghost` — 幽灵按钮

```
<button class="btn-ghost">返回首页</button>
```

- 无背景无边框，ink-medium 文字
- hover: cinnabar 文字
- active: 缩至 97%
- focus-visible: 2px cinnabar outline

#### `btn-ink` — 墨线按钮

```
<button class="btn-ink">浏览工具目录</button>
<NuxtLink to="/path" class="btn-ink no-underline">已有档案</NuxtLink>
```

- 透明底 + 1px 极淡墨色边框 `rgba(44,26,14,0.06)`
- 闲置：`ink-medium` 文字，`px-14 py-3.5` 内边距
- hover：文字变 `ink`，边框加深至 `rgba(44,26,14,0.15)`，上浮 2px
- 适用：次要 CTA、页面内导航链接（作为 `<button>` 或 `<NuxtLink>`）

#### `marginal-toggle` — 眉批折叠按钮

```
<button
  :aria-expanded="expanded"
  aria-controls="content-id"
  @click="expanded = !expanded"
  class="marginal-toggle"
>
  <span class="marginal-toggle__rule" aria-hidden="true"></span>
  <span>{{ expanded ? '收起' : '展开' }}</span>
  <span class="marginal-toggle__arrow" aria-hidden="true">▼</span>
</button>
```

- 细墨线 + 小字，仿古书页边批注风格
- 闲置：ink-light 文字 + ink-faint 细线，低调不打扰
- hover：文字和细线同时染朱砂，线从 0.875rem 伸长至 1.125rem
- 展开后：箭头 ▼ 纯 CSS 旋转 180° 变为 ▲（由 `[aria-expanded="true"]` 选择器驱动）
- focus-visible: 2px cinnabar outline
- **适用**：所有可折叠区域的展开/收起切换。**禁止**用 `btn-cin` 做折叠切换。

#### 折叠/展开标准模式

所有可折叠区域**必须**使用此模式：

```html
<div class="card-warm rounded-xl p-6 sm:p-8">
  <div class="flex items-center justify-between mb-4">
    <h2 class="font-display text-xl text-ink-dark">区块标题</h2>
    <button
      :aria-expanded="expanded"
      :aria-controls="contentId"
      @click="expanded = !expanded"
      @keydown.enter="expanded = !expanded"
      @keydown.space.prevent="expanded = !expanded"
      class="marginal-toggle"
    >
      <span class="marginal-toggle__rule" aria-hidden="true"></span>
      <span>{{ expanded ? '收起' : '展开' }}</span>
      <span class="marginal-toggle__arrow" aria-hidden="true">▼</span>
    </button>
  </div>
  <Transition name="expand">
    <div v-if="expanded" :id="contentId">
      <!-- 内容 -->
    </div>
  </Transition>
</div>
```

**Transition CSS**（必须有，放在组件 `<style scoped>` 中）：

```css
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 2000px;
  opacity: 1;
}
```

### 4.2 卡片

#### `card-warm` — 暖纸卡（默认卡片）

```
<div class="card-warm rounded-xl p-6 sm:p-8">...</div>
```

- 底色 `paper-card`（#E8DCC6），微弱内阴影
- 标准内边距为 `p-6 sm:p-8`：窄屏 24px，`sm` 起 32px；高密度或特殊卡片需要更小间距时必须由对应页面验收说明
- 适用：结果区域、信息面板、90% 的卡片场景

#### `card-paper-solid` — 浅纸卡

```
<div class="card-paper-solid p-6 sm:p-8">...</div>
```

- 底色 `paper-lightest`，有边框和 card 阴影
- 适用：表单容器

#### `card-warm--elevated` — 暖纸卡（悬浮态）

在 `card-warm` 基础上叠加更明显的阴影，用于需要从页面中"抬起"的卡片：

```
<div class="card-warm card-warm--elevated p-6 sm:p-8">...</div>
```

- 额外阴影：`0 4px 24px rgba(44,26,14,0.04)` + inset 边框
- 适用：首页命盘预览、需要视觉突出的展示卡片

#### `tool-card--new` — 工具选择卡

首页工具入口卡片，仿古书扉页风格：

```
<NuxtLink :to="tool.route" class="tool-card--new">
  <span class="tool-card__trigram" aria-hidden="true">☰</span>
  <span class="seal-icon seal-icon--lg">命</span>
  <div class="tool-card__name">八字</div>
  <p>了解你的先天命格、性格特质和人生大运</p>
</NuxtLink>
```

- `paper-card` 底色，`text-center`，`pt-12 pb-9 px-4`
- 顶部装饰线：`::before` 伪元素，朱砂虚线（hover 时线伸长 + 颜色加深）
- 卦象角标 `.tool-card__trigram`：绝对定位右下角，极淡 `rgba(44,26,14,0.012)`，hover 染朱砂
- 印章 `.seal-icon`：hover 旋转 -2° + 放大 1.08x + 底色变 `cinnabar-deeper`
- 卡片名 `.tool-card__name`：hover 变 `cinnabar-deeper`
- hover：卡片上浮 4px，多层阴影（inset + 外阴影 + 朱砂光环）
- 锁定态：`opacity-50 cursor-default`，印章变 `ink-light` 灰底

#### `cezi-slip` — 测字符纸卡片

用于测字结果展示，模拟古旧符纸/卷轴质感的专用卡片：

```html
<div class="cezi-slip">
  <!-- 内容 -->
</div>
```

- 背景：`linear-gradient(175deg, var(--color-scroll-light), var(--color-scroll), var(--color-scroll-dark))`
- 使用 scroll-\* 色阶（比 paper 更暖），三色渐变模拟古卷光泽
- 内边距 `p-6 sm:p-8`（因卡片本身有文字篇幅需求）
- 定义在 `pages/tools/cezi.vue` `<style scoped>` 中
- 适用：测字结果展示。**不**作为通用卡片——其他页面用 `card-warm`

#### `score-banner` — 旧分数横幅（公开产品禁用）

该模式是现有姓名测试、合婚等页面的待整改遗留资产，不再作为新页面或公开结果的设计模式。以下代码只用于识别旧实现，不构成复用示例：

```html
<div class="score-banner">
  <div class="score-banner__left">
    <div class="score-banner__grade">大吉</div>
    <div class="score-banner__name">{{ fullName }}</div>
  </div>
  <div class="score-banner__center">
    <ScoreRing :score="totalScore" :size="64" />
  </div>
  <div class="score-banner__right">
    <p class="score-banner__summary">{{ summary }}</p>
  </div>
</div>
```

- 左侧朱砂竖线 `border-l-[3px] border-l-cinnabar` 标注重点
- 三栏 flex 布局：评级+名称 / 环形图 / 摘要
- 使用 `color-mix(in srgb, var(--color-cinnabar) 5%, transparent)` 浅底
- 定义在 `pages/tools/name-test.vue` `<style scoped>` 中
- 处置：不得用于用户可见的运势、人格、关系或吉凶评分；对应工具完成契约后按批准的信息结构退出或改造

#### `border-left` 朱砂强调卡片

不需要完整 `score-banner` 时的轻量强调模式：

```html
<div
  class="card-warm rounded-xl p-8 border-l-[3px] border-l-cinnabar"
  :style="{ background: `color-mix(in srgb, var(--color-cinnabar) 5%, var(--color-paper-card))` }"
>
  <!-- 内容 -->
</div>
```

- 左侧 3px 朱砂竖线 + 5% 朱砂 tint 底色
- 适用：合婚综论卡片、主结论卡片
- 注意：必须在 `<style>` 中用 `color-mix()` 做背景，不能用 Tailwind 的 `bg-cinnabar/5`（违反 color-mix 规则）

#### `wuxing-card` — 五行属性卡

```
<div class="wuxing-card wuxing-card--fire">...</div>
```

- 半透明白底 + 彩色边框
- 修饰符：`--wood`、`--fire`、`--earth`、`--metal`、`--water`、`--air`
- `--air` 用于西方四元素中的「风象」，使用 `jade-light` 边框色以区别于五行「木」
- 适用：属性 grids（五行、元素、守护星等 2×2 或 4 列网格）

#### 属性卡脚注模式

`wuxing-card` 网格下方的脚注说明，用于补充四张卡片无法承载的上下文：

```html
<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
  <div class="wuxing-card wuxing-card--fire">...</div>
  <!-- ... -->
</div>
<p class="mt-3 font-sans text-xs text-ink-medium leading-relaxed">
  说明文本，关键词用 <span class="text-cinnabar font-medium">朱砂加粗</span> 突出。
</p>
```

- 使用场景：星座元素说明、生肖纳音说明——原本是卡片内可点击展开，改为静态脚注以保持四卡一致
- 卡片**禁止**只让其中一张可交互——要么全可展开，要么全静态

#### 西方四元素徽章

星座页面使用的四元素色彩体系，独立于五行（wuxing-\*）：

| 元素 | Tailwind                                                     | 说明     |
| ---- | ------------------------------------------------------------ | -------- |
| 火   | `border-cinnabar/30 text-cinnabar bg-cinnabar/5`             | 炽热本能 |
| 土   | `border-gold/30 text-gold bg-gold/5`                         | 稳固包容 |
| 风   | `border-jade/30 text-jade bg-jade/5`                         | 灵动流通 |
| 水   | `border-wuxing-water/30 text-wuxing-water bg-wuxing-water/5` | 深邃情感 |

- 使用 Ink Resonance 现有令牌，**不**引入新色值
- 与五行（木火土金水）使用不同的 Tailwind 类名，避免概念混淆

#### `talisman-card` — 旧“今日玄机”视觉卡（语义待替换）

Used on homepage (index.vue) for "今日玄机". A warm cream card with cinnabar-tinted border, designed to display lunar calendar data.

该条目只记录当前代码中的视觉资产，不批准继续使用“今日玄机”语义或旧日期规则。目标首页可以在通过移动端验收后复用其纸张、边框和自然文档流特征，但内容必须改为《首页与每日内容产品契约》规定的“今日事实”，且不得加入黄历宜忌或个人运势。

```html
<div class="talisman-card h-full flex items-center justify-center" aria-label="今日黄历">
  <div class="flex flex-col items-center w-full">
    <!-- slip-hd header bar -->
    <!-- slip-divider-h divider -->
    <!-- lunar date + ganzhi content -->
  </div>
</div>
```

- Background: `#faf0e0` (CSS rule in page `<style scoped>`)
- Border: `1px solid rgba(198, 40, 40, 0.08)`
- Padding: `1.75rem 1.5rem` (mobile) / `2rem` (sm+)
- Internal layout: `flex items-center justify-center` — entire content block vertically and horizontally centered
- Content pattern: single inner `<div class="flex flex-col items-center w-full">` holding header → divider → date body in natural top-down flow
- NO `flex-1` or `justify-center` on individual children — avoids overflow bugs
- Defined in `pages/index.vue` `<style scoped>`

#### `daily-wuxing-card` — 旧每日穿衣卡片（第一版退出）

Compact clothing color guide widget on homepage. Shows lucky colors to wear for the day.

该模式只用于识别当前待整改实现。第一版首页删除“今日穿衣”；不得复用其宜着、避、幸运色或五行行动建议。未来如讨论节气配色，只能按独立产品契约作为审美文化材料重新设计。

```html
<div class="daily-wuxing-card shrink-0">
  <div class="slip-hd slip-hd--sm mb-2">
    <span class="slip-chop slip-chop--sm" aria-hidden="true">衣</span>
    <span class="slip-ttl slip-ttl--sm">今 日 穿 衣</span>
  </div>
  <div class="daily-wuxing-colors">
    <span class="daily-wuxing-label">宜着</span>
    <span v-for="color in luckyColors" :key="color" class="daily-wuxing-pill">{{ color }}</span>
    <span class="daily-wuxing-sep">·</span>
    <span class="daily-wuxing-avoid">避 {{ avoidColors }}</span>
  </div>
</div>
```

- Background: `color-mix(in oklch, var(--color-paper-card) 60%, transparent)`
- Border: `1px solid color-mix(in oklch, var(--color-ink-darkest) 6%, transparent)`
- Border radius: `0.5rem`, Padding: `0.625rem 0.875rem`
- `.daily-wuxing-label`: `text-ink-light`, `flex-shrink-0`, font-size 0.6875rem
- `.daily-wuxing-pill`: cinnabar-tinted pill badges (`rounded-full`, 0.6875rem)
- `.daily-wuxing-avoid`: `text-ink-light` for avoid colors
- Defined in `pages/index.vue` `<style scoped>`

#### `gu-slip` — 符纸叙事卷

当前梅花旧页面用此纸张渐变卡承载“白话解读”。这里只保留视觉资产记录，不批准继续输出综合解卦或未来预测。目标内容遵守[梅花易数·起卦演示契约](product/meihua-tool-contract.md)：默认展示推导过程，本卦与变卦窄屏纵向排列，原文和项目解释分层，互卦/体用为次级展开资料，来源进入正常阅读流。现有 UI 尚未按此整改。

```html
<div class="gu-slip" aria-label="白话解读">
  <!-- Trigram header ☰/☷ -->
  <!-- Divider -->
  <!-- Content sections (本卦/动爻/综合解卦) -->
  <!-- Divider -->
  <!-- Footer seal -->
</div>
```

- Background: `linear-gradient(175deg, #fdf6e3, #f9edd4, #f5e5c8)` using scroll-\* tokens (see §2.2b)
- Uses scroll-light/scroll/scroll-dark color stops
- Structure: 3 content sections with labeled headings, separated by dividers
- Footer: small seal/mark
- Defined in `pages/tools/meihua.vue` `<style scoped>`

### 4.3 表单

#### `input-ink` — 墨线输入框

```
<input class="input-ink" />
```

- 透明底 + 2px 底边（ink-faint）
- focus: 底边变 cinnabar
- disabled: 50% 透明 + 虚线底边

#### `select-ink` — 墨线下拉

```
<select class="select-ink">...</select>
```

- 与 input-ink 同风格，自定义箭头 SVG

#### `input-warm` — 暖纸输入框

```
<input class="input-warm" />
```

- 有底色、有边框，偏暖色调
- 适用：表单中的独立输入框

### 4.4 排版

#### `section-header` — 分区标题

**独立使用**（全宽朱丝栏横线）：

```html
<div class="section-header">
  <h2>分区标题</h2>
</div>
```

- 顶线（1px 朱砂淡线 `::before left:0; right:0`）+ 底部小朱砂圆点装饰
- h2 字体：`font-display text-xl`
- 适用：卡片内的独立分区标题

旧版“与 MethodologyNote 并排”模式退出公开产品。分区标题保持独立使用；已经核验的规则、来源和边界放入页面正常阅读流中的“依据与范围”，不再压缩到标题行、浮层或弹窗。

#### `divider-ink` — 墨韵分割线

通过 `InkDivider` 组件使用：

```html
<InkDivider>文字</InkDivider>
```

待迁移到组件使用后：`<div class="divider-ink"><span>文字</span></div>`

#### `divider-seal` — 印章分割线

```html
<div class="divider-seal">
  <span class="divider-seal__line" aria-hidden="true" />
  <span class="seal-icon" aria-hidden="true">玄</span>
  <span class="divider-seal__word">玄·道</span>
  <span class="seal-icon" aria-hidden="true">道</span>
  <span class="divider-seal__line" aria-hidden="true" />
</div>
```

- flex 布局，`gap-4.5`
- `.divider-seal__line`：flex-1 墨线，朱砂虚线渐变（`repeating-linear-gradient`）
- `.divider-seal__word`：`0.9375rem`，极淡墨色 `rgba(44,26,14,0.10)`，宽字距 `0.4em`
- 可在文字两侧插入 `seal-icon` 印章装饰
- 适用：首页大区块分隔、页面底部收束

### 4.5 反馈

#### `toast-notification` — 通知条

```html
<div class="toast-notification" role="alert">
  <span class="toast-notification__mark">!</span>
  <span class="toast-notification__text">消息文本</span>
  <button class="toast-notification__close">&times;</button>
</div>
```

- 固定顶部，z-index 60
- 左侧朱砂竖条 + 圆形感叹号
- 用 Vue `<Transition name="toast">` 包裹

#### `fortune-bar` — 旧运势进度条（公开产品禁用）

```html
<div
  class="fortune-bar"
  role="progressbar"
  aria-valuenow="60"
  aria-valuemin="0"
  aria-valuemax="100"
>
  <div class="fortune-bar__fill fortune-bar__fill--good" :style="{ width: '60%' }" />
</div>
```

- `--great`（≥75，玉色）、`--good`（≥60，金色）、`--normal`（≥45，墨中）、`--low`（<45，朱砂）
- 该样式与 `FortuneBars` 组件只用于识别待整改旧代码，不得继续表达用户可见的运势、人格、关系或吉凶分数

### 4.6 装饰

#### `seal-mark` — 印章角标

```html
<span class="seal-mark">吉</span>
```

20×20px，朱砂边框，书法字体，微旋转。用于列表项角标。

#### `seal-icon` — 圆形印章

```html
<span class="seal-icon">命</span>
```

32px 圆，深朱砂底 + 纸色字 + 纹理叠加。有大号 `--lg`（56px）和 `--hero`（100px）变体。

#### `slip-hd` — 命签/灵符标题栏

The shared header bar pattern used in DailyFortuneStick ("今日命签") and 今日玄机 ("今日玄机"). A visual language for talisman/slip headers.

以下示例记录当前视觉实现，不批准“今日命签”“今日玄机”继续作为第一版首页内容。印章、细线和排版语言可以复用；吉凶徽章、自动命签及旧内容语义按《首页与每日内容产品契约》退出。

```html
<div class="slip-hd w-full">
  <span class="slip-chop" aria-hidden="true">玄</span>
  <span class="slip-ttl">今 日 玄 机</span>
  <span class="slip-date-inline">6月7日 · 周日</span>
  <span class="slip-fortune slip-fortune--吉">芒种</span>
</div>
```

**Sub-elements:**

| Class              | Element  | Description                                                                                                                                                         |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slip-chop`        | `<span>` | Small cinnabar seal (1.125rem) with display font character, rotated -3°                                                                                             |
| `slip-ttl`         | `<span>` | Title in display font (0.8125rem), letter-spacing 0.2em, `margin-right: auto` pushes subsequent elements right                                                      |
| `slip-fortune`     | `<span>` | Fortune badge (0.6rem), rotated -0.5°. Variants: `--吉` (neutral ink), `--上吉` (wood/green), `--中吉` (earth/gold), `--下吉` (fire/red muted), `--下下` (fire/red) |
| `slip-number`      | `<span>` | Optional number tag (0.55rem, ink-light, 55% opacity)                                                                                                               |
| `slip-date-inline` | `<span>` | Optional inline date text (font-sans, 0.65rem, ink-light, 70% opacity). Rides between ttl and fortune badge                                                         |

**Small variant (`slip-hd--sm`):**

- `slip-chop--sm`: 20×20px, font-size 10px
- `slip-ttl--sm`: 0.75rem

**Tall variant (`slip-hd--tall`):**

- `slip-ttl--tall`: 0.75rem, letter-spacing 0.25em, 70% opacity
- No bottom margin

**CSS source:** Defined in both `components/home/DailyFortuneStick.vue` and `pages/index.vue` `<style scoped>`. The pattern is duplicated (not extracted as a shared component) because each usage context has slightly different needs.

#### `slip-divider-h` — 签文水平分割线

Horizontal divider with gradient fade on both ends and a centered dot.

```html
<div class="slip-divider-h w-full" aria-hidden="true">
  <span class="slip-divider-h__dot" />
</div>
```

- Flex row, `::before` and `::after` pseudo-elements create 1px gradient lines
- Line color: `rgba(44, 26, 14, 0.12)` fading to transparent at edges
- Center dot: 3px circle, `rgba(198, 40, 40, 0.35)`
- Vertical margin: 0.5rem on each side
- `flex-shrink: 0` — never collapses
- Used in DailyFortuneStick (tall mode, 2 instances) and 今日玄机 talisman-card
- CSS source: duplicated in both `DailyFortuneStick.vue` and `index.vue` `<style scoped>`

### 4.7 工具页通用组件

| 组件                      | 路径                                           | 用途                                           |
| ------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `ToolPageLayout`          | `components/tools/ToolPageLayout.vue`          | 三栏布局（#nav / #mobile-nav / #nav-right）    |
| `ToolToolbar`             | `components/tools/ToolToolbar.vue`             | 顶部工具栏（历史 + 导出）                      |
| `ExportButton`            | `components/tools/ExportButton.vue`            | 导出图片按钮                                   |
| `HistoryModal`            | `components/tools/HistoryModal.vue`            | 历史记录弹窗                                   |
| `ScrollTopButton`         | `components/tools/ScrollTopButton.vue`         | 回到顶部                                       |
| `EntertainmentDisclaimer` | `components/tools/EntertainmentDisclaimer.vue` | 娱乐免责声明                                   |
| `FortuneBars`             | `components/tools/FortuneBars.vue`             | 旧运势评分展示；公开产品禁用，等待对应工具整改 |
| `ScoreRing`               | `components/tools/ScoreRing.vue`               | 旧评分环；公开产品禁用，等待对应工具整改       |
| `SkeletonCard`            | `components/tools/SkeletonCard.vue`            | 骨架屏卡片                                     |
| `SkeletonBars`            | `components/tools/SkeletonBars.vue`            | 骨架屏柱状图                                   |
| `InkDivider`              | `components/tools/InkDivider.vue`              | 墨韵分割线                                     |
| `AvatarCircle`            | `components/tools/AvatarCircle.vue`            | 头像圈                                         |
| `PageFooter`              | `components/tools/PageFooter.vue`              | 页面底部 colophon                              |
| `ProfileAutoFillBanner`   | `components/tools/ProfileAutoFillBanner.vue`   | 档案自动填充横幅                               |
| `PageHero`                | `components/tools/PageHero.vue`                | 页面标题区                                     |
| `MethodologyNote`         | `components/tools/MethodologyNote.vue`         | 旧悬浮“注”面板；退出公开产品                   |

#### `MethodologyNote` — 方法论溯源面板

该组件因固定最小宽度、展开裁剪、键盘关闭路径和未核验来源展示问题，已经由 P1 决策退出公开产品：

- 不通过 CSS 修补、信息图标、抽屉或弹窗恢复；
- 不要求新工具页引用；
- 现有引用只作为待整改代码保留，不能成为新实现范例；
- 已核验来源、项目规则和限制使用页面正常阅读流中的“依据与范围”；
- 未核验来源不因移入普通页面而获得公开资格。

### 4.8 导航

#### `nav-link` — 桌面导航链接

```html
<nav aria-label="命理工具导航">
  <NuxtLink
    v-for="item in tools"
    :to="item.route"
    :class="['nav-link', { 'nav-link--active': isActive }]"
    :aria-current="isActive ? 'page' : undefined"
  >
    <span>{{ item.name }}</span>
  </NuxtLink>
</nav>
```

- 定义在 `assets/css/main.css`，`@apply` Tailwind 类
- 闲置：`ink-medium` 文字，透明底，`rounded-lg`，`px-2.5 py-2`
- hover：文字变 `cinnabar`，浅朱砂底 `rgba(198,40,40,0.05)`
- active：缩至 97%
- **`nav-link--active`**：文字 `cinnabar`，底 `rgba(198,40,40,0.08)`
- **`nav-link--locked`**：50% 透明度，`pointer-events: none`，`cursor: default`
- 激活态**必须**同时使用 `:aria-current="'page'"`，不能仅靠 CSS 类

#### `mobile-nav-item` — 移动端抽屉导航项

```html
<NuxtLink
  :to="item.route"
  :class="['mobile-nav-item', { 'mobile-nav-item--active': isActive }]"
  :aria-current="isActive ? 'page' : undefined"
  @click="closeDrawer"
>
  <span>{{ item.name }}</span>
  <svg><!-- 箭头图标 --></svg>
</NuxtLink>
```

- 定义在 `layouts/default.vue` `<style scoped>` 中
- 闲置：`ink-medium` 文字，`rounded-lg`，`px-3.5 py-2.5`，flex 布局
- hover：`cinnabar` 文字 + 浅朱砂底 `rgba(198,40,40,0.04)`
- active：缩至 98%
- **`mobile-nav-item--active`**：文字 `cinnabar`，底 `rgba(198,40,40,0.06)`，`font-weight: 500`
- **`mobile-nav-item--locked`**：60% 透明度，`cursor: default`，hover 不触发效果
- 激活态**必须**同时使用 `:aria-current="'page'"`
- 可用作 `<button>`（登出等操作）或 `<NuxtLink>`（页面跳转）

#### 侧边栏激活态 — 朱笔圈点

工具页侧边栏（AnimalNav、ConstellationNav）的激活态采用中式"朱笔圈点"样式：

- 左侧 2px 朱砂竖线 `border-l-2 border-l-cinnabar`
- 浅朱砂底色 `bg-cinnabar/6`
- 文字染朱砂 `text-cinnabar font-medium`
- **必须**搭配 `:aria-current="'true'"`

```html
<button
  :class="[
    'border-l-2 rounded-r-lg',
    isActive
      ? 'border-l-cinnabar bg-cinnabar/6 text-cinnabar font-medium'
      : 'border-l-transparent text-ink-medium hover:bg-paper-medium/50',
  ]"
  :aria-current="isActive ? 'true' : undefined"
>
  ...
</button>
```

#### `scroll-hint-x` — 横向滚动提示

```html
<div class="flex gap-2 overflow-x-auto scroll-hint-x">...</div>
```

- 使用 CSS `mask-image` 在右边缘生成 24px 渐变淡出
- 告知用户"还有更多内容可滚动"
- 定义在 `assets/css/main.css`
- 适用：移动端工具导航（`#mobile-nav`）、横向滚动列表

---

## 5. 布局系统

### 5.1 页面模板

```html
<ToolPageLayout>
  <template #nav><!-- 桌面端左侧栏 --></template>
  <template #mobile-nav><!-- 移动端横向滚动 --></template>
  <!-- 默认插槽：主内容区 -->
</ToolPageLayout>
```

- 主内容：`max-w-[48rem] mx-auto`（768px）
- 左侧栏：`w-44 xl:w-52`
- 右侧栏：`w-52`（仅 xl+ 可见）
- 页面外层：`max-w-grid mx-auto px-4 sm:px-6 lg:px-8`（72rem / 1152px）

### 5.2 间距规则

| 场景       | 间距                                                    |
| ---------- | ------------------------------------------------------- |
| 卡片内边距 | 默认 `p-6 sm:p-8`（窄屏 24px，`sm` 起 32px）            |
| 卡片之间   | `mb-6`                                                  |
| 分区之间   | `mt-8 mb-6`                                             |
| Grid 间距  | `gap-3 sm:gap-4`（小卡片 grid）、`gap-6`（大区块 grid） |
| 页面上下   | `py-6 sm:py-8`（工具页）                                |

### 5.3 z-index 层级

| 层级 | Token          | 用途                      |
| ---- | -------------- | ------------------------- |
| 10   | `--z-content`  | 页面内容                  |
| 40   | `--z-overlay`  | 纸纹纹理（`body::after`） |
| 50   | `--z-dropdown` | 下拉菜单                  |
| 60   | `--z-modal`    | 模态框、通知条            |

### 5.4 旧首页已登录区域布局（待退出）

The authenticated homepage uses a two-column grid layout with flex-proportioned internal blocks:

下列结构只记录当前代码，不再是目标规范。其登录问候、今日玄机、自动命签和每日穿衣组合已经由《首页与每日内容产品契约》替代；后续实现不得为了保持旧双栏比例而继续保留已退出内容。

```html
<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
  <!-- LEFT: greeting (60%) + 今日玄机 (40%) -->
  <div class="flex flex-col gap-4 sm:gap-6">
    <div class="anim-rise flex-[3] min-h-0"><!-- greeting --></div>
    <div class="flex-[2] min-h-0 anim-rise"><!-- talisman-card --></div>
  </div>
  <!-- RIGHT: fortune (flex-1) + clothing (shrink-0) -->
  <div class="flex flex-col gap-5 sm:gap-6 anim-rise">
    <div class="flex-1 min-h-0"><!-- DailyFortuneStick --></div>
    <div class="daily-wuxing-card shrink-0"><!-- clothing --></div>
  </div>
</div>
```

**Key rules:**

- Outer grid: `items-stretch` ensures both columns have equal height
- Left column proportions: greeting `flex-[3]` (≈60%), 今日玄机 `flex-[2]` (≈40%)
- Right column: fortune stick `flex-1` fills most space, clothing `shrink-0` pins to bottom
- Both columns use matching gap sizes
- Greeting content is centered via `items-center justify-center`
- `min-h-0` on all flex children to allow proper shrinking
- Pattern defined in `pages/index.vue`

目标首页的语义顺序固定为“产品第一屏 → 有真实记录时继续探索 → 今日一页 → 按目标探索 → 直接选择方法 → 透明性与版本入口”。登录前后使用同一骨架，移动端按该顺序单列回流；具体视觉布局仍应复用墨韵资产并在实施后完成浏览器验收。

---

## 6. 动画系统

### 6.1 时间令牌

| Token                 | 值              | 用途                |
| --------------------- | --------------- | ------------------- |
| `--transition-fast`   | `0.15s ease`    | hover 颜色/边框变化 |
| `--transition-normal` | `0.3s ease-out` | 展开/收起、淡入淡出 |
| `--transition-slow`   | `0.5s ease-out` | 页面入场动画        |

### 6.2 入场动画

#### `fade-in` — 通用淡入

```html
<div class="fade-in" :style="{ '--delay': '0.15s' }">...</div>
```

- 从 `opacity: 0` 动画到 `opacity: 1`，时长 `--transition-slow`
- **不**修改 `transform`（避免破坏 `position: fixed`）
- **必须**设置 `--delay` 自定义属性（CSS 变量），实现逐层 stagger
- 推荐 stagger 序列：`0.05s → 0.1s → 0.15s → 0.2s → 0.25s → 0.3s → 0.35s → 0.4s → 0.45s → 0.5s`

#### `anim-rise` — 上浮入场

```html
<div class="anim-rise anim-delay-1">...</div>
```

- 从下方 12px 淡入上浮到原位，时长 0.8s `ease-out`
- **`anim-delay-1` ~ `anim-delay-5`**：0.1s ~ 0.5s 的 stagger 延迟（全局类名，不可自定义）
- 用于首页 Hero 区域的逐层亮相（Hero 印章 → 标题 → 咒语 → CTA）
- **不**与 `fade-in` 混用——`anim-rise` 自带 transform，`fade-in` 故意不碰 transform

#### `content-fade` — 内容切换过渡

用于页面内内容替换（如切换星座/生肖）时的淡入淡出：

```html
<Transition name="content-fade" mode="out-in">
  <div :key="selectedIndex">...</div>
</Transition>
```

```css
.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.25s ease;
}
.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}
```

- `mode="out-in"`：旧内容先离场，新内容后入场——避免布局跳动
- `:key` 绑定到切换的索引值——key 变化才触发过渡
- CSS 放在页面/组件的 `<style scoped>` 中

#### `card-enter` + `seal-stamp` — 登录/注册页入场

登录页使用的三段式入场动画，模拟「展开卷轴 → 加盖印章」的仪式感：

```
┌─ card-enter ────┐  卡片整体淡入上浮
│  rule-extend ──┐│  上下边框墨线横向展开
│  seal-stamp ──┐││  玄字印章缩放弹入（spring easing）
│               │││
├────────────────┤││
│  登录表单内容   │││
│               │││
└────────────────┘││
 ─────────────────┘│
  ─────────────────┘
```

```css
/* Card: fade + rise */
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Border rule: horizontal unroll */
@keyframes rule-extend {
  from {
    transform: scaleX(0);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

/* Seal: stamp impression (spring) */
@keyframes seal-stamp {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

- 总时长 0.7s，逐层 stagger：card (0s) → rule (0.2s) → seal (0.35s)
- seal 使用 `cubic-bezier(0.34, 1.56, 0.64, 1)` 模拟盖章回弹
- 必须适配 `prefers-reduced-motion`

#### 登录卡片深度

登录页卡片使用三层阴影模拟「卷轴置于案上」的物理厚度：

```css
.login-card {
  box-shadow:
    0 2px 8px rgba(44, 26, 14, 0.06),
    /* 贴近桌面的紧密阴影 */ 0 8px 32px rgba(44, 26, 14, 0.08),
    /* 卷轴下方扩散阴影 */ 0 1px 0 rgba(44, 26, 14, 0.04) inset; /* 顶部微弱的纸边反光 */
}
```

- 三层叠加：紧贴 → 扩散 → 纸边反光，模拟物理卷轴的重量感
- 与标准 `card-warm`（单层 `0 4px 20px`）的区别：卡片隐喻"纸片"，登录卡隐喻"卷轴"，厚度不同

### 6.3 展开/收起

见 [4.1 折叠/展开标准模式](#折叠展开标准模式) 中的 Transition CSS。

### 6.4 keyframes 规则

- `@keyframes` **必须**放在 CSS `@layer` 块**之外**（Tailwind PostCSS 可能丢弃或错排它们）
- 用于组件特定动画的 keyframes 放在组件 `<style scoped>` 中
- 全局 keyframes（`fadeIn`、`sealPress`、`skeleton-shimmer`、`rise`）在 `assets/css/main.css` 中

### 6.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

开发时应在 JS 中检测：

```ts
const prefersReducedMotion = import.meta.client
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false
```

---

## 7. 交互状态

### 7.1 全局规则

| 状态          | 规则                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| hover         | `transition-colors`（0.15s）或 `transition-all`（0.3s），颜色变朱砂或上浮 2–4px |
| focus-visible | 2px 朱砂 outline，offset 2px，圆角 4px                                          |
| active        | 缩至 96%–98%                                                                    |
| disabled      | 50% 透明度，`cursor: not-allowed`，禁用所有 transform                           |

### 7.2 键盘交互

- 所有可点击元素**必须**同时绑定 `@click` + `@keydown.enter` + `@keydown.space.prevent`
- `role="tablist"` 的元素**必须**支持左右方向键导航
- `role="menu"` 的元素**必须**支持上下方向键导航 + Escape 关闭 + 点击外部关闭
- Escape 键处理**必须**绑在菜单容器上（不能只绑在触发按钮上）

---

## 8. 无障碍规范

### 8.1 页面结构

- 每个工具页面**必须**有 `<h1 class="sr-only">页面标题</h1>`
- 每个 loading 区**必须**有 `<div role="status" class="sr-only" aria-live="polite">加载提示</div>`
- 表单输入**必须**有 `<label for="id">` 关联
- 自定义 radio 使用 `<input class="sr-only">` + 样式化 `<span>`，focus-visible 环通过 `.sr-only:focus-visible + span` 实现

### 8.2 ARIA 速查

| 场景           | 属性                                                               |
| -------------- | ------------------------------------------------------------------ |
| 自定义下拉菜单 | `aria-haspopup="menu"`（**不要**用 `"true"`）                      |
| 自定义对话框   | `aria-haspopup="dialog"`                                           |
| 可折叠区域     | `aria-expanded` + `aria-controls`                                  |
| 进度条         | `role="progressbar"` + `aria-valuenow/min/max` + `aria-labelledby` |
| 装饰元素       | `aria-hidden="true"`                                               |
| 动态内容区     | `aria-live="polite"` + `aria-atomic="true"`                        |
| 列表           | `role="list"` + `role="listitem"`（紧凑 grid 展示时）              |

### 8.3 Reduced Motion

所有动画必须适配 `prefers-reduced-motion: reduce`（见 6.5）。

### 8.4 颜色独立编码

**吉凶/状态等颜色编码的信息必须同时使用形状或文字区分**，禁止纯依赖颜色（红绿色盲影响约 8% 男性用户）。

| 信号 | 颜色                            | 形状                                 | 示例               |
| ---- | ------------------------------- | ------------------------------------ | ------------------ |
| 吉   | `WUXING_COLORS['木']` `#3D6B4B` | ● 实心圆 `rounded-full`              | 日历日格右上角圆点 |
| 凶   | `WUXING_COLORS['火']` `#C62828` | ◆ 旋转菱形 `rounded-[1px] rotate-45` | 日历日格右上角菱形 |
| 平   | `WUXING_COLORS['土']` `#7A5E12` | ○ 空心圆 `rounded-full border`       | 日历图例           |

**实现：**

```css
/* 吉 — 圆 */
.indicator--ji {
  border-radius: 50%;
  background: var(--color-wuxing-wood);
}
/* 凶 — 菱形（视觉上独立于圆形） */
.indicator--xiong {
  border-radius: 1px;
  background: var(--color-wuxing-fire);
  transform: rotate(45deg);
}
```

**图例** 必须标注形状含义（如「吉 · 圆点」「凶 · 菱形」），不能仅标注颜色。

---

## 9. 反模式（禁止事项）

1. **禁止** 正文使用 `text-ink-light` 或 `ink-faint`。正文最低 `ink-medium`。
2. **禁止** `text-xs`（0.75rem）以下做正文。0.75rem 只能用于标签/脚注。
3. **禁止** `text-[0.6rem]` 或更小字号。硬底线 0.6875rem，且必须搭配 `ink-medium` 以上的颜色。
4. **禁止** 在 `WUXING_COLORS` 或 `WUXING_FALLBACK_COLOR` 之外硬编码颜色。
5. **禁止** 用 `text-opacity-*` 或 `opacity-*` 降低文字对比度。用 `text-ink-medium` / `text-ink-light` 替代。
6. **禁止** 用 Tailwind 的 `bg-color/N` 透明度语法（如 `bg-cinnabar/10`）或 `rgba()` 做背景色。用 scoped CSS 中的 `color-mix(in srgb, var(--color-*), N%, transparent)` 替代。详见 §2.6。
7. **禁止** `btn-seal` 的 `<span>` 内加前缀字符（"⟲"、">" 等）。重新操作的按钮用 `btn-ink`。
8. **禁止** 引入朱砂/金/玉/墨/纸之外的色板。不要用紫色渐变、蓝色链接等。
9. **禁止** 为保持固定 `p-8` 而挤压 320px 窄屏正文；通用卡片默认使用 `p-6 sm:p-8`，特殊值必须通过对应页面验收。
10. **禁止** `@keyframes` 放在 CSS `@layer` 块内。
11. **禁止** `aria-haspopup="true"`。用 `"menu"` 或 `"dialog"`。
12. **禁止** 为单次使用创建抽象组件。优先复用仍处于 Active 状态且符合对应产品契约的通用组件；不得因为组件已经存在就复用 `FortuneBars`、`ScoreRing` 等禁用模式。
13. **禁止** 在公开工具页继续新增 `MethodologyNote`、“注”按钮或等价浮层。已核验的依据和范围进入正常阅读流。

---

## 10. 代码片段速查

### 新建工具页模板

旧模板包含强制登录、自动读取档案、挂载后自动计算、默认历史和统一免责声明，已经与产品规范冲突，不再作为复制模板。新工具页只能复用下列视觉骨架；输入、状态、保存、历史、导出和公开能力必须由对应工具契约决定：

```html
<template>
  <ToolPageLayout>
    <template #nav><!-- 导航 --></template>
    <template #mobile-nav><!-- 移动端导航 --></template>

    <h1 class="sr-only">工具名</h1>
    <main class="max-w-[48rem] mx-auto space-y-6">
      <section class="card-warm rounded-xl p-6 sm:p-8">
        <!-- 工具说明和当次输入；不得在挂载时自动生成 -->
      </section>

      <section aria-live="polite">
        <!-- 按统一状态模型展示处理状态、错误或结果 -->
      </section>

      <section class="card-warm rounded-xl p-6 sm:p-8">
        <!-- 已核验的依据与范围，处于正常文档流 -->
      </section>
    </main>
  </ToolPageLayout>
</template>
```

是否显示档案带入、保存、历史、导出、免责声明或状态页，必须从对应产品契约和工具四维状态得出，不得在视觉模板中默认开启。

---

## 11. 维护策略

### 11.1 更新触发条件

| 场景                                           | 是否更新   | 更新范围                           |
| ---------------------------------------------- | ---------- | ---------------------------------- |
| 新增了可被其他页面复用的 UI 模式               | **必须**   | 新增组件条目 / CSS 类条目          |
| 修改了 `main.css` 中的全局 CSS 类行为          | **必须**   | 对应组件的属性表                   |
| 修改了 `tailwind.config.ts` 中的色板/字体/阴影 | **必须**   | 色彩/字体/阴影章节                 |
| 新增了全局 CSS 变量（`--color-*` 等）          | **必须**   | 对应章节的 Token 表                |
| 修改了既有组件的标准交互模式                   | **必须**   | 对应组件的说明和代码示例           |
| 废弃了一个不再使用的全局 CSS 类                | **必须**   | 标记为 `~~删除线~~` 或移到废弃章节 |
| 单页内调整字号/间距/颜色（用已有类名）         | **不需要** | —                                  |
| 修复单页可读性 bug（用已有规范）               | **不需要** | —                                  |
| 文案修改、措辞调整                             | **不需要** | —                                  |
| 新增页面（完全复用已有组件）                   | **不需要** | —                                  |

### 11.2 决策树

```
改 UI
  ├─ 改了 main.css / tailwind.config.ts？
  │    └─ 是 → 必须更新设计系统
  ├─ 新增了组件，且其他页面可能用到同样的模式？
  │    └─ 是 → 必须更新设计系统（新增组件条目或代码片段）
  ├─ 改变了既有组件的交互方式（如折叠按钮从自定义改成 btn-cin）？
  │    └─ 是 → 必须更新设计系统（更新对应的标准模式）
  ├─ 新增了颜色/字体/间距的硬编码值，且这个值可能被复用？
  │    └─ 是 → 考虑是否应该提升为 Token，然后更新设计系统
  └─ 只是在单个页面内微调？
       └─ 是 → 不需要更新设计系统
```

### 11.3 更新操作清单

更新设计系统时应完成以下检查：

- [ ] 色板表中的值与 `tailwind.config.ts` 一致
- [ ] Token 表中的值与 `assets/css/main.css` 一致
- [ ] 代码示例中的类名和属性在当前代码库中**实际存在**（不是臆想）
- [ ] 组件路径表中的文件路径正确
- [ ] 新增的反模式有对应的**真实违规案例**（不是假想的）
- [ ] 删除的条目在所有页面中**确认不再使用**

### 11.4 版本与审计

- **每次更新设计系统**，在提交信息中使用 `docs(design-system):` 前缀
- **每 3–5 个功能分支合并后**，快速检查一次文档是否与代码同步——重点查色板表、Token 表、组件路径表
- **发现文档与代码不一致** 时，先判断产品规范是否已经批准。代码偏离批准规范时进入后续实施整改；规范只记录旧实现时才按真实代码更新，不能用旧代码覆盖新决策。

### 11.5 所有权

- **视觉资产以真实代码为基础，目标约束以批准规范为准**。尚未实施的批准规则必须明确标注为目标状态，不得伪装成当前代码已经使用。
- **PR Review 检查项**：如果 PR 新增了全局 CSS 类、修改了色板/字体配置、或改变了多个页面共用的交互模式，Review 者必须确认设计系统文档已同步更新。
- **强行约定**：`main.css` 中新增的 CSS 类，如果没有写入设计系统文档，视为**未完成**——不允许合并。

---

> **最后更新**：2026-09-06（在既有首页治理基础上同步梅花易数契约：符纸卡仅保留视觉资产，推导、原文、进阶结构与来源分层；未修改现有 UI 代码）
