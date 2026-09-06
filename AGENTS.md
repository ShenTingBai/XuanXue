# AGENTS.md

XuanXue（Nuxt 3 全栈模块化单体）。Codex 最高行为准则，每次对话自动加载。

> 项目路径、构建命令、框架规则见 `.Codex/project-config.md`。
> 生成计划前必须先读取 `.Codex/project-config.md`。

---

## 一、编码铁律

- 中文文件默认 UTF-8 无 BOM
- 禁止 PowerShell 批量读写源码（写文件用 Write/Edit 工具）
- 每次改动含中文文件后执行乱码检测（命令见下），命中 → 立即暂停，不得提交，优先从 git 恢复该文件，**不叠加修复**
- 提交前必须通过 `git diff --check` + 乱码检测 + `npm run typecheck` + `npm run test` + `npm run build`，任一项异常不提交
- Claude Code / ZCode 侧已配 PostToolUse hook 自动检测乱码，写文件命中会立即收到警告

**乱码检测命令**（v2.2 修正特征——去掉易误报的 æ/å/ç 单字符）：

```
rg "[锟斤拷ÃÂ«»涓绠鏂鍚瑙璜鈥鐨]"
```

> 注意：检测命令本身不要复制进待检文件（自指误报）。计划 YAML 里写 grep verify 时，
> 执行器侧的校验器/hook 已自动排除 `pattern:` 行，Codex 侧无需特殊处理。

---

## 二、代码质量

- 中文注释解释意图、边界条件和设计原因，不逐字翻译代码
- 保持原文件命名、缩进和引号风格；最小改动；不格式化整个文件
- 详见 `.Codex/project-config.md`「代码标准」段（生成计划时抄进 `plan.code_standards`）

---

## 三、工作流

```
1. 读 .Codex/project-config.md  → 项目路径/构建/框架规则/产品硬约束
2. 读 AGENTS.md                 → 本文件
3. 读 docs/analysis/protocol.md → 多 Agent 协作协议
4. 读 docs/design-system.md     → 涉及 UI/移动端/组件交互时必读
5. 输出歧义点+假设清单          → v2.2：先消歧再生成（clarify）
6. 生成 v2.2 计划                → 全部写具体值，禁止 ${...} 占位符
7. Claude /plan-execute 执行     → 门禁校验→hook防护→执行→验证
8. 审查 result YAML              → 重点审 plan_amendments（漂移记录）
```

---

## 四、核心原则

1. **先想再写** — 不确定就问，不默默猜测；生成计划前先输出歧义点+假设清单
2. **简单优先** — 代码越少越好，不加臆测功能
3. **精准修改** — 只改计划要求的，不顺手优化
4. **目标驱动** — 先定验收标准；typecheck + test + build 全过 = 最低门槛

---

## 五、验证基线

UI 或移动端改动必须提供 320、360、390、414 CSS 像素宽度的人工验收证据；不得以禁用浏览器缩放代替修复。

---

## 六、Git

- 不自动提交、推送或合并；完成改动后必须先交用户审计
- 格式：`type(scope): 中文描述` + 逐文件列出改动
- 多 Agent 协作细节（任务分级、审计门）见 `docs/analysis/protocol.md`

---

## 七、计划协议

当前版本 **v2.2**（2026-09-01 起生效）。模板：`D:/Env/Claude/commands/plan-template.yaml`

**v2.2 关键变化**（相对 v2.1）：

- `${VAR}` 占位符机制退役——从 project-config.md 读到的值直接写进计划；计划中出现 `${...}` 会被门禁校验器硬拦
- 生成计划前必须先输出「歧义点 + 假设」清单（clarify 消歧）
- 计划保存后由执行器跑门禁校验（`D:/Env/Claude/scripts/plan-validate.py`）：必填字段、任务类型、依赖图、路径冲突、verify 缺失、占位符残留，FAIL 不执行
- 执行期路径约束由 PreToolUse hook 机械强制（allowed/forbidden/known_dirty 三层）
- 执行结果含 `plan_amendments` 漂移记录：审阅后接受偏差或发起修正计划（converge 循环）；同类漂移反复出现 → 修 project-config.md，不要每次打补丁

完整 Codex 提示词：`D:/Env/Claude/commands/prompt-codex.md`
Yudao 框架规则（本项目不适用）：`D:/Env/Claude/commands/framework-yudao.md`
