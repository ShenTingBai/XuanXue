# R5 chunked 超限后的 Node 请求连接生命周期收敛（v2） · 验证记录

> 计划：`plan-20260920-r5-chunked-body-lifecycle-convergence-v2`
>
> 验证日期：2026-09-20
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（自动化与真实 HTTP 验证已完成，待用户最终接受）

## 1. Codex 复核发现与 v1 的不足

v1（`plan-20260920-r5-chunked-body-limit-v1`）已实现流式字节上限，但 Node 超限分支为
`pauseNodeRequest(event)` + `reader.cancel()`。本计划审计用真实 Node HTTP 复现，确认两点不足：

| 观测项                             | v1（pause 无 resume）                | v2（直读 + resume 排空） |
| ---------------------------------- | ------------------------------------ | ------------------------ |
| 超限后未消费字节                   | **65536 字节残留**                   | 0                        |
| `readableEnded`（超限响应后）      | `false`                              | `true`                   |
| `complete`（message 是否完整解析） | `false`                              | `true`                   |
| 慢速大请求后续请求                 | 等 **5529ms** 且 `reused: false`     | 立即完成，`reused: true` |
| 未捕获异常                         | 单独 cancel 会抛 `ERR_INVALID_STATE` | 无                       |

即：v1 虽能返回 413，但未消费的请求体会一直占住 keep-alive socket，形成连接资源耗尽风险；
且 h3 包装流在 cancel 后仍持有 `data` 监听，继续向已取消的 controller enqueue 会抛未捕获异常。

## 2. v2 修复机制

`server/utils/bounded-request-body.ts` 改为**两条运行时路径分开**：

**Node / Nitro 路径**（`event.node.req` 具备 `on/off/resume`）——直接监听
`data/end/error/aborted`，按 `Buffer.byteLength` 累计并只保存上限内 chunk：

- 超限：**先**清理本 helper 注册的全部监听 → 调用 `req.resume()` 排空剩余请求体 →
  reject 固定 413。不再 pause，不再触碰 h3 包装流。
- 正常 `end`：清理监听，返回 UTF-8 字符串；空体返回 null。
- `error` / `aborted`：清理监听并原样传播错误。
- `settle` 只允许一次：晚到事件不能二次 settle，也不能重新开始缓存。

**Web Request / ReadableStream 路径**（无 Node 可读流）——保持 v1 行为：按 `reader.read()`
累计，超限时 `reader.cancel()` 并在 `finally` 释放 lock。

两条路径共享相同的 413、空体、UTF-8 与错误传播语义；`getRequestWebStream` 自身抛错不再被
静默当作空体（避免真实运行时异常被伪装）。

## 3. 回归测试

### 3.1 单元夹具（`tests/server/utils/bounded-request-body.test.ts`，17 例）

保留 v1 的 Web Stream 断言，新增 Node Readable 夹具覆盖：正常多块、恰好上限、超限立即 413、
**`resume` 被调用**、**自有监听被全部移除**、晚到事件不二次 settle、`error`/`aborted` 传播、
Node 路径不触碰 `getRequestWebStream`。

### 3.2 真实 HTTP 回归（`tests/server/utils/bounded-request-body.node.test.ts`，3 例）

用 `node:http` 启动本地服务器（随机端口），真实发送 `Transfer-Encoding: chunked`（无
Content-Length）请求：

1. **超限 + keep-alive 复用**：512KB 单次写入 → 413 → 断言连接健康度
   （`readableEnded=true`、`readableLength=0`、`complete=true`）→ 同一 agent 后续请求
   `200` 且 `reused=true` → 无未捕获异常。
2. **慢速超限**：每 5ms 发 256B、超限后继续发送 → 413 → 后续合法请求在超时内完成。
3. **上限内正常读取**：两次合法 chunked 请求均成功，第二次复用连接。

### 3.3 测试鉴别力（对抗验证）

仅断言「返回 413」不足以证明修复——实测 v1 的 pause 实现同样返回 413 且客户端无感。
因此把 v1 行为（pause 无 resume）临时注入生产文件后重跑：**关键用例失败**并报出
`连接在 6000ms 内未关闭，无法确认请求体是否被排空`。这证明测试确实能区分两种实现。
（注入后已立即从备份恢复 v2 实现，工作区最终为 v2。）

## 4. 命令结果

| 命令                                                                                                                  | 退出码                                 |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `git diff --check`                                                                                                    | 0                                      |
| `npm run typecheck`                                                                                                   | 0（仅既有 duplicated imports warning） |
| `npx vitest run tests/server/utils/bounded-request-body.test.ts tests/server/utils/bounded-request-body.node.test.ts` | 0（20/20）                             |
| `npm run test`                                                                                                        | 0（88 文件 / 2661 用例）               |
| `npm run build`                                                                                                       | 0                                      |

## 5. 数据库隔离与范围

- 未读取、未哈希、未创建、未迁移、未修改、未删除任何业务数据库文件；真实 HTTP 测试只监听
  本机随机端口。
- v1 已接入的 `bounded-json-body.ts`、`result-history-request.ts` 与三个 API 测试文件
  **全部未改动**（作为 known_dirty 保留）。
- v1 历史验证文档未修改；本 v2 文档负责追加更正，不伪造 v1 执行史。

## 6. 未覆盖边界

- 反向代理/CDN 对请求体的预缓冲不在应用层控制范围。
- 慢速场景下服务端可能提前销毁连接（客户端仍在发送），此时以「后续请求可用」作为用户可见
  判据，未断言内部 `readableEnded`。
- 未做并发连接数压测；连接资源结论基于单连接 keep-alive 复用与残留字节的直接观测。

## 7. plan_amendments

见 `.claude/results/20260920-r5-chunked-body-lifecycle-convergence-v2-result.yaml` 的
`plan_amendments` 段。

## 8. 结论

Node 超限后的连接生命周期已收口：超限即清理监听、排空请求体、连接可正常结束或复用，
Web Stream 路径行为不变。状态为 **technical_verification_passed_pending_user_acceptance**，
待用户最终接受。
