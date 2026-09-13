# R4 v4 静态审阅与测试证据缺口

2026-09-09；基线 `45ad4a7`、`codex/foundation-rebuild`。状态仍 implemented_verification_pending。本轮没有运行测试、构建、项目代码或数据库。

v4 的确认快照更新、originRevision await 后保护、summary 发布前的本地写成功回调、操作 token 集合、clearData 与频道生命周期分离，静态实现与前次修复要求相符。本轮不要求继续改动产品源码，不代表运行验收通过。

## 不接受的证据偏差

汇报称真实桥接时序回归已下沉到 tests/composables/useSelfProfile.test.ts；实际该文件仅导入并挂载 useSelfProfile，没有导入或调用 useSelfProfileDraft。它的回调断言只能证明 API 发通知的顺序，不能证明真实桥接注册、来源同步和 summary watcher 协作正确。tests/components/shengxiao-page.test.ts 仍模拟桥接，直接让 verifyBeforeCompute 返回 no_source，及断言未调用 resyncOrigin，不能替代内部时序回归。

此外 composable 测试的 BroadcastChannel 替身把 postMessage 回送发送实例自身，与浏览器频道的发送者不接收自身消息不符；真实 API composable 显式导入 useAuth，测试只 stubGlobal('useAuth') 不能替代该模块导入。修正测试边界时需与真实依赖入口一致，不修改生产模块来适配错误替身。

## 下一步

使用独立 tests/composables/useSelfProfileDraft.integration.test.ts，真实挂载 API 与桥接，受控认证模块和延迟 fetch；验证来源在 await 期间被清空后的有界返回、同页保存前置同步避免误清草稿、外部更新仍失效，以及切账号后频道继续工作。修正旧 composable 测试的认证模块替身、消息投递及销毁。只编写用例，不运行；源码冻结在新计划指纹中。

v4 原 task 完成记录保留；第 2 项 plan_amendment 标为 evidence_not_supported，补证后再审阅。根状态本轮保持正确，不修改为 success。旧远端分支继续保留到获准运行推送钩子的阶段。
