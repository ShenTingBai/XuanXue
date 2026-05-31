# Phase 4 — 八字增强设计文档

> **状态：已完成** — 对应设计已实现
>
> **For agentic workers:** This spec covers ShenSha (神煞) calculation, LiuNian (流年) detailed analysis, and divination result persistence. Implementation follows via superpowers:writing-plans → superpowers:subagent-driven-development.

**Goal:** 在 Phase 3 八字排盘基础之上，增加权威全量神煞系统、前后各5年流年详批、以及测算记录自动保存。

**Architecture:** 纯前端 TypeScript 计算引擎 ×2（useShenSha.ts, useLiuNian.ts） + 2个新 API（divinations CRUD） + 3个新 UI 组件 + 现有八字页面集成。

**Tech Stack:** Nuxt 3 / Vue 3 / TailwindCSS / 墨韵 Ink Resonance 设计系统 / sql.js

---

## 一、设计原则

1. **严谨计算，不编造** — 神煞通过权威查表法定位，流年解读文本全部由规则模板拼装生成，不做 AI 生成式文字
2. **数据密度递进** — 神煞→流年，信息层级从静态命局到动态运势，自然的阅读流
3. **当前年为重点** — 今年展开完整分析维度，前后年份提供紧凑概览
4. **保存即透明** — 测算记录自动静默保存，不打断用户操作

---

## 二、神煞系统

### 2.1 计算引擎

**文件：** `composables/useShenSha.ts`

**接口：**
```typescript
interface ShenShaInput {
  yearPillar: BaZiPillar
  monthPillar: BaZiPillar
  dayPillar: BaZiPillar
  hourPillar: BaZiPillar | null
  dayMaster: string      // 日干
  dayMasterIndex: number // 日干序数 0-9
  gender: '男' | '女' | null
}

interface ShenSha {
  name: string           // 神煞名称
  category: '吉' | '凶' | '中性'
  source: string         // 推算来源（如 "年支", "日干", "月支"）
  pillar: '年柱' | '月柱' | '日柱' | '时柱' | '命宫' | '大运'
  position: '天干' | '地支' | '本柱'
  description: string    // 一句话含义
}

function calculateShenSha(input: ShenShaInput): ShenSha[]
```

**神煞清单（权威来源，按推算维度分组）：**

以年支查：
- 天乙贵人、禄神、驿马、华盖、桃花（咸池）、将星、灾煞、劫煞、孤辰、寡宿

以日干查：
- 太极贵人、福星贵人、文昌贵人、学堂、词馆、羊刃、飞刃

以月支查：
- 天德贵人、月德贵人

以日支查：
- 天赦、十恶大败

通用/其他（查多个来源）：
- 空亡、魁罡、金舆、红鸾、天喜、血刃、丧门、吊客、勾绞、元辰

**分类规则：**
- 吉神：天乙、太极、福星、文昌、学堂、词馆、天德、月德、天赦、禄神、将星、金舆、红鸾、天喜
- 凶煞：羊刃、劫煞、灾煞、孤辰、寡宿、空亡、十恶大败、魁罡、血刃、丧门、吊客、勾绞、元辰、飞刃
- 中性：驿马、华盖、桃花（咸池）

**输出数量预估：** 完整命局约 20-40 个神煞。

### 2.2 展示组件

**文件：** `components/tools/bazi/ShenShaPanel.vue`

**布局：** 四柱表格下方，分为三组（吉/凶/中性），每组一个横向标签云。
- 吉神用玉色（#4A7C59）徽章
- 凶煞用朱砂（#C62828）徽章（但淡化处理，避免吓人）
- 中性用墨色（#6B5B4F）徽章
- 每个徽章 hover 时 tooltip 显示含义和来源

**文字内容：**
- 徽章上只显示神煞名称
- 含义用简短的一句话，同样来自查表，不编造

---

## 三、流年详批

### 3.1 计算引擎

**文件：** `composables/useLiuNian.ts`

**接口：**
```typescript
interface LiuNianInput {
  baZi: BaZiResult           // 原局八字
  shenSha: ShenSha[]         // 已计算的神煞
  currentYear: number        // 当前年份
  range: number              // 前后各多少年，默认 5
}

interface LiuNianYear {
  year: number
  stem: string               // 流年天干
  branch: string             // 流年地支
  stemWuxing: string         // 天干五行
  branchWuxing: string       // 地支五行
  tenGod: string             // 流年天干对日主的十神
  tenGodWuxing: string       // 十神对应的五行（生克关系）
  isFavorable: boolean       // 流年五行是否为喜用神
  earthRelations: EarthRelation[]  // 流年地支对四柱地支的关系
  shenSha: ShenSha[]         // 流年特有的神煞
  score: number              // 综合评分 0-100
  summary: string            // 规则生成的总结句
  daYunStem: string          // 对应大运天干
  daYunBranch: string        // 对应大运地支
  
  // 仅当前年展开
  detail?: {
    daYunInteraction: string   // 天地配合解读
    pillarsInteraction: string[] // 对每柱的影响
    monthlyStems: Array<{ month: number, stem: string, branch: string }> // 12个月干支
  }
}

interface EarthRelation {
  type: string               // 合/冲/刑/害/破
  target: string             // 被影响的地支
  targetPillar: string       // 被影响的柱
  description: string        // 规则生成的一句话
}

function calculateLiuNian(input: LiuNianInput): LiuNianYear[]
```

**评分算法：**
- 基础分 50
- 流年天干是否为喜用神：+30（是）/ -20（否）
- 流年地支对日主地支的刑冲合害：
  - 合：+10
  - 冲：-15
  - 刑：-12
  - 害：-8
- 流年神煞：吉神 +5，凶煞 -5
- 与日柱的关系加权 1.5x
- 最终 clamp 到 0-100

**总结句生成规则（模板拼装）：**

总结句由以下片段拼接：
```
"{tenGod}年" + "{五行匹配判定}" + "{地支关系判定}" + "{神煞提示}"
```

示例：
- "正官年，木为喜神，事业运佳" → 十神=正官 + 喜用匹配 + 官星正面解读
- "比肩年，水土相战，流年冲日支，注意变动" → 十神=比肩 + 五行冲突 + 地支冲 + 警告提示

每个片段都是查表/规则判定驱动的，不编造。

**月份干支计算：**
- 从当年立春开始，按节气划分12个月
- 使用年上起月法（五虎遁），直接复用 `useSolarTerms.ts`

### 3.2 展示组件

**文件：** `components/tools/bazi/LiuNianTimeline.vue`

**当前年卡片（展开）：**
- 顶部突出显示年份 + 干支 + 十神 + 评分
- 评分用环形进度条
- 与四柱的地支关系逐一列出（用颜色标记合/冲/刑/害）
- 流年神煞标签
- 12个月干支网格
- 对应大运信息

**前后年份卡片（紧凑）：**
- 水平时间线布局，桌面端一行，移动端垂直堆叠
- 每卡片：年份、干支、十神、评分条、一句话总结
- 点击可展开更多详情

**位置：** 放在大运时间线（DaYunTimeline）之后，神煞面板之前或之后。

---

## 四、测算记录保存

### 4.1 API 设计

**POST /api/divinations** — 保存测算记录
```
Request:
  Authorization: Bearer <token>
  Body: {
    type: 'bazi',
    input_data: { birthYear, birthMonth, birthDay, birthCalendar, birthHour, gender },
    result_data: { ...完整的 BaZiResult 序列化 }
  }

Response: { id, created_at }
```

**GET /api/divinations?type=bazi** — 获取历史列表
```
Request:
  Authorization: Bearer <token>
  Query: type=bazi

Response: [
  { id, type, input_data, created_at }
]
// 注意：列表不返回完整 result_data，减少传输量
```

**GET /api/divinations/[id]** — 获取单条详情
```
Request:
  Authorization: Bearer <token>

Response: { id, type, input_data, result_data, created_at }
```

**安全规则：**
- `profile_id` 从 token 解析，只能读写自己的记录
- 速率限制：每分钟 10 次

### 4.2 前端行为

- 八字排盘成功后，自动 POST 保存（静默，不弹提示）
- 保存成功后，结果卡片显示轻量"已保存"标签
- 八字页面顶部增加"历史记录"下拉按钮
- 下拉显示最近 5 条：日期 + 日主 + 简要描述
- 点击某条记录 → 恢复该排盘结果到当前页面

---

## 五、文件变更总览

```
新增文件：
  composables/useShenSha.ts
  composables/useLiuNian.ts
  components/tools/bazi/ShenShaPanel.vue
  components/tools/bazi/LiuNianTimeline.vue
  server/api/divinations/index.post.ts
  server/api/divinations/index.get.ts
  server/api/divinations/[id].get.ts
  tests/composables/useShenSha.test.ts
  tests/composables/useLiuNian.test.ts

修改文件：
  pages/tools/bazi.vue              # 集成 ShenShaPanel + LiuNianTimeline + 历史记录
  constants/bazi.ts                 # 可能新增神煞相关常量
  server/database/schema.ts         # 无需修改（表已存在）
```

---

## 六、测试要求

- 神煞：验证权威样例数据（如已知某年支为子的命局中天乙贵人在申），至少 15 个神煞的正确性
- 流年：验证流年干支计算、十神正确性、评分范围、总结句模板覆盖
- API：验证 divinations CRUD、认证、速率限制
- 已知局限性在 CLAUDE.md 中记录
