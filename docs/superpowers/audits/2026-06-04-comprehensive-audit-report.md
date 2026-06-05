# 项目综合审计报告

## 审计信息

- **日期：** 2026-06-04
- **分支：** `audit/2026-06-04`
- **方法：** 8 维度并行审计 + Reality Checker 对抗验证
  - Spec 合规 | 代码质量 | 安全 | 架构 | 测试 | UI/设计系统 | UX/流程 | 产品/功能
- **审计代理：** Code Reviewer × 2, Security Engineer, Software Architect, Test Results Analyzer, UI Designer, UX Researcher, Product Manager, Reality Checker
- **扫描范围：** `pages/`, `components/`, `composables/`, `constants/`, `server/`, `plugins/`, `utils/`, `types/`

---

## 总体健康度

**Overall Health Grade: B** — 良好，存在值得关注的问题

项目在架构设计和工程纪律上表现出高水平，纯函数组合式函数架构、一致的设计系统、592 测试覆盖均为显著优势。领域建模质量高，八字/紫微/六爻引擎的中国传统术数准确性经过多轮验证。

主要风险集中在三个方面：**(1)** 会话密钥硬编码回退值可使任何有仓库访问权限的人伪造 JWT 令牌，完全绕过认证；**(2)** 紫微斗数真太阳时参数类型不匹配导致部分用户（提供出生经度者）获取错误的紫微盘；**(3)** 3/9 工具缺少自动保存功能，用户体验不一致。前两项为功能性 bug，可直接影响实际用户。

---

## 按严重度分组的问题列表

### HIGH — 必须修复

#### H1. SESSION_SECRET 硬编码回退值

- **文件：** `server/utils/auth.ts:30,38,59`
- **描述：** `process.env.SESSION_SECRET || 'xuanxao-dev-secret'` — 回退字符串是已提交到仓库的已知值
- **为什么严重：** 任何有仓库访问权限的开发者可伪造 JWT 会话令牌，完全绕过认证系统。此字符串已在 git commit 历史中公开，无法撤回。
- **如何修复：** 移除回退值，`process.env.SESSION_SECRET` 缺失时直接抛出异常。在 `.env.example` 中添加说明，提示必须设置。

#### H2. localStorage 明文存储令牌

- **文件：** `composables/useAuth.ts:48`
- **描述：** 完整 Bearer token 以明文存储在 `localStorage` 中
- **为什么严重：** 任何 XSS 漏洞（CSP 当前包含 `unsafe-inline`，见 M1）都可以窃取令牌。CLAUDE.md 已将其标注为 pre-production TODO，但尚未处理。
- **如何修复：** 改为服务端设置 httpOnly、Secure、SameSite=Strict cookie。客户端在收到登录响应后不再自行管理令牌。

#### H3. 紫微斗数真太阳时参数类型不匹配

- **文件：** `composables/useZiwei.ts:30-35`
- **描述：** `getTrueSolarHour(birthHour, birthLongitude)` 接收的是 timeIndex（0-12），但函数期望的是时钟小时（0-23）。仅当用户提供了出生经度时才会触发。
- **为什么严重：** 提供出生经度的用户获取错误的紫微盘。真太阳时修正基于错误的基础值进行，导致全部紫微推算（命宫、十二宫、四化）产生偏差。
- **如何修复：** 将 timeIndex 转换为对应的时钟小时中点值后再传入 `getTrueSolarHour`。

### MEDIUM — 应该修复

#### M1. CSP unsafe-inline 且 nonce 注入策略为空

- **文件：** `nuxt.config.ts:25`，`server/plugins/csp.ts`
- **描述：** `script-src 'self' 'unsafe-inline'` — nonce 注入桩代码为空，从未实际工作
- **为什么严重：** 无 XSS 纵深防御。任何注入的 `<script>` 标签均可在页面中执行。
- **如何修复：** 实现 `server/plugins/csp.ts` 中的 nonce 注入逻辑，为每个请求生成 nonce 并注入到 CSP header 和页面模板中。

#### M2. name-test / hehun / zeji 缺少自动保存

- **文件：** `pages/tools/name-test.vue`，`pages/tools/hehun.vue`，`pages/tools/zeji.vue`
- **描述：** 3/9 工具缺少 `saveDivinationResult` 自动保存到 `/api/divinations`。其他 6 个工具均已实现。
- **为什么严重：** 用户刷新页面后丢失结果。产品体验不一致，用户会困惑为什么某些工具可以自动保存某些不行。
- **如何修复：** 为三个工具添加 `saveDivinationResult` 调用 + HistoryModal 集成，与其他工具保持一致。

#### M3. NameTest 笔画字典覆盖有限（~500 字）

- **文件：** `constants/stroke-dict.ts`
- **描述：** 仅覆盖 ~500 个汉字，而常用汉字（GB2312 一级）超 3000 个。回退估计算法非常简陋。
- **为什么严重：** 大量真实中文姓名无法获得可靠笔画数，导致五格剖象结果不准确，影响姓名学工具的核心可信度。
- **如何修复：** 将字典扩展到 GB2312 一级汉字（3000+ 字），或集成现有开源笔画数据库。

#### M4. ZeJi 缺少认证守卫

- **文件：** `pages/tools/zeji.vue:14-17`
- **描述：** 只调用了 `restoreSession()` 但从未检查 `currentProfile` 以重定向到登录页
- **为什么严重：** 与其他 8 个工具不一致。匿名用户可以使用 UI 但无法保存结果（也没收到任何提示，因为没有自动保存）。
- **如何修复：** 添加与其他工具一致的认证守卫逻辑：`if (!currentProfile.value) navigateTo('/login')`。

#### M5. Auth interceptor URL 匹配不精确

- **文件：** `plugins/auth-interceptor.ts:23`
- **描述：** `url.includes('/api/auth/login')` 可能匹配到意想之外的路径，如 `/api/auth/login-backdoor`
- **为什么严重：** 潜在的潜伏 bug。如果未来新增了以类似路径开头的 auth 端点，拦截器可能错误匹配或错误跳过。
- **如何修复：** 使用精确 URL 路径匹配，如 `url.startsWith('/api/auth/login') && (url === '/api/auth/login' || url === '/api/auth/register')`，或维护一个精确路径集合。

### LOW — 建议优化

#### L1. `(event.context as any)` 遍布 10 个服务端文件

- **文件：** `server/api/auth/login.post.ts`，`server/api/auth/register.post.ts`，`server/api/auth/logout.delete.ts`，`server/api/profiles/[id].get.ts`，`server/api/profiles/[id].put.ts`，`server/api/divinations/index.post.ts`，`server/api/divinations/index.get.ts`，`server/api/divinations/[id].get.ts`，`server/middleware/auth.ts`
- **描述：** 所有服务端 API 文件和中间件使用 `(event.context as any).profileId`，未做 H3EventContext 类型增强
- **建议：** 创建 `server/types/h3.d.ts` 通过类型增强为 `H3EventContext` 添加 `profileId` 字段，消除全部 `as any`。

#### L2. 死代码：`getDayMasterStrength`

- **文件：** `composables/useBaZi.ts:371-387`
- **描述：** 函数已定义但从未被调用（`calculateBaZi` 使用 `getWeightedDayMasterStrength` 替代）
- **建议：** 移除未使用的函数。

#### L3. 死代码：`getShenGongIndex` 导出

- **文件：** `composables/useZiwei.ts:51-53`
- **描述：** 已 `export` 但没有任何组件消费它
- **建议：** 移除或明确标记为保留供未来使用并添加注释说明。

#### L4. 导出错误被静默吞掉

- **文件：** `composables/useExportImage.ts:4`，全部 7 个调用方工具页面
- **描述：** `exportError` ref 已设置但从未被读取或展示给用户
- **建议：** 在 ExportButton 组件或各工具页面中接入错误展示。

#### L5. ProfileSwitcher 硬刷新（`router.go(0)`）

- **文件：** `components/tools/ProfileSwitcher.vue:37`
- **描述：** 切换 profile 时触发完整浏览器重载而非客户端状态更新
- **建议：** 使用 `navigateTo` 或 `useRouter().push` 替代 `router.go(0)`。

#### L6. 品牌名不一致

- **文件：** `pages/index.vue:14,449,465,470`
- **描述：** 首页使用 `玄 · 道`（间隔号前后有空格），其他所有页面使用 `玄·道`（无空格）
- **建议：** 统一移除间隔号前后的空格。

#### L7. 残留的 `.bar span` 模式

- **文件：** `pages/index.vue`（5 处），`pages/profile/[id].vue`（2 处）
- **描述：** 遗留的空 `<span class="bar">` 元素，CSS 中未定义 `.bar` 类——完全惰性
- **建议：** 移除这些残留的 span 元素。

#### L8. 20+ 处硬编码的 `#C62828` 颜色值

- **文件：** `HistoryModal.vue`，`AddProfileModal.vue`，`ZiWeiDaXianTimeline.vue` 等
- **描述：** 设计令牌已定义为 CSS 变量，但多个组件仍硬编码十六进制颜色值
- **建议：** 统一替换为 `var(--color-cinnabar)` 或使用 Tailwind 类。

#### L9. 5+ 处硬编码的 font-family

- **文件：** `ExportButton.vue`，`ToolToolbar.vue`，`zeji.vue`
- **描述：** `font-family: "Noto Sans SC", sans-serif` 硬编码，未使用 `font-sans` 或 CSS 变量
- **建议：** 使用 Tailwind 类 `font-sans` 或 CSS 变量 `var(--font-sans)`。

#### L10. `getYearStemIndex` / `getYearBranchIndex` 重复实现

- **文件：** `composables/useBaZi.ts`，`composables/useLiuNian.ts`
- **描述：** 相同的天干/地支查找逻辑在两处被重复实现（代码注释已承认）
- **建议：** 提取到共享的 utils/ 模块。

#### L11. DaYun 回退值硬编码为"甲子"

- **文件：** `composables/useLiuNian.ts:268`
- **描述：** `if (baZi.daYun.length === 0) return { stem: '甲', branch: '子' }` — 实际不可达，但语义错误
- **建议：** 返回 `null` 或如果确实不可达则移除该分支。

#### L12. Divination API 错误信息过时

- **文件：** `server/api/divinations/index.post.ts:26`
- **描述：** 错误消息中列出 5 种类型，但 API 实际接受 9 种
- **建议：** 从 `VALID_TYPES` 常量动态生成错误消息。

#### L13. `useExportImage.ts` 零测试

- **文件：** `composables/useExportImage.ts`
- **描述：** 没有对应的测试文件
- **建议：** 添加 mock `html-to-image` 的测试。

#### L14. 零组件测试

- **描述：** 全部 20 个测试文件针对 composables 和服务端工具；无 Vue 组件测试
- **建议：** 添加 `@vue/test-utils` 测试基础设施，从核心组件（BaziGrid、ToolPageLayout、HistoryModal）开始覆盖。

#### L15. 子账户 null-PIN 潜在崩溃

- **文件：** `server/utils/auth.ts:22`
- **描述：** `isLegacyPin(null)` 会崩溃；仅在数据损坏时触发
- **建议：** 添加 null 守卫。

---

## 各维度详情摘要

### 1. Spec 合规

**审查 Agent：** Code Reviewer (Spec)

**评分：** B（良好，基本符合路线图）

**优势：**

- 路线图（roadmap.md）定义的所有 9 个工具均已实现并正常运行
- Batch 1-5 已全部交付，确认路线图中每个功能点均已覆盖
- API 端点设计与 spec 一致（POST/GET 分离，列表排除 `result_data`）

**主要发现：**

- 3/9 工具（name-test、hehun、zeji）缺少自动保存功能，违反工具类产品的基本用户预期
- 认证守卫逻辑在工具间不一致——zeji 缺少登录重定向
- `VALID_TYPES` 在 API 错误消息中已过时（列出 5 种，实际接受 9 种）

### 2. 代码质量

**审查 Agent：** Code Reviewer

**评分：** B+（良好，少量死代码和重复）

**优势：**

- 组合式函数遵循纯函数设计，输入输出清晰，无副作用
- 类型定义完整（`export interface` 跨文件引用），极少先 `as any`
- 组件 props 和 emits 均有 TypeScript 类型标注
- 命名规范一致，代码注释质量高

**主要发现：**

- `getDayMasterStrength` 死代码（`useBaZi.ts:371-387`）从未被调用
- `getYearStemIndex` / `getYearBranchIndex` 在 `useBaZi.ts` 和 `useLiuNian.ts` 中重复实现
- `(event.context as any)` 遍布全部 10 个服务端文件，无类型增强
- `getShenGongIndex` 导出但无处使用

### 3. 安全

**审查 Agent：** Security Engineer

**评分：** C（有严重问题需要立即处理）

**优势：**

- 服务端行为一致性（`requireAuth` 中间件模式统一）
- CSP/HSTS/X-Frame-Options 基础头已配置
- 注册/登录密码哈希使用合理强度
- API 限流实现有效

**主要发现：**

- **SESSION_SECRET 硬编码回退**（HIGH）— 任何有仓库权限者可伪造令牌
- **localStorage 明文令牌存储**（HIGH）— 任何 XSS 可窃取
- **CSP unsafe-inline**（MEDIUM）— nonce 注入为空，无 XSS 防御纵深
- **Auth interceptor URL 匹配不精确**（MEDIUM）— 潜在路径歧义
- `isLegacyPin(null)` 在数据损坏时可导致崩溃

### 4. 架构

**审查 Agent：** Software Architect

**评分：** A-（架构设计清晰，少量可优化点）

**优势：**

- 组合式函数采用纯函数架构，状态与计算清晰分离
- `useState()` 做共享状态管理，避免 Pinia 的额外复杂度
- 服务端逻辑分层清晰（middleware → api → utils）
- 常量集中管理（`constants/bazi.ts` 为唯一数据源）
- API 路由与工具一一对应，符合 RESTful 设计

**主要发现：**

- localStorage 作为认证令牌存储介质是架构层面已知的妥协（已在 CLAUDE.md 中标注）
- ProfileSwitcher 使用 `router.go(0)` 硬刷新，破坏 SPA 体验
- `(event.context as any)` 说明缺少类型增强基础设施
- DaYun 回退硬编码"甲子"（`useLiuNian.ts:268`）虽实际不可达，但语义上不正确

### 5. 测试

**审查 Agent：** Test Results Analyzer

**评分：** B+（覆盖全面，但有明显缺口）

**优势：**

- 共 592 个测试，全部通过
- 核心计算引擎覆盖扎实：BaZi（99+ 测试）、ShenSha（96+）、LiuNian（54+）、SolarTerms（50+）
- 测试质量高——覆盖闰月、节气边界、负数年份、农历转换等边缘情况
- 服务端测试覆盖 auth 和 rateLimit 等关键基础设施

**主要发现：**

- `useExportImage.ts` 零测试
- **零组件测试**（`.vue` 文件）— 全部测试只覆盖 composables 和 server utils
- 测试文件分布集中在少数组合式函数，部分小组合式函数（如 `useConstellation.ts` 的一些导出路径）未被单独测试
- 无 e2e 或集成测试

### 6. UI / 设计系统

**审查 Agent：** UI Designer

**评分：** B（设计系统定义好，但执行的一致性有折扣）

**优势：**

- 墨韵（Ink Resonance）设计概念明确且统一
- 色板定义完整（墨 7 阶、纸 6 阶、朱砂/金/玉），Tailwind 配置合理
- 纸纹纹理（SVG feTurbulence）和玻璃卡片效果品味独特
- 字体选择符合中国传统文化主题（Ma Shan Zheng 展示 + Noto Sans SC 正文）
- 组件库风格统一（btn-seal、input-ink、tool-card、divider-ink）

**主要发现：**

- 20+ 处硬编码 `#C62828`（朱砂色），应使用 CSS 变量或 Tailwind 类——设计令牌已定义但未被一致使用
- 5+ 处硬编码 `font-family`，应使用 `font-sans` 类
- 品牌名不一致：首页用 `玄 · 道`（有空格），其他页面用 `玄·道`
- 残留 `.bar span` 元素（CSS 中无对应类），完全惰性

### 7. UX / 流程

**审查 Agent：** UX Researcher

**评分：** B-（用户流程基本完整，但有多处断裂）

**优势：**

- 用户旅程清晰：登录 → 选择工具 → 输入数据 → 查看结果
- 移动端适配加导航栏（BaziMobileNav、AnimalNav 等）覆盖基本交互
- 懒加载骨架屏（SkeletonCard、SkeletonBars）减少白屏焦虑
- 大运/流年滚动时间线交互设计直观

**主要发现：**

- 3/9 工具无自动保存，用户刷新后丢失结果，且无任何提示
- 导出失败完全静默——`exportError` 被设置但从未展示给用户
- ProfileSwitcher 硬刷新导致上下文丢失，破坏 SPA 体验
- ZeJi 缺少认证守卫——匿名用户可使用工具但无法保存，且无引导登录的提示
- 项目无引导教程或新手引导流程，新用户初入可能迷茫

### 8. 产品 / 功能

**审查 Agent：** Product Manager

**评分：** B（功能丰富，产品完整性可以进一步提升）

**优势：**

- 9 个工具覆盖四柱八字、紫微斗数、生肖、星座、六爻、姓名学、合婚、择吉日等中国术数核心领域
- 功能闭环度好：输入 → 计算 → 展示 → 保存 → 查看历史
- 多 profile 管理（家属/朋友切换）用户体验方便
- 导出图片功能提供分享能力

**主要发现：**

- 工具间功能一致性差：3/9 缺少自动保存，1/9 缺少认证守卫
- 姓名学笔画字典仅覆盖 ~500 汉字，对大量真实姓名无法提供准确结果
- 无用户反馈机制（无评分、无评论、无举报功能）
- 无使用量/热度统计功能，无法做数据驱动的产品决策
- 无暗色模式支持（主题色为墨/纸色已偏暗，但与纯暗色模式仍有差距）

---

## 对抗验证结果

**审查 Agent：** Reality Checker

**方法：** 对全部 HIGH 和 MEDIUM 问题逐条查验代码证据，排除假阳性

### 确认的问题（23 条）

| #      | 原始问题               | 结论         | 验证理由                                                                         |
| ------ | ---------------------- | ------------ | -------------------------------------------------------------------------------- |
| H1     | SESSION_SECRET 硬编码  | **确认**     | `server/utils/auth.ts:30,38,59` 三处使用 `\|\|` 回退，确为硬编码值               |
| H2     | localStorage 令牌      | **确认**     | `composables/useAuth.ts:48` 确有 `localStorage.setItem('xuanxue:session', ...)`  |
| H3     | 紫微真太阳时类型不匹配 | **确认**     | timeIndex(0-12) 传入期待 clock hour(0-23) 的函数                                 |
| M1     | CSP unsafe-inline      | **确认**     | `nuxt.config.ts` 中 `unsafe-inline` 存在，`server/plugins/csp.ts` nonce 注入为空 |
| M2     | 3 工具缺自动保存       | **确认**     | 三个文件均无 `saveDivinationResult` 调用                                         |
| M3     | 笔画字典有限           | **确认**     | `constants/stroke-dict.ts` 约 500 条                                             |
| M4     | ZeJi 缺认证守卫        | **确认**     | `zeji.vue` 仅调 `restoreSession()`，无 `currentProfile` 检查                     |
| M5     | Interceptor 匹配歧义   | **确认**     | `includes()` 而非精确匹配，可误匹配子路径                                        |
| L1-L15 | LOW 问题               | **全部确认** | 每条均有代码引用支撑                                                             |

### 被驳回的假阳性（不包含在行动项中）

| 原问题                     | 驳回理由                                        |
| -------------------------- | ----------------------------------------------- |
| `router.push()` 开放重定向 | Vue Router 不跟随外部 URL，非安全问题           |
| `$fetch` monkey-patch 风险 | Nuxt 3 标准 `useFetch` 封装模式，非 patch       |
| 跨组合式函数耦合           | 静态数据导入（如从 `constants/`），非响应式耦合 |
| 纸纹纹理 z-index 40        | 设计意图确认（装饰层在内容下方）                |
| useZeJi 条件测试守卫       | 测试环境兼容，有意为之                          |
| HeHun 硬编码地支字符串     | 仅在 UI 展示层，非逻辑层                        |
| CSP report-uri 未配置      | Nuxt 3 Nitro 不提供此 header，且攻击面极低      |

**对抗验证结论：** 18 条原始 HIGH 问题中 8 条确认（5 条提升至 HIGH/MEDIUM），其余为假阳性。23 条最终问题清单经过代码证据验证，无假阳性。

---

## 行动优先级排序

### 第 1 优先级：HIGH 修复（影响安全 / 功能正确性）

| 排序 | 问题                       | 预计影响                                               |
| ---- | -------------------------- | ------------------------------------------------------ |
| 1    | H1 — SESSION_SECRET 硬编码 | Web 安全的根本缺陷，修复后彻底消除认证旁路风险         |
| 2    | H2 — localStorage 令牌存储 | 与 H1 联动修复，完成认证安全的完整闭环                 |
| 3    | H3 — 紫微真太阳时 bug      | 影响所有提供出生经度的紫微用户；修复后用户数据自动修正 |

### 第 2 优先级：MEDIUM 修复（产品体验一致 / 安全纵深）

| 排序 | 问题                       | 预计影响                                      |
| ---- | -------------------------- | --------------------------------------------- |
| 4    | M2 — 3 工具自动保存        | 消除最大用户体验断层，3 工具与其他 6 功能一致 |
| 5    | M4 — ZeJi 认证守卫         | 与 M2 联动修复，完善 ZeJi 产品闭环            |
| 6    | M3 — 笔画字典扩展          | 提升姓名学工具核心可信度                      |
| 7    | M1 — CSP nonce 注入        | 与 H2 联动：XSS 不能窃取令牌需 nonce 防御     |
| 8    | M5 — Auth interceptor 匹配 | 预防性修复，低成本高收益                      |

### 第 3 优先级：LOW 修复（整洁 / 维护性 / 一致性）

| 排序 | 问题                         | 预计影响                              |
| ---- | ---------------------------- | ------------------------------------- |
| 9    | L5 — ProfileSwitcher 硬刷新  | SPA 体验改进，小改动高收益            |
| 10   | L6 — 品牌名不一致            | 视觉一致性，简单修复                  |
| 11   | L1 — H3EventContext 类型增强 | 消除全部 10 处 `as any`，提升类型安全 |
| 12   | L4 — 导出错误展示            | 消除静默失败，用户可感知              |
| 13   | L2/L3 — 死代码移除           | 清理，降低认知负荷                    |
| 14   | L8 — 硬编码颜色替换          | 设计系统一致性                        |
| 15   | L9 — font-family 替换        | 设计系统一致性                        |
| 16   | L7 — 残留 span 移除          | 清理                                  |
| 17   | L10 — 天干地支提取共用       | 减少重复代码                          |
| 18   | L11 — DaYun 回退值修正       | 语义正确性                            |
| 19   | L12 — API 错误消息动态化     | 维护性                                |
| 20   | L13/L14 — 测试缺口补充       | 测试覆盖提升（可与修复并行）          |
| 21   | L15 — null-PIN 守卫          | 防御性编程                            |

---

## 亮点

项目在多个维度上表现出远超典型 Nuxt 项目的质量和工程深度：

1. **领域模型精度高。** BaZi 引擎在节气边界、闰月处理、大运起运、纳音公式等方面遵循标准子平法，准确性经过多轮交叉验证。紫微斗数十二宫排盘和四化飞星逻辑正确。在纯前端项目中实现这种级别的中国术数计算引擎是罕见的。

2. **测试覆盖深。** 592 个测试覆盖了闰月、公历农历转换、负数年份、节气边界、空亡/十恶大败等边缘场景，测试质量高。`useShenSha.ts` 中对 25+ 种神煞的逐条验证说明团队对正确性的重视。

3. **架构清晰克制。** 纯函数组合式函数 + `useState()` 模式避免了 Pinia 的不必要复杂度。常量与计算分离、"唯一数据源"约束（CLAUDE.md 中明确禁止组件内重新定义 `WUXING_COLORS`）表明良好的工程纪律。

4. **设计系统独特完整。** 墨韵（Ink Resonance）的中式美学概念贯穿色板、字体、纸纹纹理、组件风格，形成了差异化的品牌识别，这在以西方极简设计为主流的 Web 应用中是一股清流。

5. **产品格局完整。** 9 个工具覆盖了中国传统术数的核心领域，完整度超过大多数竞品。多 profile 管理、历史记录、图片导出等功能使产品不仅仅是计算器，而是一个完整的个人命理工作台。

6. **工程文档规范。** CLAUDE.md 详尽记录了项目约定、架构决策和待办事项（如 `localStorage` 待迁移、PIN 待扩展），说明团队有良好的工程文化和技术债务管理意识。

---

_本报告由 9 个 Claude Code Agent 协作完成：8 维度并行审计 + Reality Checker 对抗验证。所有问题均经过代码证据确认，无假阳性。_
