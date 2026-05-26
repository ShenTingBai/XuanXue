# Ziwei Doushu (紫微斗数) — Phase 6 Design Spec

## 概述

在 XuanXue 中实现完整的紫微斗数工具。包含排盘引擎（基于 iztro）、3×4 十二宫棋盘、星曜解读、大限时间轴、自动保存。

---

## 1. 技术栈

- **排盘引擎**: [iztro](https://github.com/SylarLong/iztro) v2.5.8 (MIT, TypeScript)
  - `astro.bySolar(dateStr, timeIndex, gender, fixLeap, lang)` 返回完整命盘
  - `astrolabe.horoscope(date)` 获取运限数据
- **适配层**: `composables/useZiwei.ts` — 包装 iztro API，适配为应用数据模型
- **UI**: 现有墨韵设计系统 + TailwindCSS，复用 `ToolPageLayout` 三栏布局

---

## 2. 数据模型

### 2.1 iztro 适配层

iztro 返回的命盘对象已包含所需全部数据。`useZiwei.ts` 做适配转换而非重新建模：

```typescript
interface Palace {
  index: number          // 0-11, 寅=0, 卯=1, ... 丑=11
  name: string           // 命宫、兄弟、夫妻...
  earthlyBranch: string  // 寅、卯、辰...
  heavenlyStem: string   // 甲、乙、丙...
  majorStars: Star[]     // 主星（紫微、天机...）+ brightness
  minorStars: Star[]     // 辅星（左辅、右弼...）
  adjectiveStars: Star[] // 杂曜
  changsheng12: Star[]   // 长生12神
  boshi12: Star[]        // 博士12神
  stage: string          // 大限范围 e.g. "25~34"
  ages: number[]         // 小限年龄
}

interface Star {
  name: string        // 星曜名称
  type: string        // 星曜类型
  brightness?: string // 亮度: "旺"|"庙"|"陷"|"利"|"平"|"不"
}

interface ZiWeiResult {
  mingGongIndex: number        // 命宫地支索引
  shenGongIndex: number        // 身宫地支索引
  wuxingBureau: string         // 五行局 e.g. "水二局"
  palaces: Palace[]            // 12 宫，按地支排序
  fourTransformations: FourTransform[]  // 四化
  horoscope: Horoscope | null  // 运限数据（当前年份）
}

interface FourTransform {
  star: string
  transformation: '禄'|'权'|'科'|'忌'
}
```

### 2.2 规则模板解读结构

为每宫准备结构化解读模板（非 AI 生成）：

```typescript
interface PalaceInterpretation {
  palaceName: string
  summary: string       // 宫位特性总述
  starCombinations: string[]  // 星曜组合解读
  daXianAdvice: string  // 大限流年建议
}
```

规则模板存储在 `constants/ziwei.ts` 中，`useZiwei.ts` 提供 `getPalaceInterpretation()` 方法。

---

### 2.3 iztro 时辰索引映射

iztro 的 `timeIndex` 参数（0-12）对应十二时辰：

```
0=早子时(0-1), 1=丑时(1-3), 2=寅时(3-5), 3=卯时(5-7),
4=辰时(7-9), 5=巳时(9-11), 6=午时(11-13), 7=未时(13-15),
8=申时(15-17), 9=酉时(17-19), 10=戌时(19-21), 11=亥时(21-23),
12=晚子时(23-0)
```

用户选择"时辰"（子丑寅卯...）后映射为对应索引。

---

## 3. 页面布局（Option B — 命盘+侧栏）

```
┌──────────────────────────────────────────────────────┐
│  Header nav (已有)    [紫微斗数]                     │
├───────────────────────────────┬──────────────────────┤
│                               │                      │
│    3×4 Palace Grid           │   Detail Panel        │
│    ┌──┬──┬──┬──┐            │   ┌──────────────┐   │
│    │辰│巳│午│未│            │   │ 命宫 · 寅     │   │
│    │夫妻│子女│财帛│疾厄│    │   │ 紫微 · 天相   │   │
│    ├──┼──┼──┼──┤            │   │ 左辅 · 禄存   │   │
│    │卯│寅│丑│子│            │   │              │   │
│    │兄弟│命宫│父母│福德│    │   │ 命宫位于寅... │   │
│    └──┴──┴──┴──┘            │   │ 紫微入命...   │   │
│                               │   │              │   │
│  DaXian Timeline              │   │ 大限 3-12... │   │
│  ───────────────────          │   └──────────────┘   │
│                               │                      │
│  History Button (右下角)      │                      │
└───────────────────────────────┴──────────────────────┘
```

### 布局要点

- **主区域**（左/中）：3×4 宫位网格 + 底部大限时间轴
- **右侧栏**（#nav-right slot）：sticky 定位，显示选中宫位的详细解读
- **移动端**（<xl）：右侧栏降级为底部抽屉或轮播
- **大限时间轴**：在命盘 grid 下方，显示当前大限高亮

---

## 4. 组件树

```
pages/tools/ziwei.vue
├── ZiWeiInputForm.vue          # 日期+时辰+性别 输入表单
├── ZiWeiPalaceGrid.vue         # 3×4 宫位网格
│   └── ZiWeiPalaceCell.vue ×12  # 单个宫位格
├── ZiWeiDetailPanel.vue        # 右侧栏宫位解读（#nav-right）
├── ZiWeiDaXianTimeline.vue     # 大限时间轴
├── ToolPageLayout              # 三栏布局容器
├── HistoryModal                # 历史记录（复用已有）
└── ZiWeiInfoSidebar            # 个人信息摘要
```

---

## 5. 宫位格设计（已确认）

每个宫位格从上到下：

1. **顶栏**：地支（辰巳午未）+ 宫名标签
   - 命宫特殊高亮（朱砂色边框 + 标签）
2. **主星**（0-3 颗）：大字展示
   - 吉星彩色（紫微→金，天机→玉等）
   - 煞星暗色，显示亮度（庙/旺/陷）
3. **辅星**：小于主星的字号
4. **空宫**：显示 "(空)" 提示
5. **四化**：chip 样式彩色标签（化禄红、化权蓝、化科绿、化忌灰）
6. **大限**：底部小字年龄范围

选中/悬停：朱砂色边框高亮 + 淡朱砂背景

---

## 6. 宫位解读系统

解读为纯规则模板（非 AI 生成），存储在 `constants/ziwei.ts` 中：

### 6.1 宫位特性

每宫一段总述文本，描述该宫在命盘中的基本含义：

```
命宫：代表一个人的先天禀赋、性格特质、人生走向。
兄弟宫：代表兄弟姐妹关系、朋友往来、人际互动。
夫妻宫：代表婚姻状况、配偶特征、感情生活。
...
```

### 6.2 星曜组合解读

基于宫位中的主星组合，匹配模板：

- 单星：如"紫微在命宫" → "紫微入命，帝王之星，性刚果断..."
- 双星：如"紫微+天相" → "紫微天相在命宫，辅弼之星入命..."
- 特殊组合：如"杀破狼"格局

### 6.3 大限解读

结合大限所在宫位 + 大限主星，生成简短的流年建议。

---

## 7. 交互流程

```
用户输入                  输入后自动排盘
┌──────────────┐        ┌──────────────┐
│ 输入生辰      │ ───→   │ 显示完整命盘  │
│ 选择性别      │        │ + 默认选中命宫 │
│ 选择时辰      │        │ + 侧栏命宫解读 │
└──────────────┘        └──────┬───────┘
                               │
                    点击宫位   │
                               ↓
                        ┌──────────────┐
                        │ 高亮所选宫位  │
                        │ 侧栏切换解读  │
                        │ 大限联动高亮  │
                        └──────┬───────┘
                               │
                    自动保存   │
                               ↓
                        ┌──────────────┐
                        │ 静默保存到    │
                        │ Divinations  │
                        │ API          │
                        └──────────────┘
```

---

## 8. API 集成

- **iztro**: 纯客户端计算，无服务端依赖
- **Divinations API**（已有 `POST /api/divinations`）
  - `type: 'ziwei'`（添加 `VALID_TYPES`）
  - 自动静默保存（fire-and-forget），不阻塞 UI
- **HistoryModal** 复用已有组件，type 过滤 `'ziwei'`
- **无额外服务端端点**——iztro 完全在浏览器运行

---

## 9. 文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `constants/ziwei.ts` | 新建 | 星曜解读、宫位特性、四化规则等模板 |
| `composables/useZiwei.ts` | 新建 | iztro 适配层 + 解读方法 |
| `components/tools/ziwei/ZiWeiInputForm.vue` | 新建 | 输入表单（生辰+性别+时辰） |
| `components/tools/ziwei/ZiWeiPalaceGrid.vue` | 新建 | 3×4 宫位网格 |
| `components/tools/ziwei/ZiWeiPalaceCell.vue` | 新建 | 单个宫位格 |
| `components/tools/ziwei/ZiWeiDetailPanel.vue` | 新建 | 右侧栏宫位解读 |
| `components/tools/ziwei/ZiWeiDaXianTimeline.vue` | 新建 | 大限时间轴 |
| `components/tools/ziwei/ZiWeiInfoSidebar.vue` | 新建 | 个人信息摘要（#nav-right） |
| `pages/tools/ziwei.vue` | 新建 | 页面入口 |
| `layouts/default.vue` | 修改 | 导航栏启用 ziwei |
| `pages/index.vue` | 修改 | 首页启用 ziwei |
| `server/api/divinations/index.post.ts` | 修改 | VALID_TYPES 添加 'ziwei' |

---

## 10. 排除范围（Phase 6 不做）

- ❌ AI / LLM 生成的深度解读
- ❌ 三方四正可视化连线
- ❌ 星曜动画或 3D 效果
- ❌ 合盘（双人对比）
- ❌ 流月/流日/流时（仅大限+流年基础）
- ❌ 自定排盘参数（仅 iztro 默认算法）

---

## 11. 成功标准

1. 输入生辰可正确排盘（与 iztro 示例命盘对账）
2. 十二宫在地支网格中正确定位
3. 点击宫位高亮 + 右侧栏显示对应解读
4. 大限时间轴正确显示年龄范围
5. 自动保存到历史记录（fire-and-forget）
6. 历史记录可恢复查看
7. 导航栏和首页入口可用
8. 移动端布局降级可用（右侧栏→底部抽屉/轮播）
