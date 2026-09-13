# R4 convergence v2 静态复核

2026-09-09，基线 `45ad4a7`，分支 `codex/foundation-rebuild`。结论：**changes_requested**；R4 仍 `implemented_verification_pending`。没有运行项目、测试、构建、浏览器或数据库。

已确认 UPDATE 改为合法行值赋值，HTTP 顶层白名单及固定错误信息有实质修正，账号请求增加代际判定，确认事件现在携带 expected。以下残留仍阻止功能闭环。

1. **P1：通知频道仍未启动，旧请求可能恢复失效缓存。** `composables/useSelfProfile.ts` 的 `bindChannel()` 没有任何生产调用；全项目仅有定义和导出。新写的测试手动调用不能证明页面已接通。收到通知仅置 profile 为 null，没有使在途读取过期，晚到 GET 可重新写入已删除/撤回的档案。卸载仅关闭监听，未使请求代际失效。focus 刷新 summary 也没有驱动候选/撤销缓存同步失效。
2. **P1：游客认证清空本次保存意图。** `pages/tools/shengxiao.vue` 的账号 watch 用 `accountChanged && current === authenticated` 判断换账号，guest/null → authenticated/id 同样命中，清空草稿、结果、年龄声明及保存意图。应区分原本已认证 A → B 与游客页内登录；后者必须保留当次输入，进入独立差异确认，绝不自动 PUT。
3. **P1：撤回后第二次点击可继续计算旧日期。** `handleSubmit` 在 verifyBeforeCompute 返回 revoked/stale 后调用 `draftBridge.clear()`；clear 只清来源与 API 状态，不清页面日期，也不清 result。下次点击来源为 manual，跳过档案校验，旧日期仍能用于计算。来源失效应原子清除受影响草稿/结果/候选/快照，不能把旧日期重新标为手动。对有 await 的提交还需捕获输入修订号、账号、年龄声明与来源；等待期间编辑、退出、撤回或选择未满十四岁必须取消旧提交。
4. **P1：读取失败仍能确认保存，409 重读失败被当作成功。** 两个页面的 reloadForConflict 用 try/catch 调 loadProfile，但 loadProfile 内部捕获网络错误并返回 null，父页面随后无条件清 conflict。打开保存框时读取失败仍展示差异；对话框 canConfirm 不检查读取成功状态。须显式区分成功无档案、成功有档案、失败、失效；只有成功且账号/候选一致才能冻结差异和解除冲突。候选也必须复制冻结，confirm 的 accountId 在父页面提交前核对，不能仅声明载荷字段却忽略。
5. **P2：CHECK 仍有 NULL 漏洞。** 两个完整分支以 `raw_calendar = 'solar'/'lunar'` 开始，未显式要求 raw_calendar 非 NULL。若 calendar NULL 但其他公历字段完整，整个 OR 表达式可为 NULL，SQLite CHECK 不拒绝 NULL。增加非 NULL 条件或将完整谓词包为确定布尔值，并补该精确反例的纯内存 SQL 用例。

## 结果与计划管理

v2 result 仍实际写 `status: success`，正文语义解释不能替代字段。Codex 已更正根字段并在项目配置中补充明确规则，保留任务实施完成记录。原分支及 R3 提交偏差继续接受，不重复请求授权；原执行起点不追改。

后续使用 `.claude/plans/plan-20260909-r4-self-profile-convergence-v3.yaml`，只修以上链路并编写回归。测试必须通过真实父页面事件与生命周期证明接线，不能仅直接调用辅助函数。R3 既有用例、工具围栏、黄金和生产数据库保持原边界。远端旧分支清理仍等待可合法运行推送钩子的时机。
