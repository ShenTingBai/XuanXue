# 工具页面视觉适配 — 实施计划

> **状态：已完成** — 对应功能已合并至 `main`
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 5 个工具页面（生肖、星座、六爻、八字、紫微斗数）换上"墨韵 · Ink Resonance"视觉风格

**Architecture:** 不改功能逻辑，只替换 CSS 类名和组件标签。三个核心替换：`card-paper-solid` → `card-warm`、`<InkDivider>` → 带 seal-icon 的 section-header 模式、`btn-seal` → `btn-cin`。每个任务处理一个页面组（页面 + 其子组件），完成后 build 验证。

**Tech Stack:** Nuxt 3 + Vue 3 + TailwindCSS

---

### Task 0: 添加工具区标题 CSS 类

**Files:**
- Modify: `assets/css/main.css:729`

在 `.section-header h2` 后添加一个工具区专用的变体，尺寸介于首页微型标题和 InkDivider 大标题之间。

- [ ] **Step 1: 添加 `.section-header--tool` 修饰类**

位置：在 `assets/css/main.css` 中 `.section-header h2` 样式块之后添加：

```css
  .section-header--tool h2 {
    font-family: var(--font-display);
    font-size: 1.125rem;
    color: var(--color-ink);
    letter-spacing: 0.2em;
  }
  @media (min-width: 640px) {
    .section-header--tool h2 {
      font-size: 1.25rem;
    }
  }
```

- [ ] **Step 2: Build 验证**

```bash
npx nuxt typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```
Expected: typecheck + build 通过

- [ ] **Step 3: Commit**

```bash
git add assets/css/main.css
git commit -m "style: add section-header--tool modifier for tool page section titles"
```

---

### Task 1: 星座页面适配

**Files — 同时修改：**
- Modify: `pages/tools/constellation.vue`
- Modify: `components/tools/constellation/Hero.vue`
- Modify: `components/tools/constellation/HoroscopePanel.vue`
- Modify: `components/tools/constellation/YiJiPanel.vue`

- [ ] **Step 1: 替换 ConstellationHero — card-paper-solid → card-warm**

`components/tools/constellation/Hero.vue`:
```
class="fade-in card-paper-solid rounded-xl p-8 mb-6"
```
→
```
class="fade-in card-warm rounded-xl p-8 mb-6"
```

- [ ] **Step 2: 替换 HoroscopePanel — card-paper-solid + InkDivider**

`components/tools/constellation/HoroscopePanel.vue`:
```
class="fade-in card-paper-solid rounded-xl p-8 mb-6"
```
→
```
class="fade-in card-warm rounded-xl p-8 mb-6"
```

删除 InkDivider 导入，替换 `<InkDivider class="mt-6">综合运势</InkDivider>` 为：
```html
<div class="section-header section-header--tool mt-6">
  <span class="bar" aria-hidden="true"></span>
  <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">运</span>
  <h2>综合运势</h2>
</div>
```

- [ ] **Step 3: 替换 YiJiPanel — InkDivider**

`components/tools/constellation/YiJiPanel.vue`:
删除 InkDivider 导入，替换 `<InkDivider>今日宜忌</InkDivider>` 为：
```html
<div class="section-header section-header--tool">
  <span class="bar" aria-hidden="true"></span>
  <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">忌</span>
  <h2>今日宜忌</h2>
</div>
```

- [ ] **Step 4: 替换 constellation.vue 页面内容**

`pages/tools/constellation.vue`:
- 删除 InkDivider 导入
- 性格特征卡片：`class="card-paper-solid rounded-xl p-5"` → `class="card-warm rounded-xl p-5"`
- 速配星座卡片：`class="card-paper-solid rounded-xl p-3 sm:p-4 ..."` → `class="card-warm rounded-xl p-3 sm:p-4 ..."`
- 性格特征标题 `<InkDivider>性格特征</InkDivider>` → section-header 模式：
```html
<div class="section-header section-header--tool">
  <span class="bar" aria-hidden="true"></span>
  <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">性</span>
  <h2>性格特征</h2>
</div>
```
- 速配星座标题 `<InkDivider>速配星座</InkDivider>` → section-header 模式（seal-icon 字符"配"）
- `btn-seal` → `btn-cin`（所有按钮）

- [ ] **Step 5: Build 验证**

```bash
npx nuxt typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add pages/tools/constellation.vue components/tools/constellation/
git commit -m "style: adapt constellation page to ink-resonance design system"
```

---

### Task 2: 生肖页面适配

**Files — 同时修改：**
- Modify: `pages/tools/shengxiao.vue`
- Modify: `components/tools/shengxiao/Hero.vue`
- Modify: `components/tools/shengxiao/Personality.vue`
- Modify: `components/tools/shengxiao/CompatibilityGrid.vue`

- [ ] **Step 1: 替换 ShengXiaoHero**

`components/tools/shengxiao/Hero.vue`: `card-paper-solid` → `card-warm`

- [ ] **Step 2: 替换 Personality**

`components/tools/shengxiao/Personality.vue`:
- 两处 `card-paper-solid` → `card-warm`
- 删除 InkDivider 导入
- `<InkDivider>性格特征</InkDivider>` → section-header 模式（seal-icon 字符"性"）
- `<InkDivider>五行属性</InkDivider>` → section-header 模式（seal-icon 字符"行"）

- [ ] **Step 3: 替换 CompatibilityGrid**

`components/tools/shengxiao/CompatibilityGrid.vue`:
- `card-paper-solid` → `card-warm`
- 删除 InkDivider 导入
- `<InkDivider>相性配对</InkDivider>` → section-header 模式（seal-icon 字符"配"）

- [ ] **Step 4: 替换 shengxiao.vue 页面**

`pages/tools/shengxiao.vue`:
- 删除 InkDivider 导入
- 幸运信息卡片：`card-paper-solid` → `card-warm`，标题 InkDivider → section-header（seal-icon 字符"幸"）
- 流年运势卡片：同上（seal-icon 字符"年"）
- `btn-seal` → `btn-cin`（所有按钮）
- 缺失信息提示中的 `btn-seal` → `btn-cin`

- [ ] **Step 5: Build 验证**

```bash
npx nuxt typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add pages/tools/shengxiao.vue components/tools/shengxiao/
git commit -m "style: adapt shengxiao page to ink-resonance design system"
```

---

### Task 3: 六爻页面适配

**Files — 同时修改：**
- Modify: `pages/tools/yijing.vue`
- Modify: `components/tools/yijing/YijingInterpretation.vue`

- [ ] **Step 1: 替换 YijingInterpretation**

`components/tools/yijing/YijingInterpretation.vue`:
- 所有 5 处 `card-paper-solid` → `card-warm`
- `InkDivider` → 删除导入，替换为 section-header 模式（seal-icon 字符"卦"）

- [ ] **Step 2: 替换 yijing.vue 页面**

`pages/tools/yijing.vue`:
- 删除 InkDivider 导入
- 确认对话框 `<div class="card-paper-solid rounded-xl p-8 ...">` → `card-warm`
- `<InkDivider v-if="result && !processing" />` → section-header 模式
- `btn-seal` → `btn-cin`（重新占卜、确定重新起卦等按钮）
- 更新 CSS 中的 `.card-paper-solid` 引用为 `.card-warm`（`<style scoped>` 内）

- [ ] **Step 3: 替换 YijingCastingPanel 按钮**

`components/tools/yijing/YijingCastingPanel.vue`:
- `btn-seal` → `btn-cin`（起卦/重置按钮）

- [ ] **Step 4: Build 验证**

```bash
npx nuxt typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add pages/tools/yijing.vue components/tools/yijing/
git commit -m "style: adapt yijing page to ink-resonance design system"
```

---

### Task 4: 紫微斗数页面适配

**Files — 同时修改：**
- Modify: `pages/tools/ziwei.vue`
- Modify: `components/tools/ziwei/ZiWeiInputForm.vue`
- Modify: `components/tools/ziwei/ZiWeiInfoSidebar.vue`

- [ ] **Step 1: 替换 ZiWeiInputForm**

`components/tools/ziwei/ZiWeiInputForm.vue`:
- `card-paper-solid` → `card-warm`
- `btn-seal` → `btn-cin`

- [ ] **Step 2: 替换 ZiWeiInfoSidebar**

`components/tools/ziwei/ZiWeiInfoSidebar.vue`:
- `card-paper-solid` → `card-warm`

- [ ] **Step 3: 替换 ziwei.vue 页面**

`pages/tools/ziwei.vue`:
- `btn-seal` → `btn-cin`（所有按钮）
- 天星图、宫位网格、详情面板的外围容器 `card-paper-solid` → `card-warm`（检查 `ZiWeiDetailPanel.vue`、`ZiWeiDetailSheet.vue`、`ZiWeiPalaceGrid.vue`、`ZiWeiDaXianTimeline.vue` 如有 `card-paper-solid` 则替换）

- [ ] **Step 4: Build 验证**

```bash
npx nuxt typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add pages/tools/ziwei.vue components/tools/ziwei/
git commit -m "style: adapt ziwei page to ink-resonance design system"
```

---

### Task 5: 八字页面适配

**Files — 同时修改：**
- Modify: `pages/tools/bazi.vue`
- Modify: `components/tools/bazi/BaziGrid.vue`
- Modify: `components/tools/bazi/BaziInfoSidebar.vue`
- Modify: `components/tools/bazi/CollapsibleSection.vue`
- Modify: `components/tools/bazi/DayMasterCard.vue`
- Modify: `components/tools/bazi/ElementAnalysis.vue`
- Modify: `components/tools/bazi/DaYunTimeline.vue`
- Modify: `components/tools/bazi/LiuNianTimeline.vue`
- Modify: `components/tools/bazi/ReadingGuide.vue`
- Modify: `components/tools/bazi/ShenShaPanel.vue`

- [ ] **Step 1: 替换 CollapsibleSection**

`components/tools/bazi/CollapsibleSection.vue`:
- `card-paper-solid` → `card-warm`
- 在标题左侧的红 bar 和 h2 之间增加 seal-icon。添加 `sealChar` prop（`type: String, default: '命'`），在模板中红 bar 后插入：
```html
<span v-if="sealChar" class="seal-icon text-[9px] w-7 h-7 flex-shrink-0" aria-hidden="true">{{ sealChar }}</span>
```
- Props 增加 `sealChar?: string`
- `bazi.vue` 中每个 `<CollapsibleSection>` 调用处传入对应字符：
  - 四柱排盘 → seal-char="命"
  - 神煞 → seal-char="煞"
  - 日主分析 → seal-char="主"
  - 五行分析 → seal-char="行"
  - 大运 → seal-char="运"
  - 流年 → seal-char="年"

- [ ] **Step 2: 替换 BaziGrid、BaziInfoSidebar**

`components/tools/bazi/BaziGrid.vue`: `card-paper-solid` → `card-warm`
`components/tools/bazi/BaziInfoSidebar.vue`: `card-paper-solid` → `card-warm`

- [ ] **Step 3: 替换 DayMasterCard**

`components/tools/bazi/DayMasterCard.vue`: `card-paper-solid` → `card-warm`

- [ ] **Step 4: 替换 ElementAnalysis、DaYunTimeline**

`components/tools/bazi/ElementAnalysis.vue`: `card-paper-solid` → `card-warm`
`components/tools/bazi/DaYunTimeline.vue`: `card-paper-solid` → `card-warm`

- [ ] **Step 5: 替换 LiuNianTimeline**

`components/tools/bazi/LiuNianTimeline.vue`:
- 当前年行运卡片和每年条目两处 `card-paper-solid` → `card-warm`

- [ ] **Step 6: 替换 ReadingGuide**

`components/tools/bazi/ReadingGuide.vue`: `card-paper-solid` → `card-warm`

- [ ] **Step 7: 替换 ShenShaPanel**

`components/tools/bazi/ShenShaPanel.vue`: `card-paper-solid` → `card-warm`

- [ ] **Step 8: 替换 bazi.vue 页面 InkDivider**

`pages/tools/bazi.vue`:
- 删除 InkDivider 导入
- 各折叠区标题的 InkDivider 替换（在组件内部已处理，主要检查页面级的 InkDivider 引用）
- `btn-seal` → `btn-cin`

- [ ] **Step 9: Build 验证**

```bash
npx nuxt typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 10: Commit**

```bash
git add pages/tools/bazi.vue components/tools/bazi/
git commit -m "style: adapt bazi page to ink-resonance design system"
```

---

### Task 6: 全局组件检查

- [ ] **Step 1: 替换 HistoryModal**

`components/tools/HistoryModal.vue`:
- `card-paper-solid` → `card-warm`（主对话框 + CSS 引用）

- [ ] **Step 2: 替换 SkeletonCard**

`components/tools/SkeletonCard.vue`:
- `card-paper-solid` → `card-warm`

- [ ] **Step 3: Build + 全面验证**

```bash
npx nuxt typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add components/tools/HistoryModal.vue components/tools/SkeletonCard.vue
git commit -m "style: adapt shared tool components to ink-resonance design system"
```
