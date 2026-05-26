# Phase 5 — 六爻占卜设计文档

> **For agentic workers:** This spec covers Yijing (I-Ching / 六爻) divination with full 纳甲装卦 system. Implementation follows via superpowers:writing-plans → superpowers:subagent-driven-development. UI visual design delegated to superpowers:frontend-design.

**Goal:** Build a complete 六爻纳甲占卜 system — number/coin casting, 64-hexagram database, 纳甲装卦 (六亲/六神/世应), 变卦, and rule-template interpretation.

**Architecture:** Pure TypeScript engine (`composables/useYijing.ts`) + static data (`constants/yijing.ts`) + 4 UI components + existing page + reuse existing divinations persistence API.

**Tech Stack:** Nuxt 3 / Vue 3 / TailwindCSS / 墨韵 Ink Resonance design system / sql.js

---

## 一、设计原则

1. **权威数据** — 六十四卦卦辞爻辞使用《周易》经典原文，纳甲规则使用标准纳甲体系，不编造
2. **规则驱动** — 所有解读文字由规则模板拼装生成，不做 AI 生成式文字
3. **仪式感与效率兼顾** — 摇卦动画作为主要交互方式，数字起卦作为快捷入口
4. **流程透明** — 从起卦到装卦的每一步都可追溯查看

---

## 二、核心数据类型

所有类型定义在 `composables/useYijing.ts` 中 export。

### 2.1 静态数据

```typescript
interface HexagramInfo {
  name: string
  judgment: string
  palaceName: string
  palaceIndex: number      // 0-7 乾兑离震巽坎艮坤
  palacePosition: number   // 1-8 within palace
  palaceWuxing: string
  shiPosition: number
  yingPosition: number
  yaoValues: number[]      // 6 numbers [6|7|8|9]
  binary: string           // 6-char '0'/'1', bit 0 = line 1
}
```

### 2.2 运行时数据

```typescript
interface YaoResult {
  value: number      // 6 (老阴/变爻), 7 (少阳), 8 (少阴), 9 (老阳/变爻)
  isYang: boolean
  isChanging: boolean
  display: '老阴' | '少阳' | '少阴' | '老阳'
}

interface ZhuangGuaLine {
  position: number       // 1 (初爻) … 6 (上爻)
  positionName: string   // 初/二/三/四/五/上 ＋ 九/六
  yao: YaoResult
  naJiaStem: string
  naJiaBranch: string
  naJiaDisplay: string
  branchWuxing: string
  sixRelation: string
  sixSpirit: string
  isShi: boolean
  isYing: boolean
  judgment: string
}

interface YijingResult {
  hexagram: HexagramInfo
  lines: ZhuangGuaLine[]
  derivedHexagram: HexagramInfo | null
  derivedLines: ZhuangGuaLine[] | null
  huGua: HexagramInfo | null
  huGuaLines: ZhuangGuaLine[] | null
  score: number
  interpretation: string
}
```

---

## 三、数据层：constants/yijing.ts

### 3.1 六十四卦数据库

完整的 64 条 `HexagramData` 记录，按周易序排列。

数据来源：《周易》原文（通行本）。
- 卦名：如 "乾"、"坤"、"屯"、"蒙"...
- 卦辞：如 "乾，元亨利贞"
- 爻辞：每卦 6 条，从初爻到上爻

必含字段：
- `id`, `name`, `judgment`, `lineTexts[6]`, `upperTrigram`, `lowerTrigram`, `gong`, `shiPos`, `yingPos`

### 3.2 纳甲规则表

八卦纳甲干支映射：

| 卦 | 内卦(下)纳干 | 外卦(上)纳干 | 纳支（从初爻起） |
|----|------------|------------|----------------|
| 乾 | 甲 | 壬 | 子、寅、辰、午、申、戌 |
| 坤 | 乙 | 癸 | 未、巳、卯、丑、亥、酉 |
| 震 | 庚 | 庚 | 子、寅、辰、午、申、戌 |
| 巽 | 辛 | 辛 | 丑、亥、酉、未、巳、卯 |
| 坎 | 戊 | 戊 | 寅、辰、午、申、戌、子 |
| 离 | 己 | 己 | 卯、丑、亥、酉、未、巳 |
| 艮 | 丙 | 丙 | 辰、午、申、戌、子、寅 |
| 兑 | 丁 | 丁 | 巳、卯、丑、亥、酉、未 |

### 3.3 其他规则表

- **八宫五行**：乾兑金、离火、震巽木、坎水、艮坤土
- **地支五行**：复用 constants/bazi.ts 中天干地支五行映射（BRANCH_WUXING），六亲判定需要使用地支转五行
- **六神配日干**：甲乙青龙、丙丁朱雀、戊勾陈、己腾蛇、庚辛白虎、壬癸玄武
- **八宫六十四卦世应位置表**（每宫的 8 个卦各自有预置的世应位置）

---

## 四、计算引擎：composables/useYijing.ts

### 4.1 起卦

#### 摇卦法
```
- 3枚硬币，正面=3，反面=2
- 抛一次求一爻，重复6次
- 三枚之和：
  6(2+2+2) = 老阴   → 变爻
  7(3+2+2) = 少阳   → 不变
  8(3+3+2) = 少阴   → 不变
  9(3+3+3) = 老阳   → 变爻
- 从初爻(第1次)到上爻(第6次)记录
```

#### 数字起卦法
```
- 用户输入3个数字
- 上卦 = 第1个数 mod 8 (0=坤, 1=乾, 2=兑, 3=离, 4=震, 5=巽, 6=坎, 7=艮)
- 下卦 = 第2个数 mod 8
- 变爻 = 第3个数 mod 6 (0=上爻)
注意：变爻索引映射为 0→5(上爻), 1→0(初爻), 2→1(二爻), 3→2(三爻), 4→3(四爻), 5→4(五爻)。即实际索引 = (modResult + 5) % 6。
查表得到 HexagramData 后，根据其阴阳爻模式构建 6 个 YaoResult：变爻位置设为 6（老阴）或 9（老阳），其余位置设为对应的 7（少阳）或 8（少阴）。
- 上下卦组合 → 查表得 HexagramData
输入负数时先取绝对值再取模。
```

### 4.2 装卦流程（共6步）

```
Step 1 — 纳甲干支：
  1a. 确定上下卦各属八卦中的哪一种
  1b. 查纳甲规则表，给6爻分配天干（上卦3爻用外卦干，下卦3爻用内卦干）
  1c. 查纳支表（每卦从初爻起各有6个地支）

Step 2 — 定六亲：
  2a. 以本卦所在宫的五行为"我"
  2b. 每爻地支转五行
  2c. 生克判定：
      生我者 → 父母
      我生者 → 子孙
      克我者 → 官鬼
      我克者 → 妻财
      同我者 → 兄弟

Step 3 — 配六神：
  3a. 取占卜日的天干
  3b. 查六神配日干表，确定初爻六神
  3c. 从初爻到上爻顺序分配：青龙→朱雀→勾陈→腾蛇→白虎→玄武

Step 4 — 定世应：
  4a. 从 HexagramData.shiPos / yingPos 读取预置位置
  4b. 标记对应爻为世/应

Step 5 — 变卦：
  5a. 找出所有变爻位（value=6或9的爻）
  5b. 翻转阴阳生成新卦象
  5c. 查 HexagramData 匹配变卦
  5d. 对变卦重复 Step 1-4 装卦

> **注意：** 变卦六亲的"我"以本卦宫位五行还是变卦宫位五行判定，经典火珠林与后世流派有分歧。当前实现采用 **变卦宫** 为"我"（即变卦独立装卦，自成一宫）。需在实现中明确此选择并在装卦引擎中统一处理。

Step 6 — 互卦：
  6a. 取本卦 2-4 爻（索引 1,2,3）为互卦下卦
  6b. 取本卦 3-5 爻（索引 2,3,4）为互卦上卦
  6c. 查 HexagramData 匹配互卦
```

### 4.3 评分与解读

**评分算法（参考流年的做法）：**
- 基础分 50
- 变爻数量修正：0个→中平(-5)，1个→有变(+5)，2个→多变(-3)，3个以上→剧变(-10)
- 六亲动态修正：官鬼动→-8，妻财动→+5，父母动→-3，子孙动→+6，兄弟动→-5
- 世应关系修正：世爻所带地支与日辰地支相冲（六冲）→-10；世爻地支受日辰地支所生（五行相生）→+8
- 注：当前简化版本以世爻/应爻是否为变爻替代，即世爻动→-10，应爻动→+8
- 最终 clamp 到 0-100

**总结句模板：**
```
"{卦名}卦，{吉凶判定}。{变爻提示}。{六亲动向}。{神煞提示}"
```

示例片段来自查表/规则判定，不编造。

### 4.4 主函数接口

```typescript
function castByCoin(): number[]
// 3枚硬币，抛6次，内部生成随机结果，返回 [line1_value, ..., line6_value]

function castByNumbers(upperNum: number, lowerNum: number, movingNum: number): { values: number[]; changingLine: number }
// upperNum/lowerNum: 1-8 (1=乾~8=坤), movingNum: 1-6 (变爻位置)

function computeYijingResult(values: number[]): YijingResult
// 给定6爻值 [6|7|8|9]，完成完整装卦并返回 YijingResult
```

---

## 五、UI 组件

### 5.1 组件结构

```
pages/tools/yijing.vue              → 页面入口，集成所有子组件
components/tools/yijing/
  ├── YijingCastingPanel.vue        → 起卦交互（摇卦动画 + 数字起卦入口）
  ├── HexagramDisplay.vue           → 卦象（6条线的视觉展示）+ 卦名 + 卦辞
  ├── ZhuangGuaTable.vue            → 纳甲装卦详情表（每爻一行）
  └── YijingInterpretation.vue      → 变卦 + 互卦 + 规则解读文字
```

### 5.2 功能分区

页面使用现有的 `ToolPageLayout.vue`（无侧栏），从上到下的内容流：

1. **起卦区（YijingCastingPanel）**：
   - 默认显示摇卦模式：3枚铜钱 + 摇卦按钮 + 进度指示（第N/6次）
   - 点击"摇卦" → 铜钱翻转动画 → 随机生成该爻
   - 6次完成后自动开始装卦
   - 支持切换到数字起卦（3个数字输入框 + 起卦按钮）

2. **本卦展示（HexagramDisplay）**：
   - 6条爻的卦象（阳/阴线，变爻高亮）
   - 卦名 + 卦辞原文
   - 世应标记

3. **装卦详表（ZhuangGuaTable）**：
   - 表格：爻位 | 纳甲 | 六亲 | 六神 | 世应 | 爻辞
   - 变爻行高亮
   - 六亲使用彩色徽章（复用现有 badge 样式）

4. **变卦/互卦展示（HexagramDisplay 复用）**：
   - 变卦（有变爻时）：卦象 + 卦名 + 卦辞
   - 互卦（可选）：卦象 + 卦名

5. **解读区（YijingInterpretation）**：
   - 评分环形进度条
   - 规则生成的总结句
   - 按维度展开的详细解读

6. **自动保存**：
   - 结果生成后自动 POST 到现有 `/api/divinations`（type=`yijing`）
   - 复用 Phase 4 的静默保存机制

### 5.3 页面集成

`pages/tools/yijing.vue` 遵循现有模式：
- 使用 `ToolPageLayout`，仅使用默认插槽（无 nav/nav-right）
- `onMounted` 中调用 `restoreSession()`
- 页面状态：`result: YijingResult | null`、`castingPhase: 'idle' | 'casting' | 'done'`
- Auto-import 所有子组件

UI 视觉设计委托给 `superpowers:frontend-design` 技能在实现阶段处理。

---

## 六、文件变更总览

```
新增文件：
  composables/useYijing.ts                  # 完整计算引擎（含64卦数据+纳甲规则）
  components/tools/yijing/YijingCastingPanel.vue
  components/tools/yijing/HexagramDisplay.vue
  components/tools/yijing/ZhuangGuaTable.vue
  components/tools/yijing/YijingInterpretation.vue
  pages/tools/yijing.vue
  tests/composables/useYijing.test.ts

无需修改：
  server/api/divinations/index.post.ts      # 已支持 yijing type
  constants/bazi.ts                         # 独立数据，不耦合
```

---

## 七、已知局限

1. **日干获取**：六神需要占卜日的天干。目前系统依赖用户提供日期或使用当前日期。摇卦交互中可在开始前让用户确认日期。
2. **互卦精确性**：互卦取本卦 2-4 爻为下卦、3-5 爻为上卦。此为标准取法，但某些流派有不同互卦规则。
3. **解读深度**：规则模板生成文字覆盖吉凶、变爻、六亲动象、六神方位等基本维度。更深层的生克冲合、月建日辰等维度留待后续增强。
4. **变卦装卦简化**：变卦的装卦使用相同规则，但含变爻的爻位六亲会随宫位变化重新判定。
5. **伏神/飞神**：纳甲体系在六亲不全时需要从宫卦（八纯卦）取伏神。当前实现未包含伏神/飞神查找逻辑，六亲不全的卦象其伏神解读留待后续增强。

---

## 八、测试要求

1. **起卦测试**：
   - 摇卦：给定6组硬币值，验证爻值、阴阳、变爻标记正确
   - 数字起卦：给定3个数，验证上下卦正确、变爻位置正确
   - 边界：i%8=0 对应坤、i%6=0 对应上爻

2. **装卦测试**：
   - 纳甲：乾宫卦的纳甲干支是否符合标准表
   - 六亲：以乾宫金为"我"，验证各爻六亲正确
   - 六神：给定日干，验证六神分配顺序
   - 世应：验证各卦世应位置正确

3. **完整流程测试**：
   - 已知全卦（六爻皆不变）→ 无变卦
   - 单爻变 → 正确生成变卦
   - 多爻变 → 正确生成变卦

4. **64 卦数据测试**（必须实现）：
   - 所有 64 条记录的字段完整性（name/judgment/lineTexts 非空）
   - 每个卦的上下卦组合与卦名通过八宫卦序匹配（用 TRIGRAM_HEXAGRAM_MAP 验证）
   - 世应位置范围 (0-5)
   - 每条记录 6 条爻辞非空

5. **边界情况**：
   - 抽象参数 → 不崩溃
   - 数字起卦负数 → 取绝对值或取模
