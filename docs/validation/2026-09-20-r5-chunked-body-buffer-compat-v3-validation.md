# R5 有界请求体 helper 的 h3 预缓冲兼容恢复（v3） · 验证记录

> 计划：`plan-20260920-r5-chunked-body-buffer-compat-v3`
>
> 验证日期：2026-09-20
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（自动化验证已完成，待用户最终接受）

## 1. v2 复核发现

v2 把 Node 路径改为"具备 on/off/resume 就直读"，但**没有**检查请求体是否已被上游
预缓冲或消费。审计用夹具实证三个缺陷：

| 场景                                                | v2 行为                    | 期望             |
| --------------------------------------------------- | -------------------------- | ---------------- |
| Node req 已 `readableEnded`/`complete` 且无预缓冲体 | **永久 pending**           | 空体语义（null） |
| `event._requestBody` 预缓冲 Buffer                  | **永久 pending**，内容丢失 | 返回原文         |
| `req.rawBody` 预缓冲（请求已结束）                  | **永久 pending**           | 返回原文         |

根因：v1 依赖 h3 包装流时，这些预缓冲来源由 h3 `readRawBody` 内部处理；v2 绕开包装流后
既未读取预缓冲来源，也未在注册监听前排除"请求已结束"的情形。

h3 `readRawBody` 的来源顺序（1.15.11 实测）：`event._requestBody` →
`event.web.request.body` → `Symbol.for('h3RawBody')` → `req.rawBody` → `req.body`。

## 2. v3 分流实现

`server/utils/bounded-request-body.ts` 按请求体来源四路分流，顺序即优先级：

1. **预缓冲的流对象**（ReadableStream / Node stream）——优先于 live Node 路径。
   请求体已被上游放进流里，此时 `node.req` 通常是已结束的 socket，注册监听会永久等不到
   事件。交给流式受限路径（`reader.read` + 超限 `cancel`）。
2. **预缓冲的 Buffer/string/object**——交给 h3 `readRawBody(event, false)` 做既有语义
   转换（object → JSON、URLSearchParams → 查询串等），**转换后仍按 maxBytes 校验真实
   字节**，超限同样 413。此路径不触碰 socket，不存在流式内存风险。
3. **live Node IncomingMessage**——保持 v2 语义：监听 `data/end/error/aborted` 累计字节，
   超限时清理自身监听 → `req.resume()` 排空 → 413。**新增守卫**：若
   `readableEnded`/`complete` 为真且无预缓冲体，返回 null 而不注册永远等不到的监听。
4. **Web Request / ReadableStream**——`reader.read` 累计，超限 `cancel` 并释放 lock。

`readRawBody` **只在第 2 路**被调用，live/chunked 路径绝不调用它——避免把兼容分支
重新变成完整缓冲漏洞。

## 3. 回归测试

### 3.1 单元夹具（24 例，新增 7 例）

新增 h3 预缓冲兼容套件：`_requestBody` Buffer、预缓冲对象（JSON 语义）、`req.rawBody`
且请求已结束、已结束且无预缓冲体（断言**未注册任何监听**）、预缓冲体超限 413、
预缓冲 ReadableStream 仍走流式受限（断言 `readRawBody` 未被调用）、live Node 不调用
`readRawBody`。v2 的 Node/Web 断言全部保留。

### 3.2 真实 HTTP（5 例，新增 2 例）

新增：

- **已结束且无预缓冲体**：handler 先把请求体读干净（`req.resume()` + `end`）再调 helper，
  断言有限时间内返回 `ok:null`（空体语义），不永久 pending。
- **上游预缓冲 `req.rawBody`**：handler 先读成 Buffer 挂到 `req.rawBody` 再调 helper，
  断言取到内容（`ok:7`）。

原 3 例（超限 keep-alive 复用、慢速超限、上限内正常读取）保留。

### 3.3 测试鉴别力（对抗验证）

把 v2 行为（不识别预缓冲、不检查 `readableEnded`）临时注入生产文件后重跑：
**6 个预缓冲/已结束用例全部超时失败**（正是 v2 的永久 pending 症状），而 live Node 用例
仍通过——证明新测试精准覆盖 v2 缺口。注入后已立即从备份恢复 v3。

## 4. 命令结果

| 命令                                                                                                                  | 退出码                                                              |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `git diff --check`                                                                                                    | 0                                                                   |
| `npm run typecheck`                                                                                                   | 0（首轮暴露 1 处 TS2352 并修复；仅既有 duplicated imports warning） |
| `npx vitest run tests/server/utils/bounded-request-body.test.ts tests/server/utils/bounded-request-body.node.test.ts` | 0（29/29）                                                          |
| `npm run test`                                                                                                        | 0（88 文件 / 2670 用例）                                            |
| `npm run build`                                                                                                       | 0                                                                   |

## 5. 数据库隔离与范围

- 未读取、未哈希、未创建、未迁移、未修改、未删除任何业务数据库文件；真实 HTTP 测试只监听
  本机随机端口。
- `bounded-json-body.ts`、`result-history-request.ts` 与三个 API 测试文件均为 v1 未提交
  改动（known_dirty），**本次未触碰**。
- v1/v2 历史验证文档未修改；本 v3 文档负责追加更正，不伪造历史执行记录。

## 6. 未覆盖边界

- `event.web.request.body` 预缓冲来源未单独写用例（与 `_requestBody` 同一分支，由
  `getPreBufferedBody` 统一取值）；如需独立证据可在后续计划补充。
- FormData / URLSearchParams 预缓冲形式未覆盖（本项目 API 不接收这类请求体）。
- 反向代理预缓冲不在应用层控制范围。

## 7. plan_amendments

见 `.claude/results/20260920-r5-chunked-body-buffer-compat-v3-result.yaml` 的
`plan_amendments` 段。

## 8. 结论

h3 预缓冲兼容已恢复：预缓冲 Buffer/string/object 保留旧 `readRawBody` 语义并仍受字节上限
约束；已结束请求不再永久 pending；live chunked 路径保持流式上限与连接排空。状态为
**technical_verification_passed_pending_user_acceptance**，待用户最终接受。
