# R5 chunked 请求体超限前完整缓冲修复 · 验证记录

> 计划：`plan-20260920-r5-chunked-body-limit-v1`
>
> 验证日期：2026-09-20
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（自动化验证已完成，待用户最终接受）

## 1. 背景与缺陷

`server/utils/bounded-json-body.ts` 与 `server/utils/result-history-request.ts` 原先都先调用
h3 `readRawBody` 取得完整字符串，再用 `Buffer.byteLength` 判定上限。h3 的 `readRawBody`
会把全部 chunk 收集后 `Buffer.concat`，因此**无 Content-Length 的 chunked 请求**
在判定 413 之前就已占用完整内存，未认证请求即可耗尽内存。

## 2. 修复机制

新增 `server/utils/bounded-request-body.ts`（`readBoundedRawBody(event, maxBytes)`）：

- 经 `getRequestWebStream` 取得请求流，`reader.read()` 逐块累计 `Uint8Array.byteLength`；
- 累计超过 `maxBytes` → 先暂停底层 Node 流、再 `reader.cancel()`，抛固定 413；
- 只对已确认不超限的内容做一次 `Buffer.concat` + UTF-8 解码；
- 无可用流 / 空流 → 返回 null；流错误原样传播；非请求体方法沿用 h3 405 断言。

两条生产路径接入：

- `bounded-json-body.ts`（认证接口 + 本人档案接口共享）：保留 Content-Length 快速 413 与
  JSON/顶层对象语义，兜底改走 `readBoundedRawBody`；
- `result-history-request.ts`：保留 `BAZI_MAX_REQUEST_BYTES`、Content-Length 预检与固定
  413/400 文案，读取改走同一 helper，删除重复的完整缓冲逻辑。

### 关键实现细节（实测得出，非文档推断）

`reader.cancel()` **单独调用会导致进程崩溃**：h3 的包装流在 cancel 后仍会收到 Node
`data` 事件，向已取消的 controller `enqueue` 抛未捕获的 `ERR_INVALID_STATE`。
实测（真实 HTTP 服务器 + chunked 客户端）：只 cancel → `uncaughtException`；
先 `req.pause()` 再 cancel → 无未捕获异常。因此实现固定为「先暂停、再取消」。

## 3. 回归测试

| 文件 | 用例数 | 新增覆盖 |
|------|--------|----------|
| `tests/server/utils/bounded-request-body.test.ts`（新建） | 10 | 多块刚超限即 413 且 cancel 被调用、恰好等于上限放行、多字节 UTF-8 原文保留、空流 null、流错误传播、无流 null、非请求体方法 405、Content-Length 快速失败不请求流、chunked 累计超限、非法 JSON 400 / 顶层非对象 {} |
| `tests/server/api/auth.test.ts` | 38 | 注册与登录各新增「无 Content-Length 的 chunked 超限在流读取阶段被截断并取消流」 |
| `tests/server/api/result-history.test.ts` | 20 | 新增同型 chunked 超限用例，并断言服务层未被调用 |

测试夹具用**真实 `ReadableStream` 按 256 字节分块投递**，并断言 `reader.cancel` 被调用
与 `pull` 次数——不是把完整巨大字符串交给 mock 冒充流式保护。

### 范围外连带影响（已获用户授权处理）

`bounded-json-body.ts` 还有第三个消费者 `self-profile-request.ts`（4 个本人档案端点）。
解析器改流式后，`tests/server/api/self-profile.test.ts`（原不在计划 allowed_paths）因
mock 的是旧的读取函数而失败 11 例。经用户明确授权，对该测试文件做了与 auth 同构的
**最小夹具适配**（仅改测试 mock，未动生产代码），28 例恢复通过。

## 4. 命令结果

| 命令 | 退出码 |
|------|--------|
| `git diff --check` | 0 |
| `npm run typecheck` | 0（仅既有 duplicated imports warning） |
| `npx vitest run tests/server/utils/bounded-request-body.test.ts tests/server/api/auth.test.ts tests/server/api/result-history.test.ts` | 0（68/68） |
| `npm run test` | 0（87 文件 / 2651 用例） |
| `npm run build` | 0 |

## 5. 数据库隔离

本次验证**未读取、未哈希、未创建、未迁移、未修改、未删除任何业务数据库文件**。
定向与全量测试均使用流 mock；全量测试的数据库路径由 `tests/helpers/vitest-setup.ts`
注入 `os.tmpdir()` 下临时库。未运行预览服务（本计划无浏览器验收要求）。

## 6. 未覆盖边界

- 真实反向代理（CDN）对请求体的预缓冲不在本项目控制范围内；本修复只保证应用层不再
  产生"超限前完整缓冲"。
- 上限内的超长流仍会完整读入内存——这是上限语义本身，非本计划范围。
- 未做压测复现内存峰值差异；证据为真实流语义 + cancel 行为实验 + 单元/接口测试三层。

## 7. plan_amendments

见 `.claude/results/20260920-r5-chunked-body-limit-v1-result.yaml` 的 `plan_amendments` 段。

## 8. 结论

chunked 请求体内存风险已消除：两条 API 路径均不再走完整缓冲入口，超限在流读取阶段
被截断并取消。状态为 **technical_verification_passed_pending_user_acceptance**，待用户最终接受。
