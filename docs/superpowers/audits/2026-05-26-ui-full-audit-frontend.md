# Frontend Developer Audit — 组件实现、性能与TypeScript

**日期**: 2026-05-26
**评分**: 72/100

---

## 问题统计

| 类别 | HIGH | MED | LOW | 合计 |
|------|------|-----|-----|------|
| 组件质量 | 3 | 4 | 3 | 10 |
| 布局/响应式 | 0 | 2 | 2 | 4 |
| 性能 | 1 | 4 | 3 | 8 |
| TypeScript 安全 | 1 | 3 | 2 | 6 |
| 其他 | 0 | 4 | 2 | 6 |
| **总计** | **5** | **17** | **12** | **34** |

---

## HIGH 严重问题

### 1. yijing.vue:118,143 — setTimeout 未跟踪清理
`handleCoinAutoResult` 和 `handleCastNumber` 中的 400ms setTimeout 未在 reset/unmount 时清理
→ 将 timer handle 存入 ref，在 handleReset 和 onUnmounted 中 clearTimeout

### 2. bazi.vue:229 — `as BaZiResult` 不安全类型断言
`result.value = record.result_data as BaZiResult` 假设反序列化 JSON 匹配类型
→ 添加运行时类型守卫，至少检查必填字段

### 3. bazi.vue:195 — `catch (e: any)` 不安全属性访问
`e?.statusMessage` 绕过类型检查
→ 用 `unknown`，然后 `e instanceof Error ? e.message : '...'`

### 4. constants/yijing.ts — 721 行单文件无代码分割
导入任何单个值都会拉入整个文件
→ 拆分为 hexagram-data.ts, najia.ts, spirits.ts, line-judgments.ts

### 5. HexagramDisplay.vue:146 — palaceDisplay 始终返回空字符串
死代码 computed，宫位/五行信息未从父组件传入
→ 扩展 HexagramProp 接口，从 YijingInterpretation 传入 palaceName/palaceWuxing

---

## MED 严重问题

### 代码重复
- `elementColor`/`wuxingColor` 在 6 个文件中重复定义 → 提取到 constants/bazi.ts
- `shenShaBadgeStyle` 在 ShenShaPanel 和 LiuNianTimeline 中重复 → 提取共享函数
- Transition CSS 类在 5 个文件中重复

### 性能
- `getCurrentAge()` 在 computed 中每次重算都调用 `new Date()`
- `prefersReducedMotion` 每次点击都执行 `window.matchMedia`
- tools 数组/ELEMENT_LIFE_AREA 等静态数据在组件实例化时重建

### 响应式
- bazi.vue:49 用 `document.querySelector('.max-w-\\[48rem\\]')` 选择 DOM → 应用 template ref
- HexagramDisplay.vue:168 自定义 fadeIn 与父组件冲突

### 类型
- historyRecords API 响应类型为 `any`
- number input ref 类型与实际值不匹配（空字符串 vs null）

### auto-import 违规
- 多个组件显式 import `computed` from 'vue'（Nuxt 已 auto-import）

---

## Top 5 优先级修复

1. **yijing.vue** — setTimeout 清理（stale closure bug）
2. **bazi.vue:229** — BaZiResult 类型守卫
3. **bazi.vue:195** — catch (e: any) → unknown
4. **HexagramDisplay.vue:146** — 宫位显示死代码修复
5. **elementColor/wuxingColor** — 6处重复提取到共享模块
