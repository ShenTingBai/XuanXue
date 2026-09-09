# R3 生肖运行验收记录

日期：2026-09-09。执行者：Codex。用户在审阅 v3 后明确授权完整运行验收。基线 HEAD：`5af305e61861724f017f3079416e5d2de89bbc2f`，分支：`codex/p0-tool-availability-containment`。

## 结论与范围

生肖限定实现的工程检查、页面组件浏览器验收及支持年份春节边界核验完成。等待用户最终确认与独立公开准入，R3 不标记 Accepted。目录仍为 `in_review/internal/blocked/disabled`，未提交、未推送；历史 v1/v2/v3 result/checkpoint 原件保留。

后续用户裁决（2026-09-09）：用户回复“继续吧，产品UI我们后续再打磨，先把功能和要求跑通”。据此接受本次限定功能交付并进入 R4 准备，路线图将 R3 实施状态更新为 Accepted；公开状态不变，视觉打磨后置。此裁决不回改上面的验收时点记录，也不授权 Git 提交推送。

## 实际发现与最小修复

- `components/tools/BirthDateInput.vue`：首轮组件测试发现错误说明只关联 fieldset；补齐三个输入框的 aria-describedby。200% 文本缩放时日期输入自动换行，保留年份可读宽度。
- `tests/utils/shengxiao-engine.test.ts`：黄金部分 lunarDate 带“（除夕）”而引擎提供纯日期。只分离这一明确后缀，日期主体仍逐字比较，除夕另断言输入日等于结果年界末日；不改变黄金 YAML/JSON，不忽略其他差异。首轮两项失败经修复定向复测 19/19 通过。
- `pages/tools/shengxiao.vue`：320px、200% 文本缩放发现时区英文溢出，主内容允许长词断行，不裁切或禁缩放。
- `components/tools/shengxiao/VerifiedCulture.vue`：生肖按钮改为按可用宽度换行并保留最小触控宽度；文化卡片标题可换行；来源循环变量改名，消除本轮新引入的模板遮蔽警告。
- `components/tools/shengxiao/VerifiedResult.vue`：真实 PNG 实物检查发现导出根节点外边距进入图片导致底部裁切；间距移至导出节点外，重导图片的版本文字和底部边框完整。

以上为用户授权验收期间的有限修复，超出旧执行计划的静态只读期；未更改历法生产算法、黄金数据、目录围栏或数据库实现。

## 工程验证

最终生产源码：`npm run typecheck` 通过；`npm run test` 57 文件、2170 用例全部通过；`npm run lint` 0 error、1 条既有 warning（layouts/default.vue:90）；`npm run build` 通过。既有重复 HexagramInfo 自动导入、较大 bundle、依赖弃用提示未作为本轮新功能缺陷处理。最终空白与乱码检查通过。

## 浏览器证据边界

Browser plugin not available，使用本机 Microsoft Edge + Playwright（无新增项目依赖）。两套环境分开：

1. `http://127.0.0.1:4318`：真实生产预览；临时 DB_PATH 与随机 SESSION_SECRET。`/tools/shengxiao`、`/tools/shengxiao/` 均跳转 `/tools/status?tool=shengxiao`，无日期输入；这是围栏验证，不是公开工具使用验收。
2. `http://127.0.0.1:4319`：仓库外隔离组件环境，加载真实页面、领域引擎、共享组件和项目样式；仅注入游客认证 ref、Nuxt 元信息空实现及链接适配。目录不替换，导出入口仍隐藏；不冒充完整 Nuxt 账号端到端验收。

组件环境验证游客空草稿、年龄声明、公共生肖切换、Enter/Space 提交、有效结果、修改失效、非法日期恢复、刷新清空、认证 ref 退出清空、公共内容保留、无出生日期网络载荷/URL/本地存储。测试期间 localStorage/sessionStorage 为空，无页面运行异常。认证切换证据属于注入状态，不代表真实退出接口本轮重新验收。

320/360/390/414 CSS px 及 1280px，分别在 16px/32px 根字号下截图并检查，无页面横向溢出；200% 指文本根字号放大，不冒充浏览器原生缩放或真实手机验收。以洛杉矶时区浏览器、固定 UTC 2026-09-09 16:30 验证上海已是 9 月 10 日：当天可查，11 日拒绝。

真实 ExportButton 点击、成功/失败反馈由页面集成测试验证；真实 html-to-image 图片生成另在隔离环境调用实际 useExportImage 和隐私卡片元素，获得 PNG 并目视检查完整性，不冒充当前被围栏隐藏的按钮已在生产可用。

## 独立历法核验

下载并解析香港天文台 1901–2027 年共 127 份逐年表，用独立表中的正月初一确定期望值：1901–2026 年共 126 个农历年首/年末、378 个春节前/当/后日期，候选引擎全部匹配。2027 表仅用于核对 2026 年末，不扩大查询范围。

同一组 378 日期与 Edge Intl Chinese calendar 交叉比较，有 3 条差异：1954-02-03、1954-02-04、1999-02-15。香港天文台分别给出正月初一、初二、腊月三十，支持候选引擎；未把 Intl 的结果当作黄金替换现有证据。来源：[1954 年对照表](https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T1954c.txt)、[1999 年对照表](https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T1999c.txt)。

这些证据证明全支持年份的春节边界抽样，不代表逐日穷举整个支持区间，也不证明每条输出都拥有独立典籍事实支持。原 26 日期、60 分类黄金用例已运行通过。

## 产物与数据保护

本机复现脚本、官方表原文及 SHA256、核对结果、截图和导出图片保存在 `D:/@Temp/r3-acceptance/`：`hko-tables.json`、`official-result.json`、`calendar-crosscheck.json`、`ui-evidence.json`、`result-*-*.png`、`privacy-card.png`。这些是本机验收产物，不是仓库内可移植附件。

测试沿用独立临时库隔离，预览只使用本轮临时库；未读取、哈希、修改或恢复项目业务数据库。黄金原件及受保护生产目录保持原样。停止验收服务并清理本轮预览临时库后交付。
