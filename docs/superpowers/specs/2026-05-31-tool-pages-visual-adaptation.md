# 工具页面视觉适配

> **状态：已完成** — 对应功能已合并至 `main`
>
> 玄·道 设计系统落地 — 为 5 个工具页面换上"墨韵 · Ink Resonance"视觉风格。

## 概述

首页和登录页已完成设计系统升级（`feat/design-system-rollout` 分支），现在统一适配 5 个工具页面：**生肖、星座、六爻、八字、紫微斗数**。

**原则：不改功能逻辑，只换视觉皮肤。** 所有计算引擎、数据流、组件接口保持不变。

## 改动清单（每页通用）

| 替换项 | 旧 | 新 |
|--------|------|-----|
| 卡片背景 | `card-paper-solid` | `card-warm` |
| 分区标题 | `<InkDivider>` 组件 | `section-header` div + `seal-icon` 装饰 |
| 操作按钮 | `btn-seal` | `btn-cin`（朱砂实心按钮） |
| 标题字体 | `font-sans` | `font-display`（Ma Shan Zheng 书法体） |
| 页面描述 | 普通文本 | `class="ui"`（Noto Sans SC 注解体） |

## 各页面详情

### 生肖 `pages/tools/shengxiao.vue`

- **幸运信息卡片**：`card-paper-solid` → `card-warm`，标题 `InkDivider` → `section-header` + seal-icon（字符"幸"）
- **性格特征卡片**：`PersonalityCard` 内部 `card-paper-solid` → `card-warm`
- **流年运势卡片**：同上
- **相性配对卡片**：`CompatibilityGrid` 内卡片 → `card-warm`
- **页面 hero**：`ShengXiaoHero` 子组件内增加 seal-icon 装饰
- **按钮**：`btn-seal` → `btn-cin`（切换生肖、浏览历史、刷新结果）
- **缺失信息提示**：卡片背景视情况替换

### 星座 `pages/tools/constellation.vue`

- **性格特征卡片**：`card-paper-solid` → `card-warm`，标题 `InkDivider` → `section-header` + seal-icon（字符"性"）
- **速配星座网格**：每张卡片 `card-paper-solid` → `card-warm`
- **页面 hero**：`ConstellationHero` 子组件增加 seal-icon
- **按钮**：`btn-seal` → `btn-cin`（浏览历史、刷新运势）
- **今日运势、宜忌面板**：`HoroscopePanel`、`YiJiPanel` 内卡片替换

### 六爻 `pages/tools/yijing.vue`

- **确认对话框**：`card-paper-solid` → `card-warm`
- **结果分区**：`InkDivider` → `section-header` + seal-icon（字符"卦"）
- **解卦面板**：`YijingInterpretation`、`YijingCastingPanel` 内卡片替换
- **按钮**：`btn-seal` → `btn-cin`（重新占卜、确定重新起卦等）

### 八字 `pages/tools/bazi.vue`

- **CollapsibleSection** 每个折叠区的标题栏，增加 seal-icon 装饰（字符对应：命盘"命"、神煞"煞"、日主"主"、五行"行"、大运"运"、流年"年"）
- **解读区** `ReadingGuide` 内卡片 → `card-warm`
- **命主签** `DayMasterSeal` 已使用 seal 风格，无需大幅改动
- **小时缺失提示**：卡片背景替换
- **按钮**：`btn-seal` → `btn-cin`
- **四柱排盘网格** `BaziGrid`：检查容器背景，替换为 `card-warm`

### 紫微斗数 `pages/tools/ziwei.vue`

- **输入表单** `ZiWeiInputForm`：卡片背景 → `card-warm`
- **天星图** `ZiWeiCelestialChart`：已有视觉风格，仅检查外围容器
- **十二宫网格** `ZiWeiPalaceGrid`：替换容器背景
- **详情面板** `ZiWeiDetailPanel` / `ZiWeiDetailSheet`：卡片 → `card-warm`
- **大限时间轴** `ZiWeiDaXianTimeline`：容器背景替换
- **按钮**：`btn-seal` → `btn-cin`

## 执行顺序

从简单到复杂，逐个页面推进：

1. **星座** — 改动最少，最快验证效果
2. **生肖** — 模式类似，巩固模式
3. **六爻** — 对话框 + 结果区
4. **紫微斗数** — 多个子组件需要检查
5. **八字** — 最复杂，折叠区多

## 验收标准

- 每个页面改完 build 通过（`npm run build`）
- 所有卡片统一为暖笺色 `#E8DCC6`
- 分区标题使用朱砂短杠 + 文字模式
- 按钮统一为朱砂实心 `btn-cin`
- 标题文字使用 Ma Shan Zheng 书法体
- 页面内测后无视觉断裂感

## 不做的事

- 不回排序盘布局或计算逻辑
- 不修改子组件内部数据结构
- 不新增功能或交互
- 不改 ToolPageLayout 三栏布局
