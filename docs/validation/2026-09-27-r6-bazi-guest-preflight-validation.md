# 八字 R6 游客公开预演验证记录

> 计划：`.claude/plans/plan-20260927-r6-bazi-guest-preflight-v1.yaml`
> 日期：2026-09-27
> 状态：**Executed；游客公开与真实浏览器验收仍未 Accepted**
> 边界：只读预演；未修改工具目录、围栏、页面、服务端、数据库或来源台账。

> 后续状态：本记录保留浏览器控制不可用时的预演结果；浏览器恢复后已由 [2026-09-27 R6 最终公开验收](2026-09-27-r6-bazi-public-acceptance-validation.md) 完成公开候选验收。

## 1. 执行结果

### 1.1 已执行

- 使用当前本机 dev server `http://127.0.0.1:3210` 发起普通访客 HTTP 请求：
  - `GET /tools/bazi` 返回 `302 Found`；
  - `Location: /tools/status?tool=bazi`；
  - 状态页返回 `200`，响应体包含 `bazi` 标识，未发现八字结果区的 `data-bazi-section`、`bazi-pillar` 或“生成八字”结果钩子。
- 既有自动化游客与围栏证据通过：
  - `tests/middleware/tool-availability.test.ts`：19/19；
  - `tests/components/bazi-page.test.ts`：31/31；
  - `tests/pages/index-content.test.ts`：28/28；
  - 合计 78/78 通过。
- 静态边界复核确认：`bazi` 仍为 `in_review / internal / enabled / create_allowed`；`pages/tools/bazi.vue` 仍明确延期导出；首页响应式约束仍由既有断言锁定。

### 1.2 用户验收状态

本记录没有把上述 HTTP 或组件级结果升级为用户验收。普通访客公开路径仍被围栏拦截，因此第 15 项的真实公开计算、错误恢复、来源与隐私体验尚未获得真实浏览器证据。

## 2. Blocked 项

### 2.1 真实浏览器控制

本轮调用浏览器控制失败：`nodeRepl.fetch request failed`；浏览器清单返回空并带有 `Browsers: Error: nodeRepl.fetch request failed`。因此无法在真实浏览器中完成游客路径、断点 320/360/390/414 和登录态 200% 文本缩放验证。

这不是“浏览器通过”，也不是“浏览器失败”；状态为 **Blocked（工具不可用）**。待浏览器控制恢复后，应重新执行真实页面预演，不能沿用本记录替代。

### 2.2 R6 公开门禁

`GAP-BZ-001` 仍未决；来源线用户已同意停止本轮开放式搜索，但没有把该 GAP 标记为关闭。游客真实公开体验和响应式浏览器证据也未完成，所以 R6 仍为 `remain_internal_pending_rework`，`bazi` 不得改为 `approved / public`。

## 3. 明确延期

八字图片导出继续延期，直到 R6 公开门禁完成并获得单独公开授权后再立计划。

## 4. 未修改边界

- 未修改 `constants/tool-catalog.ts`、`middleware/**`、`server/**`、`pages/tools/bazi.vue`、`components/**`、`tests/**`、数据库或公开围栏；
- 未修改历史审计原文；
- 未提交或推送；
- 工作区已有 `.zcodeignore` 及来源线文档改动保持原样。
