# R5 有界请求体 helper 的空预缓冲与 complete 状态边界修正（v4） · 验证记录

> 计划：`plan-20260920-r5-chunked-body-live-state-v4`
>
> 验证日期：2026-09-20
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（自动化验证已完成，待用户最终接受）

## 1. v3 复核发现

v3 补回了 h3 预缓冲兼容，但两处边界判断不精确：

### 1.1 预缓冲来源选择用了 nullish 链

h3 `readRawBody` 用 **truthy** 链选择来源：

```js
const _rawBody =
  event._requestBody ||
  event.web?.request?.body ||
  event.node.req[RawBodySymbol] ||
  event.node.req.rawBody ||
  event.node.req.body
```

v3 helper 用的是 **nullish** 链（`??`）。差异：空字符串、`0`、`false` 在 h3 里
被视为"没有预缓冲体"（继续读 socket），在 v3 里却会成为有效候选，进而触发
`readPreBufferedBody` → `readRawBody` 去**重新完整读取 live socket**——
把 v1 已修掉的完整缓冲漏洞带回来。

### 1.2 `complete` 被当作 readable 已结束

v3 的 Node 守卫是 `readableEnded === true || complete === true` → 返回 null。
但 Node 语义里 `complete` 只表示 **HTTP message 已完整接收**，不代表 readable 已被消费。
实测（真实 HTTP，客户端发完但服务端尚未读取）：

```
t=50ms  { complete: true, readableEnded: false, readableLength: 1024 }
t=100ms { complete: true, readableEnded: false, readableLength: 1024 }
读取到字节: 1024 ✓
```

即 `complete=true` 时数据**仍在 readable 缓冲区**，v3 按此标志返回 null 会丢掉整段请求体。

## 2. v4 修正

`server/utils/bounded-request-body.ts` 两处改动：

1. **`getPreBufferedBody` 改为 truthy 选择**：按 h3 顺序遍历五个来源，返回第一个 truthy 值；
   全部为空值时返回 `undefined`（无预缓冲），继续走 live 直读。空值不再触发 `readRawBody`。
2. **Node 守卫只保留 `readableEnded === true`**：`complete` 不再单独作为结束判据。
   `complete=true / readableEnded=false` 时继续直读，消费已进入 readable 缓冲区的数据。
   `readableEnded === true` 且无预缓冲体时仍立即返回 null（保持 v3 对"永久 pending"的修复）。

v3 的其余行为全部保留：预缓冲流优先、预缓冲 Buffer/object 经 `readRawBody` 转换 +
maxBytes 校验、live Node 超限 `resume` 排空、Web Stream `reader.cancel`。

## 3. 回归测试

### 3.1 单元（28 例，新增 4 例）

新增「live 状态边界」套件：

- 空字符串 `_requestBody` 不触发 `readRawBody`，live Node 数据仍被读取；
- `complete=true / readableEnded=false` 仍直读缓冲数据，不返回假 null；
- `readableEnded=true` 且无预缓冲体 → 立即 null 且**未注册任何监听**；
- `complete=true` 且有有效预缓冲体 → 优先取预缓冲值。

v3 的预缓冲兼容、Node 直读、Web Stream 断言全部保留。

### 3.2 真实 HTTP（7 例，新增 2 例）

新增：

- **message 已完整接收但 readable 未结束**：handler 轮询等到 `req.complete === true` 后
  才开始读取，断言请求体被完整读取（`ok:7`）而非返回 `ok:null`。
- **live 请求携带空 `_requestBody`**：断言不回退 `readRawBody`，数据仍被读取。

v3 的已结束无体、`req.rawBody` 预缓冲、chunked keep-alive、慢速超限用例全部保留。

### 3.3 测试鉴别力（对抗验证）

把 v3 行为（nullish 链 + `complete` 当结束）临时注入生产文件后重跑：**3 个用例失败**，
诊断信息精确指向两个缺陷：

```
× 空字符串 _requestBody 不触发 readRawBody…  → expected null to be '{"live":1}'
× complete=true 但 readableEnded=false…      → expected null to be '{"buffered":2}'
× message 已完整接收但 readable 未结束时…     → expected 'ok:null' to be 'ok:7'
```

注入后已立即从备份恢复 v4。

## 4. 命令结果

| 命令                                                                                                                  | 退出码                                 |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `git diff --check`                                                                                                    | 0                                      |
| `npm run typecheck`                                                                                                   | 0（仅既有 duplicated imports warning） |
| `npx vitest run tests/server/utils/bounded-request-body.test.ts tests/server/utils/bounded-request-body.node.test.ts` | 0（35/35）                             |
| `npm run test`                                                                                                        | 0（88 文件 / 2676 用例）               |
| `npm run build`                                                                                                       | 0                                      |

## 5. 数据库隔离与范围

- 未读取、未哈希、未创建、未迁移、未修改、未删除任何业务数据库文件；真实 HTTP 测试只监听
  本机随机端口。
- `bounded-json-body.ts`、`result-history-request.ts` 与三个 API 测试文件均为前几轮未提交
  改动（known_dirty），**本次未触碰**。
- v1/v2/v3 历史验证文档未修改；本 v4 文档负责追加更正，不伪造历史执行记录。

## 6. 未覆盖边界

- `complete` 与 `readableEnded` 的其他组合（如两者皆 false 的进行中状态）由既有
  Node 直读用例隐含覆盖，未单独列用例。
- 反向代理预缓冲不在应用层控制范围。

## 7. plan_amendments

见 `.claude/results/20260920-r5-chunked-body-live-state-v4-result.yaml` 的
`plan_amendments` 段。

## 8. 结论

空预缓冲与 `complete` 状态边界已修正：空值不再回退完整缓冲，`complete=true` 不再丢数据，
`readableEnded=true` 仍避免永久 pending。状态为
**technical_verification_passed_pending_user_acceptance**，待用户最终接受。
