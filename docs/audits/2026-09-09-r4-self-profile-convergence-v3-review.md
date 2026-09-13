# R4 convergence v3 静态审阅

2026-09-09；基线 `45ad4a7`，分支 `codex/foundation-rebuild`。结论：changes_requested，仍为 implemented_verification_pending。未运行项目代码、类型检查、测试、构建、浏览器或数据库。

## 已确认修复

频道已有实际 onMounted/auth watch 接线；读取已区分成功空档、失败、过期和未认证；游客登录与已认证 A→B 已分开；原子来源失效与计算前修订核验已有实现；CHECK 完整分支显式要求 raw_calendar 非 NULL。根 result.status 已正确填写。`@close` 递增非响应式 saveIntentSeq 用于意图代际，不参与显示，该偏差接受；仍需以整个异步链路是否丢弃过期操作作为验收依据。

## 残留缺口

1. **P1，显示候选与冻结请求不一致。** `SelfProfileSaveDialog.vue` 在 candidate 变化时仅取消勾选后 return，没有更新或作废 frozenBirthDate；diff/description 却使用新 candidate。重新勾选可确认，handleConfirm 仍发送旧 frozenBirthDate。应采用明确候选修订号：任何变化先使旧快照不可确认，展示并重新确认后提交同一版本快照。不能在显示新候选 B 时发送旧候选 A。当前测试“候选变化使旧同意失效”只改局部 ref，初次传入 mountDialog 的值并非自动绑定，必须使用 setProps 或真实响应式宿主，并断言最终 emitted payload。
2. **P1，来源 await 后可能为空。** `verifyBeforeCompute` 在 await loadSummary 后直接读取 origin.value.profileId/version。loadSummary 更新响应式 summary 时，summary watcher 会先运行并在版本变化时 invalidateSource 清空 origin，后续异步续体可能空引用异常。捕获来源快照与修订号，await 后先核对来源仍存在且同代，再比较本次成功摘要，返回有界失败而非解引用可变来源。仅在父页面 await 后检查修订号无法防止桥接函数内部先抛异常。
3. **P1，同页保存的来源同步晚于摘要监听。** save 内先更新 summary，父页面 await save 后才调用 resyncOrigin。对于“档案带入→手改→保存”的更新，summary watcher 可以先按新版本将当前草稿/结果清空；之后 resyncOrigin 因 origin 已空无法恢复。同页成功保存与来源版本确认应在同一可观察状态更新之前建立关联，区分确认后的本地保存和外部更改，不把所有 saved 事件无条件视为有效授权。
4. **P2，旧操作结束会减少新账号的 loading 计数。** invalidate 把 pendingOps 清零，但旧请求 finally 仍无条件 opEnd；账号 B 开始新请求后，账号 A 的晚到 finally 会把 B 的计数减到零。操作计数应绑定代际/唯一 token，旧操作只能移除自己的 token。验证 A→B、旧请求完成、新请求尚在途时 loading 仍为 true。
5. **P2，换账号后页面清理会再次关闭新绑定频道。** useSelfProfile 的 auth watch 先 invalidate/bindChannel，生肖页后续 clearPersonalState→draftBridge.clear→profileApi.clear 又关闭频道。应单一组件拥有频道生命周期，区分页面草稿清理与 API 账号生命周期清理，A→B 后确保 B 的频道仍工作。不要靠多处重绑制造重复监听。

以上属于静态可定位的调用顺序与状态绑定问题，尚未以运行证据复现。v4 仅修这些缺口及相关回归，不重做已成立的领域/API/页面功能。运行验收仍需用户另行授权；远端旧分支清理继续保持待办。
