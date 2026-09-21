# R6 公开面 truthfulness 返工验证记录

> 计划：`plan-20260921-r6-public-surface-truthfulness-v1`
>
> 执行日期：2026-09-21（本地时间 15:20–15:45）
>
> 执行者：ZCode（Claude 侧执行器）
>
> 验证状态：**technical_verification_completed**（只修公开面 truthfulness；不改变工具目录或公开放行状态）

## 1. 背景

R6 全链路公开门禁审计（`docs/audits/2026-09-21-r6-full-chain-public-gate-audit.md`）发现首页
`pages/index.vue` 通过 `constants/sample-bazi.ts` 渲染四柱、纳音、日主强弱与神煞名称，违反八字契约 §16，
构成 bazi 公开门禁第 7、8、16 项 blocked；同时 `public/robots.txt` 的 Sitemap 指向示例域名
`xuanxue.example.com`，与 `nuxt.config.ts` 的 `siteUrl=https://xuanji.me` 漂移。

本计划只处理这两个公开面缺口，不修改任何目录、导航、SEO、PWA 生成逻辑或工具公开 exposure。

## 2. 变更

| 文件                                   | 操作   | 说明                                                                                     |
| -------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `pages/index.vue`                      | modify | 删除「命盘预览」整段公开渲染；移除 `sample-bazi`、`WUXING_COLORS`、`getNayinWuxing` 等仅供该区块的 import、常量和 computed |
| `constants/sample-bazi.ts`             | delete | 删除仅被首页使用的预计算命盘/神煞示例常量（含日主强弱、喜忌、五行比例、神煞现实承诺等禁止/未核验字段） |
| `public/robots.txt`                    | modify | Sitemap 从 `xuanxue.example.com` 改为 `xuanji.me`，与 nuxt.config 的 `siteUrl` 一致       |
| `tests/pages/index-content.test.ts`    | modify | 新增 5 条回归断言：首页不引用 sample-bazi、不渲染禁止字段；robots 使用 xuanji.me、无示例域名 |

**未修改**：`nuxt.config.ts`（sitemap 生成逻辑）、`constants/tool-catalog.ts`、`server/**`、`middleware/**`、
`/tools/bazi` 页面、旧八字计算引擎、R6 审计/验证文档（known dirty，只读不改写）。

## 3. 自动化门禁（本轮工作树）

| 命令                | 退出码 | 结果                                        |
| ------------------- | ------ | ------------------------------------------- |
| `git diff --check`  | 0      | 通过                                        |
| `npm run typecheck` | 0      | 0 错误；仅既有 `HexagramInfo` 重复导入警告  |
| `npm run test`      | 0      | **89 文件 / 2690 用例通过**（+4：新增回归） |
| `npm run lint`      | 0      | 0 errors / 56 warnings（均为既有）          |
| `npm run build`     | 0      | 生产构建成功（7.07 MB）                     |

专项回归：`npx vitest run tests/pages/index-content.test.ts` → 14 测试通过（含新增 5 条）。

## 4. 源码级验证

### 4.1 首页禁止字段移除

`pages/index.vue` 与全仓生产代码对以下符号 **0 命中**：`sample-bazi`、`SAMPLE_BAZI`、
`SAMPLE_PROMINENT_SHENSHA`、`日主：`、`神煞：`、`身弱`、`福星贵人`、`五行比例`、`天生福气`、`命盘预览`。
`constants/sample-bazi.ts` 已删除，仓库生产代码（排除 docs 历史）无任何引用。

### 4.2 robots Sitemap 修复

`public/robots.txt`：`Sitemap: https://xuanji.me/sitemap.xml`（count=1）；`xuanxue.example.com`（count=0）。

## 5. 生产预览浏览器复验

| 项               | 取值                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| 生产构建         | `node .output/server/index.mjs`                                                          |
| 预览端口         | `4399`（独立端口）                                                                       |
| 临时数据库       | `D:/@Temp/xuanxue-evidence/2026-09-21-r6-public-surface/external-db/r6-surface-tmp.db`（仓库外独立空库） |
| `SESSION_SECRET` | 随机 48 字节 hex，仅存仓库外                                                             |

### 5.1 HTTP 层

- `GET /robots.txt`：`Sitemap: https://xuanji.me/sitemap.xml` ✓
- `GET /sitemap.xml`：6 个 URL（`/`、`/account`、`/login`、`/privacy`、`/terms`、`/tools/status`），**无 internal 工具** ✓
- 首页 SSR HTML：`命盘预览/日主：/神煞：/福星贵人/身弱/五行比例/庚午/天生福气` **0 命中** ✓；中性定位 `传统文化自我探索` 保留 ✓

### 5.2 浏览器（IAB）

| 项                     | 结果                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| 客户端渲染首页         | 禁止字段 **0 命中**；「传统文化自我探索」「登录查看状态」「相关工具正在逐项核验」均保留   |
| 320 / 360 / 390 / 414  | 305 / 345 / 375 / 399，无页面级横向溢出                                                   |
| 320px + 200% 文本缩放  | 305 / 305，无横向溢出（放大根字号方式，未禁用缩放）                                      |
| 游客 `/tools/bazi`     | 302 → `/tools/status?tool=bazi`（bazi 仍 `internal`，未变）                              |
| 游客 `/tools/shengxiao`| 200 SPA 壳 + 客户端重定向（未变）                                                        |
| 首页 SSR 工具名        | 无「八字/生肖」工具名                                                                    |

截图存于仓库外 `D:/@Temp/xuanxue-evidence/2026-09-21-r6-public-surface/`（不含凭证）。

## 6. 未解决的阻断（本计划不处理）

- **GAP-BZ-001**（立春年界无直接原文）与 **GAP-BZ-007**（原刻影印核对未完成）仍保持未决；
- **bazi 公开体验第 15 项**（游客从首页进入的公开路径验收）仍为 blocked；
- **shengxiao `computePolicy=blocked`** 未在本计划修改（需另行产品/目录裁决）。

因此本计划的首页修复**不构成** bazi 或 shengxiao 公开门禁已通过；需重新执行 R6 bazi 公开门禁审计
确认第 7、8、16 项已解除后，再单独处理来源与公开体验阻断。

## 7. 状态边界

- 本记录是**执行者自查**，不是 Codex 独立审查；
- 本计划**未**自动提交、推送、部署或修改公开工具目录；
- 本计划只修公开面 truthfulness，不把首页修复写成 bazi 公开门禁已通过。
