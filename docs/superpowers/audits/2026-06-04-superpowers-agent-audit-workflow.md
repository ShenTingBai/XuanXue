# superpowers 技能 × Agent 类型 协同审计方案

> **保存日期：** 2026-06-04
> **用途：** 可复用的全面项目审计流水线，组合 superpowers 审查流程 + Claude Code Agent 专业人员

## Context

项目需要一套可复用的全面审计方案。superpowers 提供**审查流程模板**（怎么审），Claude Code Agent 类型提供**专业审查人员**（谁来审），两者组合形成规范化的多维度审计流水线。

## 核心原理

```
superpowers 技能 (流程)     ×     Agent 类型 (人员)     =     审计流水线
─────────────────────           ──────────────────         ────────────────
requesting-code-review         Code Reviewer              代码+规格审查
  ├─ code-reviewer.md (模板)    Software Architect        架构审查
  └─ 输出: Strengths/Issues/    Security Engineer         安全审查
      Assessment                Test Results Analyzer     测试审查
                                UI Designer              UI/视觉审查
subagent-driven-development     UX Researcher            UX/流程审查
  ├─ spec-reviewer-prompt.md    Accessibility Auditor    无障碍审查
  ├─ code-quality-reviewer-     Product Manager          产品/功能审查
  │   prompt.md                 Database Optimizer       数据库审查
  └─ 两阶段: spec → quality     Performance Benchmarker  性能审查
                                Reality Checker          对抗验证审查
                                Evidence Collector       视觉取证审查
verification-before-completion  Compliance Auditor       合规清单审查
  └─ 铁律: 不验证=没完成
```

## 可用 Agent 类型速查（审计用）

### 必选（7 种 Agent 类型，覆盖 8 维度）

| Agent 类型 | 审计维度 | 为什么需要 |
|-----------|----------|-----------|
| **Code Reviewer** | 代码质量 + Spec 合规 | 找 bug、坏味道、对照路线图检查功能完整性 |
| **Software Architect** | 架构设计 | composable 耦合、状态管理、API 分层、模块边界 |
| **Security Engineer** | 安全 | 鉴权流程、令牌管理、CSP/XSS、输入校验、限流 |
| **Test Results Analyzer** | 测试质量 | 覆盖率矩阵、测试深度、缺失项、测试有效性 |
| **UI Designer** | UI/设计系统 | 色板一致性、组件类使用、字体层级、视觉规范 |
| **UX Researcher** | UX/用户流程 | 用户旅程完整性、空态/加载/错误态、导航逻辑 |
| **Product Manager** | 产品/功能完整性 | 功能是否闭环、用户价值、竞品缺失项、路线图合理性 |

### 可选（按需启动）

| Agent 类型 | 审计维度 | 什么时候用 |
|-----------|----------|-----------|
| **Accessibility Auditor** | 无障碍 | label 关联、键盘导航、ARIA、屏幕阅读器兼容 |
| **Performance Benchmarker** | 性能 | 加载时间、打包体积、渲染性能、关键路径优化 |
| **Reality Checker** | 对抗验证 | 对前几路发现的"问题"做反向验证，防止假阳性 |
| **Evidence Collector** | 视觉取证 | 截图证明 UI bug，提供可视化审计证据 |
| **Compliance Auditor** | 合规清单 | SOC 2/ISO 风格 checklist 兜底，确保无遗漏 |

## 分支与提交策略

按 CLAUDE.md 要求，不在 main 上直接开发，审计修复用专用分支。

```
git checkout -b audit/2026-06-04        # Step 1 之前创建
```

| 时机 | 操作 | 说明 |
|------|------|------|
| Step 1 完成 | 不提交 | 只读扫描，无文件变更 |
| Step 2 完成 | 不提交 | 只读审查，无文件变更 |
| Step 3b 完成 | `git commit -m "docs: add project audit report"` | 审计报告存入 `docs/superpowers/audits/` |
| Step 4 每个修复 | `git commit -m "fix: [具体修复内容]"` | 按严重度分批提交 |
| Step 5 通过后 | 不再提交 | 除非验证暴露新问题 |
| Step 6 通过后 | `git push`，然后 `git checkout main && git merge --no-ff audit/2026-06-04` | 完成审计修复 |

> Step 1-2 是纯只读，审计报告文档是第一个 commit。修复阶段每批修复一个 commit，方便回溯。

## 审计流水线（6 步）

### Step 1: 探索阶段 — 生成审计索引

用 **Explore 子代理**（2 个并行）扫描项目产出清单：

| # | 子代理 | 扫描范围 |
|---|--------|----------|
| 1.1 | Explore | pages/ + components/ — 页面和组件清单 |
| 1.2 | Explore | composables/ + constants/ + server/ — 引擎和API清单 |

输出：一份结构化的"审计索引"——供后续所有审查者使用。

### Step 2: 多维度并行审计 — 8 路必选 + 3 路可选

每一路都**套用 superpowers 的 `requesting-code-review` / `code-reviewer.md` 模板**：
- DESCRIPTION = 本维度审计范围和目标
- PLAN_OR_REQUIREMENTS = 项目文档列表（roadmap.md + 设计规范 + CLAUDE.md）

#### 必选 8 路（基础覆盖）

| # | Agent 类型 | superpowers 模板 | 审查内容 |
|---|-----------|-----------------|----------|
| 2.1 | **Code Reviewer** | spec-reviewer-prompt.md | **Spec 合规**：对照 roadmap.md 检查每个功能是否实现，有无遗漏或多余 |
| 2.2 | **Code Reviewer** | code-reviewer.md | **代码质量**：死代码、重复、类型安全、CLAUDE.md 约定、边界处理 |
| 2.3 | **Security Engineer** | code-reviewer.md | **安全**：鉴权、令牌、CSP、XSS、输入校验、限流、敏感数据 |
| 2.4 | **Software Architect** | code-reviewer.md | **架构**：composable 耦合、状态管理、API 分层、模块边界 |
| 2.5 | **Test Results Analyzer** | code-reviewer.md | **测试**：覆盖率矩阵、测试深度、缺失项、运行 `npm run test` |
| 2.6 | **UI Designer** | code-reviewer.md | **UI/设计系统**：色板一致性、组件类使用、字体层级、视觉规范 |
| 2.7 | **UX Researcher** | code-reviewer.md | **UX/流程**：用户旅程完整性、空态/加载/错误态、导航逻辑 |
| 2.8 | **Product Manager** | code-reviewer.md | **产品/功能**：功能闭环、用户价值、路线图对比、竞品缺失项 |

#### 可选 3 路（深度扫描，按需启动）

| # | Agent 类型 | superpowers 模板 | 审查内容 | 什么时候加 |
|---|-----------|-----------------|----------|-----------|
| 2.9* | **Accessibility Auditor** | code-reviewer.md | **无障碍**：label、键盘、ARIA、屏幕阅读器 | 面向公众/需要 WCAG 合规 |
| 2.10* | **Database Optimizer** | code-reviewer.md | **数据库**：schema 设计、索引覆盖、查询效率、迁移质量 | 数据量大/查询复杂 |
| 2.11* | **Performance Benchmarker** | code-reviewer.md | **性能**：加载时间、打包体积、关键路径 | 追求极致体验/移动端

**每路审查者输出需遵循 `code-reviewer.md` 格式：**
```
### Strengths
### Issues
  #### Critical / Important / Minor
### Assessment
  **Ready to merge?** [Yes | No | With fixes]
```

### Step 3a: 对抗验证（可选但推荐）

在合并报告之前，用 **`Reality Checker`** 对 Step 2 发现的所有 HIGH 问题做反向验证。

> Reality Checker 的口号是："停止幻想审批，证据验证"。它会对每个问题追问"这真的是个问题吗？有没有代码证据？"——防止审查者报告假阳性。

```
派 1 个 Reality Checker 子代理：
  输入：Step 2 中所有 HIGH 和 Important 问题列表
  任务：逐条验证 → 返回 { confirmed: true/false, reason: "..." }
  
过滤掉 verified: false 的问题 → 剩下的才是真正的修复目标
```

### Step 3b: 综合报告 — 合并审查结果

派一个 **`Code Reviewer`** 子代理做合成，把所有分维度报告（合并对抗验证结果）合并为一份：

```
# 项目审计报告
├── 总体健康度 (A/B/C/D)
├── 按严重度分组的完整问题列表
├── 各维度详情摘要
├── 行动优先级排序
└── 亮点
```

### Step 4: 修复阶段 — 按严重度分组修复

遵循 `subagent-driven-development` 的**两阶段 review** 流程，但针对修复场景做调整：

| # | 子代理 | 做什么 |
|---|--------|--------|
| 4.1 | **Senior Developer** | 修复全部 HIGH 问题 |
| 4.2 | **Senior Developer** | 修复全部 MED 问题 |
| 4.3 | **Senior Developer** | 修复全部 LOW 问题 |
| 4.4* | **Senior Developer** | 补测试覆盖 |

> 修复代理也按 superpowers 规范：读文件 → 最小修改 → 不做无关重构。

### Step 5: 验证 — verification-before-completion

套用 `verification-before-completion` 技能的铁律：

1. `npm run typecheck` — TypeScript 类型检查，必须 0 错误
2. `npm run build` — 生产构建，必须成功
3. `npm run test` — 全部测试，必须 0 失败

**三关全过才能声称"修复完成"。**

### Step 6: 最终代码审查 — requesting-code-review

套用 `requesting-code-review` 技能，对整个修复 diff 做最终审查：

```bash
BASE_SHA=$(git rev-parse HEAD~1)
HEAD_SHA=$(git rev-parse HEAD)
```

派 **`Code Reviewer`** 审查全部变更：
- 是否还有遗漏
- 修复是否引入了新问题
- 测试覆盖是否充分

通过后提交推送。

---

## superpowers 模板注入要点

每个审查子代理的 prompt 需要包含以下 superpowers 模板的关键元素：

```
你是 [Agent类型]。按照以下模板审查项目。

## 审查模板 (来自 superpowers requesting-code-review)

1. Strengths: 做得好的地方，具体指出
2. Issues: 分类为 Critical/Important/Minor
   - 每项必须有 file:line 引用
   - 解释 WHY 这是个问题
3. Assessment: 明确给出合并评估

## 审查纪律 (来自 superpowers verification-before-completion)
- 不跑验证不能宣称完成
- 不用 "should"/"probably" 等模糊词
- 每个结论必须有代码引用支撑
```

这样每个子代理既有了**专业能力**（Agent 类型），又有了**工作规范**（superpowers 模板）。

---

## 与之前实际执行的对比

| 环节 | 上次实际做的 | 加上 superpowers 后改进 |
|------|-------------|----------------------|
| 审查模板 | 自写 prompt | 套用 code-reviewer.md 标准模板（Strengths/Issues/Assessment） |
| 维度覆盖 | 5 路 (缺 UI/UX/a11y/产品/DB) | 8 必选 + 3 可选，全覆盖 |
| 结果格式 | 自定格式 | 统一 `code-reviewer.md` 标准格式 |
| 假阳性过滤 | 无 | Reality Checker 对抗验证 HIGH 问题 |
| 修复纪律 | 有 review | 加 `verification-before-completion` 铁律 |
| 最终审查 | 无 | 加 `requesting-code-review` 最终 diff 审查 |
| 产品视角 | 无 | Product Manager 审功能闭环和用户价值 |

---

## 执行方式

有两种：

**A. Workflow 脚本** — 一次性编排全部流程，适合"全自动无干预"
**B. 手动分步** — Step 1 → 看结果 → Step 2 → 看结果 → ...  适合"每步查看再决定"

推荐 **B（手动分步）**，因为审计是判断密集型工作，每步看完结果再决定下一步更有价值。

---

## 快速使用指南

以下是在新对话中执行此审计方案的通用 prompt，直接复制给 Claude Code 即可：

### 完整版（8 路必选 + 对抗验证）

```text
使用 superpowers 的 requesting-code-review 技能，按以下方案对当前项目执行全面审计。

## 审计方案参考
方案文档：`docs/superpowers/audits/2026-06-04-superpowers-agent-audit-workflow.md`

## 分支与提交
1. 审计开始前：`git checkout -b audit/2026-06-04`
2. Step 1-2（只读扫描/审查）→ 不提交
3. Step 3b（审计报告）→ 提交到 `docs/superpowers/audits/`
4. Step 4（修复）→ 每批修复一个 commit
5. Step 6 通过后 → push + `git checkout main && git merge --no-ff audit/2026-06-04`

## Step 1 — 探索阶段
派 2 个 Explore 子代理并行扫描项目，产出功能清单：

**Explore 1** — 扫描 pages/、components/、layouts/ 所有 .vue 文件
**Explore 2** — 扫描 composables/、constants/、server/、utils/ 所有 .ts 文件

输出：结构化分类清单。

## Step 2 — 8 维度并行审计
每个子代理按 superpowers code-reviewer.md 模板输出
Strengths / Issues(Critical/Important/Minor) / Assessment。

8 个维度：
- Code Reviewer → Spec 合规（对照 roadmap.md）
- Code Reviewer → 代码质量
- Security Engineer → 安全
- Software Architect → 架构
- Test Results Analyzer → 测试
- UI Designer → UI/设计系统
- UX Researcher → UX/流程
- Product Manager → 产品/功能

## Step 3 — 对抗验证 + 综合报告
- Reality Checker 验证所有 HIGH 问题
- Code Reviewer 合并为审计报告

## Step 4-6 — 修复、验证、最终审查
按方案文档执行。

## 关键规则
- 采用手动分步模式（方案 B），每步完成汇报结果，等待指令再继续
- 按 CLAUDE.md 约定：不在 main 上直接开发
- 审查模板遵循 superpowers requesting-code-review 标准格式
```

### 精简版（5 路核心，快速扫描）

```text
使用 superpowers 的 requesting-code-review 技能模板，
对当前项目进行 5 维度快速审计：

并行派 5 个审查子代理：
- Code Reviewer → 代码质量
- Security Engineer → 安全
- Software Architect → 架构
- UI Designer → UI/设计系统
- Product Manager → 产品功能

每个输出 Strengths / Issues(Critical/Important/Minor) / Assessment。
最后合并为审计报告。
```

### 追加维度（已有基础审计后深入）

```text
对项目补充以下维度的审计：
- Accessibility Auditor → 无障碍合规
- Database Optimizer → 数据库设计
- Performance Benchmarker → 性能
```

---

## 验证

执行完后验收标准：
- [ ] typecheck 干净
- [ ] build 成功
- [ ] 所有测试通过
- [ ] 审计报告已存档（`docs/superpowers/audits/`）
- [ ] 修复后的最终 code review 通过
