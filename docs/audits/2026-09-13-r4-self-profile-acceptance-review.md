# R4 本人档案验收复验（驳回）

日期：2026-09-13
分支：`codex/foundation-rebuild`
基线：`53cd19d feat(r4): 完成本人档案功能基线`（工作区干净，无未提交改动）
复验侧：独立复验代理（DSH 会话，非 Codex 角色）；经用户直接授权，同一会话内完成复验与最小修复

结论：**R4 不接受（驳回）**。四项门禁中三项在提交树上失败；`docs/audits/2026-09-11-r4-self-profile-runtime-acceptance.md` 记录的通过结论**在当前 HEAD 上不可复现**。

---

## 1. 门禁对照

| 门禁                | 2026-09-11 验收文档声称        | 2026-09-13 复验实测（HEAD `53cd19d`）                                                                              | 判定   |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------ |
| `npm run typecheck` | 通过（仅重复自动导入 warning） | 失败：11 个错误，全部集中在 `tests/utils/self-profile-birth-date.test.ts`                                          | 不通过 |
| `npm run test`      | 64 个文件、2334 项通过         | 64 个文件；2289 通过；1 个**套件编译失败**（`tests/components/shengxiao-page.test.ts`，45 例未运行）               | 不通过 |
| `npm run lint`      | 0 error、27 warnings           | 0 error、27 warnings                                                                                               | 通过   |
| `npm run build`     | 通过                           | 失败：`RollupError: [vite:vue] pages/tools/shengxiao.vue?macro=true (767:15): Error parsing JavaScript expression` | 不通过 |

失败输出要点：

- typecheck：`TS2578 Unused '@ts-expect-error' directive`（第 67、83、90、100、146 行）叠加真实错误 `TS2322`（70、93）、`TS2353`（86）、`TS2345`（103、149）。
- test：`SyntaxError: Error parsing JavaScript expression: Unexpected token, expected "," (3:8)`，指向 `pages/tools/shengxiao.vue:767` 的多语句内联处理器。
- build：同一处在客户端构建阶段直接中止（`✗ Build failed in 2.47s`）。

## 2. 数量对账：不是"测试变少"，而是同一批用例里有一个套件编译不过

`tests/components/shengxiao-page.test.ts` 共 45 个 `it(`；2289（实测通过）+ 45（未运行）= **2334**，与验收文档声称的用例数完全吻合。缺口恰好等于编译失败的那个套件，说明文档的数字来自**同一批用例在另一棵树上的运行**，而不是别的测试集。

## 3. 根因：提交钩子的格式化改写了"已验收"的代码

### 3.1 直接机制一：Vue 内联多语句处理器被 prettier 改成不可编译形式

- 安装的 Vue 为 `3.5.34`（`package-lock.json` 固定，`node_modules` 安装于 2026-09-01，未变更）。
- `@vue/compiler-core` 的 `hasMultipleStatements` 只识别"换行 + 分号"（`exp.content.includes("\n;")`）。命中才包成 `$event => { … }`；否则按表达式 `$event => ( … )` 解析。
- `.prettierrc` 中 `"semi": false`、`"printWidth": 100`。对单行分号写法运行项目配置的 prettier，输出即：

```text
@close="
  showSaveDialog = false
  saveReadiness = false
  saveIntentSeq++
"
```

该形式不含 `\n;`，因此在 `prefixIdentifiers: true`（`vite:vue` 生产编译）下解析失败。复现矩阵（`@vue/compiler-dom`）：

| 处理器写法                           | `prefixIdentifiers: false` | `prefixIdentifiers: true`                  |
| ------------------------------------ | -------------------------- | ------------------------------------------ |
| 单行分号 `a = false; b = false; c++` | OK                         | OK                                         |
| 换行 + 分号                          | OK                         | OK                                         |
| **换行 + 无分号（HEAD 现状）**       | OK                         | **FAIL：`Unexpected token, expected ","`** |

- 影响面扫描：全仓 91 个 `.vue`，用 `@vue/compiler-sfc` 以 `prefixIdentifiers: true` 逐一编译模板，**仅 `pages/tools/shengxiao.vue` 1 个文件失败**。其余多行 `@keydown` 均为箭头函数表达式，不受影响。

### 3.2 直接机制二：`@ts-expect-error` 被换行孤立

同一文件里 5 处 `// @ts-expect-error` 直接位于 `expect(` 之前。prettier 按 `printWidth: 100` 把超长调用折行后，类型错误落到了对象字面量所在行（70、86、93、103、149），而指令作用在它上面一行，于是同时产生"指令未使用"+ 真实类型错误。

### 3.3 证据链（可复现）

1. `.githooks/pre-commit` 第 16 行：`npx lint-staged`；`package.json` 的 `lint-staged` 对 `*.{ts,vue,js,mjs,css,json,md,yaml,yml}` 执行 `prettier --write`。即：**提交钩子会在门禁跑完之后改写源码**。
2. 仓库对象库中存在悬空快照 `42941f5`（父提交 `45ad4a7`，时间 2026-09-13 09:22:29，即提交期间/提交前的未格式化工作树）。
3. 对 `pages/tools/shengxiao.vue`、`tests/utils/self-profile-birth-date.test.ts`、`utils/self-profile/birth-date.ts`、`pages/self-profile.vue`、`server/services/self-profile.ts` 五个文件执行 `prettier(快照内容, 项目配置)`：

| 文件                                          | `prettier(快照) === HEAD` | HEAD 本身已格式化 | 快照 === HEAD |
| --------------------------------------------- | ------------------------- | ----------------- | ------------- |
| `pages/tools/shengxiao.vue`                   | 是                        | 是                | 否            |
| `tests/utils/self-profile-birth-date.test.ts` | 是                        | 是                | 否            |
| `utils/self-profile/birth-date.ts`            | 是                        | 是                | 否            |
| `pages/self-profile.vue`                      | 是                        | 是                | 否            |
| `server/services/self-profile.ts`             | 是                        | 是                | 否            |

五个文件全部满足"**快照经 prettier 格式化后恰好等于 HEAD**"，说明提交前树与 HEAD 的唯一差异就是这一次格式化。快照中该处写法为单行分号形式（可编译），HEAD 中是换行无分号形式（不可编译）。

因此：**运行时验收跑在未格式化树上，结论为真；随后 pre-commit 的 prettier 改写了源码，使 typecheck 与 build 失效，而提交后没有再跑门禁。** 这不是"文档造假"，而是"验证对象被提交钩子改掉、验收文档与提交树不再对应"。

## 4. 同步发现（同类或相邻问题）

- `pages/tools/shengxiao.vue:11` 引入的 `SELF_PROFILE_POLICY_VERSION` 未使用（lint warning），与保存对话框接线时删掉用法有关。
- `docs/audits/2026-09-11-r4-self-profile-runtime-acceptance.md` 第 3 行的日期/分支/基线三行使用了字面 `` `n `` 而非换行，实际被拼成一行。
- 提交 `53cd19d` 的 message body 使用字面 `\n` 分隔条目，Git 中实际为单行，`git log` 与图形化工具阅读体验受损。
- 风险外溢：`.prettierrc` 的 `semi: false` 与 Vue 内联多语句处理器天然冲突；今后任何"多语句内联处理器"只要被 prettier 写过就会变成不可编译代码，而 `prettier --check .` 不会报错（它认为那正是正确格式）。

## 5. 建议的最小修复（2 个文件 + 文档更正，不改产品语义）

1. `pages/tools/shengxiao.vue`：把 `@close` 的多语句内联处理器提为具名方法（与 `pages/self-profile.vue` 的 `closeSaveDialog` 同形），消除"格式化即失效"的结构；顺手移除未使用的 `SELF_PROFILE_POLICY_VERSION` 导入。
2. `tests/utils/self-profile-birth-date.test.ts`：用一个显式断言辅助函数（如 `asUnknownRaw(value): RawBirthDate`）替代 5 处 `@ts-expect-error`，保持"运行时传入畸形输入"的测试语义，同时让格式化无法再孤立指令。
3. 文档：新增本复验记录，并在 `2026-09-11-r4-self-profile-runtime-acceptance.md` 追加重定向到本记录的更正说明（不改写原执行史）；`docs/project/stage-roadmap.md` 与 `docs/product/README.md` 中继承同一通过结论的段落需同步更正。
4. 流程：`pre-commit` 目前是"改写型"而非"门禁型"。建议改为 `prettier --check`（失败即阻止提交），或保持改写但在提交后针对提交树重跑 `typecheck` 与 `build`。

## 6. 本次复验的边界

- 已运行：`npm run typecheck`、`npm run test`、`npm run lint`、`npm run build`（构建产物写入 `.nuxt/`、`.output/`，均在忽略范围内；运行后 `git status` 仍为干净）。
- 未运行：浏览器验收、`npm run dev`、`npm run preview`、数据库初始化。
- 未读取、打开、哈希、创建、迁移、修改或删除任何数据库文件。
- 未安装依赖、未修改锁文件、未暂存、未提交、未推送、未切换分支。
- 结论仅针对 HEAD `53cd19d`；R4 状态维持"已实施、未验收、未公开"。

## 7. 修复与复验结果（2026-09-13，同日执行）

按用户直接授权（"直接审核并且修复"）执行第 5 章的最小修复，未改动任何产品语义：

| 文件                                          | 改动                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/tools/shengxiao.vue`                   | 新增具名处理器 `onSaveDialogClose()`（三条语句与原内联处理器完全一致），模板改为 `@close="onSaveDialogClose"`；移除未使用的 `SELF_PROFILE_POLICY_VERSION` 导入 |
| `tests/utils/self-profile-birth-date.test.ts` | 新增 `asRaw(value: unknown): RawBirthDate` 辅助函数，6 处畸形输入改用显式断言，删除 5 处 `@ts-expect-error`；运行时传入的畸形值不变                            |

修复后再走一遍提交钩子的格式化路径：`npx prettier --write` 对两个文件都返回 `(unchanged)`，说明修复在 `.prettierrc`（`semi: false`、`printWidth: 100`）下是**格式化稳定**的，不会被下一次提交改写坏。

同步的文档更正：`docs/audits/2026-09-11-r4-self-profile-runtime-acceptance.md` 修复第 3 行被写成字面 `` `n `` 的日期/分支/基线三行，并追加更正段说明其结论只对提交前树成立；`docs/product/README.md` 新增 §8.3 记录本次事故与修复；`docs/project/stage-roadmap.md` 的 R4 状态与验证状态补记提交后复验。原执行史不回改。

复跑结果：

| 门禁                | 修复前                                                | 修复后                                                        |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `npm run typecheck` | 失败：11 个错误                                       | 通过（exit 0，仅既有重复自动导入 warning）                    |
| `npm run test`      | 64 文件 / 2289 通过 + 1 套件编译失败                  | 64 文件 / **2334 用例全部通过**                               |
| `npm run lint`      | 0 error / 27 warnings                                 | 0 error / **26 warnings**（未使用的 POLICY_VERSION 警告消失） |
| `npm run build`     | 失败：`[vite:vue] pages/tools/shengxiao.vue (767:15)` | 成功（`✨ Build complete!`，exit 0）                          |

补充校验：全仓 91 个 `.vue` 以 `@vue/compiler-sfc` + `prefixIdentifiers: true` 重新编译模板，91/91 通过（修复前为 90 个检查 + 1 个解析失败）。

## 8. 仍在等待用户决定的事项

- **R4 是否接受**：门禁与浏览器验收均已完成（见 §7、§9），但产品接受仍是用户决定，本轮不自行升级为 `Accepted`。
- **提交 `53cd19d` 的 message body** 使用字面 `\n` 分隔，Git 中实为单行。不通过改写历史修正，建议在下一笔提交中正常书写。
- **本轮改动尚未提交**：按协议默认不自动暂存、提交或推送，等待用户审计后决定。

## 9. 修复树的真实浏览器验收（2026-09-13，同日执行）

修复并重新构建后，用生产预览 + 系统临时目录全新数据库复跑完整真机链路。

### 9.1 环境与边界

- 运行 `node .output/server/index.mjs`：`PORT=4321`、`HOST=127.0.0.1`、`DB_PATH=<os.tmpdir>/xuanxue-r4-final-20260913224845/xuanxue-r2.db`、独立随机 `SESSION_SECRET`。
- 浏览器：本机 Chromium（Playwright 1.61.0 / chromium-1228，headless）。
- 未使用、未打开、未哈希、未修改受保护业务库 `xuanxue.db`：验收前后 mtime `2026-09-07 16:40:41`、大小 `249856` 字节均未变；仓库根未生成 `xuanxue-r2.db`；两个临时库目录在验收后精确删除。

### 9.2 结果：35/35 通过

| 组       | 覆盖点                                                                                                                                                           | 结果         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 账号     | 注册（昵称、密码、年龄与两项规则确认）→ `/account`                                                                                                               | 通过         |
| 建档     | 首次建档 1990-05-05、差异确认「新增出生日期」、确认后展示                                                                                                        | 通过         |
| 修改     | 改为 5-06、差异确认「修改出生日期」                                                                                                                              | 通过         |
| 并发     | 弹层冻结候选后由后台把档案改成 5-09；陈旧版本保存被 409 拦下、提示"重新读取档案"、重读后按本次候选保存为 5-07                                                    | 通过         |
| 授权     | 停止后续档案带入 → 出现「重新允许带入」→ 勾选同意后恢复                                                                                                          | 通过         |
| 删除     | 删除出生日期（档案保留）→ 删除整份档案（账号与会话保留，`/account` 仍显示昵称）                                                                                  | 通过         |
| 公开围栏 | 已登录与游客访问 `/tools/shengxiao` 均跳转 `/tools/status`「功能整理中」，不暴露带入/保存入口                                                                    | 通过         |
| 响应式   | `/self-profile` 与 `/tools/status` 在 320/360/390/414 CSS px × 16px/32px 根字号均无横向溢出                                                                      | 通过（8 组） |
| 弹层     | 320px + 200%：弹层 `clientWidth=305 = scrollWidth`，`scrollHeight 1448 > clientHeight 700` 且 `overflow-y: auto`，确认按钮滚动后完整可见（x=16、宽 273、高 101） | 通过         |
| 隐私     | `/api/self-profile` 全部 26 条响应（GET/PUT/PATCH/DELETE，含 409）均带 `Cache-Control: no-store`                                                                 | 通过         |

### 9.3 同时完成的加固

- `.githooks/pre-commit`：`lint-staged` 从 `prettier --write` / `eslint --fix`（改写型）改为 `prettier --check` / `eslint`（门禁型），把本次事故的成因从流程上移除；格式化改由作者显式执行 `npm run format`。
- `.prettierignore` 排除 `docs/architecture/*.html`（archify 生成的交互式架构图与可视化校验页属构建产物）。
- 结果：`npx prettier --check .` 现在全仓通过（此前因上述 2 个 HTML 文件报错，该命令无法充当门禁）。

### 9.4 一处排查记录（可疑截图不放过）

首轮 320px + 200% 页面截图左侧文字看似被裁切。复测 `documentElement`/`body` 的 `scrollWidth`/`clientWidth`、`window.scrollX`，以及正文段落与危险区按钮的 `getBoundingClientRect()`，在"弹层打开前 / 打开时 / `scrollIntoView` 后 / 关闭后"四种状态下 x 恒为 25、无横向溢出；据此判定该图是**弹层淡出过渡尚未结束**时截取的中间帧。脚本已改为等待弹层真正卸载后再截图，最终证据图 `05-profile-320-200pct.png` 干净。

### 9.5 组件级证据（公开围栏下的带入/替换/撤销）

`/tools/shengxiao` 处于 R3 已接受的公开围栏之后，生产路由不可达；按与 R3 相同的标准，带入 / 替换 / 撤销 / 已登录保存入口 / 游客认证入口的证据由组件级测试承担。本次单独复跑：`tests/components/shengxiao-page.test.ts`（45 例）、`tests/composables/useSelfProfileDraft.integration.test.ts`（6 例）、`tests/composables/useSelfProfile.test.ts`（24 例）、`tests/server/api/self-profile.test.ts`（28 例）、`tests/server/self-profile.test.ts`（22 例），合计 **125 例全部通过**。

### 9.6 证据文件

`D:/@Temp/xuanxue-evidence/2026-09-13-r4-verify/`（仓库外，按用户要求不纳入仓库）：`report.json`（35 项检查明细与 26 条 API 日志）与 8 张截图（320/360/390/414 四档 200% 根字号、320px + 200% 弹层、冲突提示、公开围栏、删除出生日期后状态），逐个 SHA256 见该目录 `SHA256.txt`。
