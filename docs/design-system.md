# 墨韵 · Ink Resonance — 设计系统

> XuanXue（玄·道）前端设计规范。所有 UI 决策以此文档为准。
> 新增组件前先查阅，避免凭感觉做设计。

---

## 1. 设计理念

**墨韵**：传统中式书房美学。墨色纸纹为底，朱砂印章为眼，金玉点缀其间。

- **气质**：素雅沉静，不张扬。留白即是装饰。
- **配色原则**：墨/纸 7 阶灰度占画面 90%，朱砂占 5%，金/玉占 5%。
- **字体原则**：展示标题用书法（Ma Shan Zheng），正文用无衬线（Noto Sans SC）。不要引入第三种字体。

---

## 2. 色彩系统

### 2.1 墨（Ink）— 文字色阶

| Token | 色值 | 用途 |
|-------|------|------|
| `ink-darkest` | `#1A0F0A` | 极少用 |
| `ink-dark` | `#1E1210` | **标题色**、重要文字 |
| `ink` | `#2C1810` | 正文强调 |
| `ink-medium` | `#6B5B4F` | **正文色**（最低对比度要求） |
| `ink-muted` | `#4D4037` | 辅助信息 |
| `ink-light` | `#5E5045` | 标签、占位符 |
| `ink-faint` | `#D4C5B0` | 分割线、边框、装饰 |

**规则**：
- 正文文字 **禁止** 使用 `ink-light` 或更低对比度。正文最低为 `ink-medium`。
- 辅助文字/标签最低为 `ink-light`（`0.6875rem` 以上）或 `ink-medium`（`0.6875rem` 以下）。
- Tailwind 类名：`text-ink-dark`、`text-ink`、`text-ink-medium`、`text-ink-light`、`text-ink-faint`。

### 2.2 纸（Paper）— 背景色阶

| Token | 色值 | 用途 |
|-------|------|------|
| `paper-lightest` | `#FBF8F4` | 全页底色 |
| `paper-light` | `#F5F0E8` | 浅底卡片 |
| `paper-medium` | `#EDE4D3` | hover 态背景 |
| `paper-card` | `#E8DCC6` | **卡片底色**（card-warm） |
| `paper-dark` | `#E0D5C0` | 卡片边框 |
| `paper-darker` | `#D0C0A8` | 极少用 |

### 2.3 朱砂（Cinnabar）— 强调色

| Token | 色值 | 用途 |
|-------|------|------|
| `cinnabar` | `#C62828` | **主强调色**：链接、选中态、重要徽章 |
| `cinnabar-light` | `#E53935` | hover 高亮 |
| `cinnabar-dark` | `#8E1D1D` | 深色点缀 |
| `cinnabar-deeper` | `#9C1A1C` | btn-cin 背景 |
| `cinnabar-deepest` | `#7A1416` | btn-cin hover 背景 |

**规则**：
- 朱砂是**唯一**的暖色强调。不要引入橙色、粉色等其他暖色。
- `bg-cinnabar/10` 是最常用的浅底强调（选中态、标签背景）。

### 2.4 金（Gold）& 玉（Jade）— 点缀色

| Token | 色值 | 用途 |
|-------|------|------|
| `gold` | `#7A5E12` | 中评/中性徽章、MC 线 |
| `gold-light` | `#9A7818` | 亮金色 |
| `jade` | `#3D6B4B` | 好评/吉徽章、和谐相位 |
| `jade-light` | `#4D7A5A` | 亮玉色 |

### 2.5 五行色

| 元素 | 色值 | Tailwind |
|------|------|----------|
| 木 | `#3D6B4B` | `wuxing-wood` |
| 火 | `#C62828` | `wuxing-fire` |
| 土 | `#7A5E12` | `wuxing-earth` |
| 金 | `#5E5E5E` | `wuxing-metal` |
| 水 | `#2C5F7C` | `wuxing-water` |

回退色：`#6B5B4F`（来自 `WUXING_FALLBACK_COLOR` 常量）。

---

## 3. 字体系统

### 3.1 字体族

| Token | 字体 | 用途 |
|-------|------|------|
| `font-display` | Ma Shan Zheng → STKaiti → KaiTi → cursive | **页面标题、section 标题、大字数据** |
| `font-sans` | Noto Sans SC → PingFang SC → … → sans-serif | **正文、标签、按钮、表单** |

**规则**：
- `font-display` 只用于**标题**和**数据展示**（h1、h2、大数字）。不用在段落文本。
- `font-sans` 用于所有其他文字。
- 正文最小字号：`text-sm`（0.875rem）。**禁止** `text-xs` 做正文。
- 辅助文字/脚注最小：`text-xs`（0.75rem），颜色最低 `ink-medium`。
- 超小标签（徽章内、角标）：`0.6875rem` 为硬底线，且必须在高对比度背景上。

### 3.2 字阶参考

| 类名 | 大小 | 用途 |
|------|------|------|
| `text-5xl` | 3rem | Hero 大符号（星座 ♈、生肖 🐀） |
| `text-4xl` | 2.25rem | 页面主标题 |
| `text-3xl` | 1.875rem | Hero 标题 |
| `text-2xl` | 1.5rem | Logo |
| `text-xl` | 1.25rem | Section 标题（`section-header h2`） |
| `text-base` | 1rem | 正文（较少用，多用 text-sm） |
| `text-sm` | 0.875rem | **正文默认值** |
| `text-xs` | 0.75rem | 标签、辅助信息、脚注 |
| `text-[0.72rem]` | 0.72rem | 紧凑标签（需在 ink-medium 级别） |
| `text-[0.6875rem]` | 0.6875rem | 绝对最小（徽章内文字） |

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
- 可加 `.btn-seal__char` 内部显示一个印章字符
- 适用：次要操作（合婚、测字、起名面板）

#### `btn-ghost` — 幽灵按钮

```
<button class="btn-ghost">返回首页</button>
```

- 无背景无边框，ink-medium 文字
- hover: cinnabar 文字
- active: 缩至 97%
- focus-visible: 2px cinnabar outline

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
      class="btn-cin text-sm"
    >
      <span class="sr-only">{{ expanded ? '收起' : '展开' }}区块标题</span>
      <span aria-hidden="true">{{ expanded ? '收起 ▲' : '展开 ▼' }}</span>
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
.expand-leave-active { transition: all 0.3s ease; overflow: hidden; }
.expand-enter-from,
.expand-leave-to { max-height: 0; opacity: 0; }
.expand-enter-to,
.expand-leave-from { max-height: 2000px; opacity: 1; }
```

### 4.2 卡片

#### `card-warm` — 暖纸卡（默认卡片）

```
<div class="card-warm rounded-xl p-8">...</div>
```

- 底色 `paper-card`（#E8DCC6），微弱内阴影
- **标准内边距 `p-8`**（32px），移动端不缩（不要用 `p-6 sm:p-8`）
- 适用：结果区域、信息面板、90% 的卡片场景

#### `card-paper-solid` — 浅纸卡

```
<div class="card-paper-solid p-8">...</div>
```

- 底色 `paper-lightest`，有边框和 card 阴影
- 适用：表单容器

#### `tool-card--new` — 工具选择卡

模板见 `components/home/` 下现有机房组件。用于首页工具入口。

#### `wuxing-card` — 五行属性卡

```
<div class="wuxing-card wuxing-card--fire">...</div>
```

- 半透明白底 + 彩色边框
- 修饰符：`--wood`、`--fire`、`--earth`、`--metal`、`--water`
- 适用：属性 grids（五行、元素、守护星等 2×2 或 4 列网格）

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

```html
<div class="section-header">
  <h2>分区标题</h2>
</div>
```

- 顶线（1px 朱砂淡线）+ 底部小朱砂圆点装饰
- h2 字体：`font-display text-xl`
- 适用：所有结果分区的标题

#### `divider-ink` — 墨韵分割线

通过 `InkDivider` 组件使用：
```html
<InkDivider>文字</InkDivider>
```

待迁移到组件使用后：`<div class="divider-ink"><span>文字</span></div>`

#### `divider-seal` — 印章分割线

```html
<div class="divider-seal">
  <span class="divider-seal__line" />
  <span class="divider-seal__word">玄·道</span>
  <span class="divider-seal__line" />
</div>
```

适用：首页大区块分隔。

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

#### `fortune-bar` — 运势进度条

```html
<div class="fortune-bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">
  <div class="fortune-bar__fill fortune-bar__fill--good" :style="{ width: '60%' }" />
</div>
```

- `--great`（≥75，玉色）、`--good`（≥60，金色）、`--normal`（≥45，墨中）、`--low`（<45，朱砂）
- 使用 `FortuneBars` 组件：`<FortuneBars :items="[...{ label, score }]" />`

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

### 4.7 工具页通用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| `ToolPageLayout` | `components/tools/ToolPageLayout.vue` | 三栏布局（#nav / #mobile-nav / #nav-right） |
| `ToolToolbar` | `components/tools/ToolToolbar.vue` | 顶部工具栏（历史 + 导出） |
| `ExportButton` | `components/tools/ExportButton.vue` | 导出图片按钮 |
| `HistoryModal` | `components/tools/HistoryModal.vue` | 历史记录弹窗 |
| `ScrollTopButton` | `components/tools/ScrollTopButton.vue` | 回到顶部 |
| `EntertainmentDisclaimer` | `components/tools/EntertainmentDisclaimer.vue` | 娱乐免责声明 |
| `FortuneBars` | `components/tools/FortuneBars.vue` | 多维度运势柱状图 |
| `ScoreRing` | `components/tools/ScoreRing.vue` | 评分环形图 |
| `SkeletonCard` | `components/tools/SkeletonCard.vue` | 骨架屏卡片 |
| `SkeletonBars` | `components/tools/SkeletonBars.vue` | 骨架屏柱状图 |
| `InkDivider` | `components/tools/InkDivider.vue` | 墨韵分割线 |
| `PageHero` | `components/tools/PageHero.vue` | 页面标题区 |

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

| 场景 | 间距 |
|------|------|
| 卡片内边距 | `p-8`（32px），必须固定，不随断点变化 |
| 卡片之间 | `mb-6` |
| 分区之间 | `mt-8 mb-6` |
| Grid 间距 | `gap-3 sm:gap-4`（小卡片 grid）、`gap-6`（大区块 grid） |
| 页面上下 | `py-6 sm:py-8`（工具页） |

### 5.3 z-index 层级

| 层级 | Token | 用途 |
|------|-------|------|
| 10 | `--z-content` | 页面内容 |
| 40 | `--z-overlay` | 纸纹纹理（`body::after`） |
| 50 | `--z-dropdown` | 下拉菜单 |
| 60 | `--z-modal` | 模态框、通知条 |

---

## 6. 动画系统

### 6.1 时间令牌

| Token | 值 | 用途 |
|-------|-----|------|
| `--transition-fast` | `0.15s ease` | hover 颜色/边框变化 |
| `--transition-normal` | `0.3s ease-out` | 展开/收起、淡入淡出 |
| `--transition-slow` | `0.5s ease-out` | 页面入场动画 |

### 6.2 入场动画

#### `fade-in` — 通用淡入

```html
<div class="fade-in" :style="{ '--delay': '0.15s' }">...</div>
```

- 从 `opacity: 0` 动画到 `opacity: 1`，时长 `--transition-slow`
- **不**修改 `transform`（避免破坏 `position: fixed`）
- **必须**设置 `--delay` 自定义属性（CSS 变量），实现逐层 stagger
- 推荐 stagger 序列：`0.05s → 0.1s → 0.15s → 0.2s → 0.25s → 0.3s → 0.35s → 0.4s → 0.45s → 0.5s`

### 6.3 展开/收起

见 [4.1 折叠/展开标准模式](#折叠展开标准模式) 中的 Transition CSS。

### 6.4 keyframes 规则

- `@keyframes` **必须**放在 CSS `@layer` 块**之外**（Tailwind PostCSS 可能丢弃或错排它们）
- 用于组件特定动画的 keyframes 放在组件 `<style scoped>` 中
- 全局 keyframes（`fadeIn`、`sealPress`、`skeleton-shimmer`、`rise`）在 `assets/css/main.css` 中

### 6.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
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

| 状态 | 规则 |
|------|------|
| hover | `transition-colors`（0.15s）或 `transition-all`（0.3s），颜色变朱砂或上浮 2–4px |
| focus-visible | 2px 朱砂 outline，offset 2px，圆角 4px |
| active | 缩至 96%–98% |
| disabled | 50% 透明度，`cursor: not-allowed`，禁用所有 transform |

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

| 场景 | 属性 |
|------|------|
| 自定义下拉菜单 | `aria-haspopup="menu"`（**不要**用 `"true"`） |
| 自定义对话框 | `aria-haspopup="dialog"` |
| 可折叠区域 | `aria-expanded` + `aria-controls` |
| 进度条 | `role="progressbar"` + `aria-valuenow/min/max` + `aria-labelledby` |
| 装饰元素 | `aria-hidden="true"` |
| 动态内容区 | `aria-live="polite"` + `aria-atomic="true"` |
| 列表 | `role="list"` + `role="listitem"`（紧凑 grid 展示时） |

### 8.3 Reduced Motion

所有动画必须适配 `prefers-reduced-motion: reduce`（见 6.5）。

---

## 9. 反模式（禁止事项）

1. **禁止** 正文使用 `text-ink-light` 或 `ink-faint`。正文最低 `ink-medium`。
2. **禁止** `text-xs`（0.75rem）以下做正文。0.75rem 只能用于标签/脚注。
3. **禁止** `text-[0.6rem]` 或更小字号。硬底线 0.6875rem，且必须搭配 `ink-medium` 以上的颜色。
4. **禁止** 在 `WUXING_COLORS` 或 `WUXING_FALLBACK_COLOR` 之外硬编码颜色。
5. **禁止** 用 `text-opacity-*` 或 `opacity-*` 降低文字对比度。用 `text-ink-medium` / `text-ink-light` 替代。
6. **禁止** 引入朱砂/金/玉/墨/纸之外的色板。不要用紫色渐变、蓝色链接等。
7. **禁止** 卡片内边距用 `p-6 sm:p-8`。固定 `p-8`。
8. **禁止** `@keyframes` 放在 CSS `@layer` 块内。
9. **禁止** `aria-haspopup="true"`。用 `"menu"` 或 `"dialog"`。
10. **禁止** 为单次使用创建抽象组件。复用已有的通用组件（FortuneBars、ScoreRing 等）。

---

## 10. 代码片段速查

### 新建工具页模板

```html
<script setup lang="ts">
const { currentProfile, restoreSession } = useAuth()
const router = useRouter()
const result = ref<ResultType | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const error = ref('')
const showHistoryModal = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) { router.push('/login'); return }
  if (!currentProfile.value.birth_date) { missingBirthInfo.value = true; loading.value = false; return }
  computeResult()
})
</script>

<template>
  <ToolPageLayout>
    <template #nav><!-- 导航 --></template>
    <template #mobile-nav><!-- 移动端导航 --></template>

    <h1 class="sr-only">工具名</h1>
    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
    </div>

    <div v-if="missingBirthInfo" class="text-center py-16">
      <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
      <NuxtLink :to="`/profile/${currentProfile?.id}`" class="btn-cin inline-flex">
        <span>前往编辑档案</span>
      </NuxtLink>
    </div>

    <div v-else-if="loading" class="space-y-6" aria-busy="true">
      <SkeletonCard /><SkeletonBars />
    </div>

    <div v-else-if="error" class="text-center py-16">
      <p class="text-base text-cinnabar" role="alert">{{ error }}</p>
    </div>

    <template v-else-if="result">
      <div class="max-w-[48rem] mx-auto">
        <ToolToolbar :show-history="true" @history="showHistoryModal = true">
          <template #extra>
            <ExportButton :target-ref="resultRef" filename="工具名.png" :is-exporting="isExporting" @export="handleExport" />
          </template>
        </ToolToolbar>

        <div ref="resultRef">
          <!-- 结果内容 -->
        </div>

        <div class="flex flex-wrap gap-3 justify-center my-8">
          <button @click="showHistoryModal = true" class="btn-cin" aria-haspopup="dialog">
            <span>浏览历史</span>
          </button>
        </div>
      </div>

      <HistoryModal :show="showHistoryModal" type="tooltype" @close="showHistoryModal = false" @restore="onHistoryRestore" />
      <EntertainmentDisclaimer />
      <ScrollTopButton v-if="showScrollTop" @click="scrollToTop" />
    </template>
  </ToolPageLayout>
</template>
```

---

> **维护规则**：发现新的可复用模式时，更新此文档。发现违反规范的模式时，修复并更新此文档。
