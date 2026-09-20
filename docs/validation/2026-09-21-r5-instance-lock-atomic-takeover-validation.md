# R5 陈旧实例锁接管的双持有者竞态修复 · 验证记录

> 计划：`plan-20260921-r5-instance-lock-atomic-takeover-v1`
>
> 验证日期：2026-09-21
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（自动化与真实多进程验证已完成，待用户最终接受）

## 1. 缺陷根因

`server/utils/instance-lock.ts` 在 `wx` 打开遇到 `EEXIST`、且读取到的持有者 PID 已死亡时，
走 `writeLock(absolute)` —— 即 `fs.writeFileSync` **普通覆盖**原锁路径。这不是原子操作：

两个进程同时判定"锁已陈旧"后，会**双双写入成功**并各自认为自己持有锁，形成**双持有者**。
sql.js 每 5 秒整文件覆盖写，双持有者意味着确定性的数据互相抹除。

审计探针复现（顺序模拟两个进程都进入 EEXIST 分支）：

```
进程 A: {"ok":true,"holder":11111}
进程 B: {"ok":true,"holder":22222}
锁文件最终持有者: {"pid":22222}
双持有者判定: ❌ 两者都报告成功（缺陷确认）
```

此外 `release` 只比较 PID：同一进程的**上一代** lock handle 在锁被重新接管后，
会误删新持有者的锁文件。

## 2. 修复机制

### 2.1 锁记录加入 token

记录扩展为 `{ pid, token, startedAt }`，`token` 为 `crypto.randomUUID()`：

- **pid** 判断持有者是否存活；
- **token** 区分同一 PID 的不同持有代际——仅凭 PID 无法区分"本进程上一次持锁"与"当前持锁"。

### 2.2 陈旧锁原子隔离

接管流程改为：`open('wx')` 失败 → 读取记录 → 若为死亡 PID 或损坏锁，
用**唯一临时名** `fs.renameSync(lockPath, `${lockPath}.stale-${pid}-${uuid}`)` 把原锁原子移出，
然后**循环回到 `open('wx')` 重新竞争**。隔离文件随即删除（成功/失败/异常路径都清理）。

rename 是文件系统原子操作：两个竞争者中只有一个能成功移走文件，另一个收到 ENOENT 并重新竞争——
因此**最多一个能成为新持有者**。损坏/空锁增加了 20ms 宽限重读，避免覆盖另一个进程刚创建
尚未写完的锁。

### 2.3 release 双重身份匹配

release 闭包保存本次 `pid + token`，只有锁文件**同时匹配两者**才 unlink。
旧 handle 不得误删新代锁。

公开 API 保持兼容：`InstanceLockError` 字段（`lockPath`、`holderPid`）不变，
`InstanceLock` 新增 `token` 字段（附加，不破坏既有用法），release 幂等语义保留。

## 3. 回归测试（14 例）

| 组 | 覆盖 |
|----|------|
| `isProcessAlive` | 本进程存活、非法 PID |
| 单进程基础 | 创建写入 pid+token、release 幂等、递归建目录 |
| 陈旧接管 | 损坏锁接管、死亡 PID 接管、**接管后无隔离文件残留** |
| 存活拒绝 | 存活 PID 拒绝、错误携带 lockPath/holderPid |
| token 身份 | 释放不误删他人锁、**同 PID 不同 token 旧 handle 不删新锁** |
| **真实多进程** | ① 两子进程争抢空锁：恰好一个持有；② 预置死亡 PID 后两子进程接管：仍只一个持有；③ 子进程持有期父进程拒绝、释放后可获取 |

真实多进程用例通过 `spawn` 拉起子进程，用 `node --experimental-strip-types` 加载**生产模块**
（仓库无 jiti/tsx 依赖，这是 Node 24 原生能力，**未引入新依赖**）。子进程用
"就绪标记文件 + 释放信号文件"与父进程握手，保证断言发生在**持有期内**而非释放之后。

### 测试鉴别力（对抗验证）

把 v1 实现（无 token、EEXIST 分支普通覆盖）临时注入生产文件后重跑：

```
× 预置死亡 PID 后两个子进程同时接管：仍只有一个持有
  → expected [ { …(2) }, { …(2) } ] to have a length of 1 but got 2
× 两个子进程同时争抢空锁路径：恰好一个持有
× 同 PID 不同 token 的旧 handle release 不删除新代锁
```

**真实子进程竞争暴露了双成功**，正是计划要求证明的鉴别力。注入后已立即恢复 v2 实现。

## 4. 命令结果

| 命令 | 退出码 |
|------|--------|
| `git diff --check` | 0 |
| `npm run typecheck` | 0（仅既有 duplicated imports warning） |
| `npx vitest run tests/server/utils/instance-lock.test.ts` | 0（14/14） |
| `npm run test` | 0（88 文件 / 2681 用例） |
| `npm run build` | 0 |

## 5. 数据库隔离与范围

- 未读取、未哈希、未创建、未迁移、未修改、未删除任何业务数据库文件；所有锁测试只在
  `os.tmpdir()` 唯一目录内操作锁文件，`afterEach` 清理。
- `server/database/**`、`DB_PATH`、schema、`package-lock.json`、`node_modules` 均未修改。
- 前四轮 R5 未提交文件（内部权限、数据库初始化、chunked v1–v4）全部保留未动。

## 6. 未覆盖边界

- 网络文件系统（NFS/SMB）上 rename 的原子性依赖服务端实现，未做跨主机验证；本项目为单机部署。
- `waitAndRecheck` 的 20ms 宽限是同步忙等，仅在损坏锁路径触发；未做高频并发压测。
- 未覆盖 Windows 与 POSIX 在 rename 覆盖语义上的差异细节（本仓库在 Windows 上验证）。

## 7. plan_amendments

见 `.claude/results/20260921-r5-instance-lock-atomic-takeover-v1-result.yaml` 的
`plan_amendments` 段。

## 8. 结论

陈旧锁接管已原子化，双持有者竞态消除；锁身份加入 token，旧 handle 不再误删新代锁。
真实多进程测试经对抗验证证明可暴露 v1 的双成功。状态为
**technical_verification_passed_pending_user_acceptance**，待用户最终接受。
