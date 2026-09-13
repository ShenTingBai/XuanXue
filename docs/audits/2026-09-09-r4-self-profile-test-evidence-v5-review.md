# R4 v5 补证静态审阅

2026-09-09；分支 codex/foundation-rebuild，HEAD 45ad4a7。结论：补证静态审阅通过，可以进入待授权的运行验收；R4 保持 implemented_verification_pending，不是 Accepted。未执行测试、类型检查、lint、构建、浏览器或数据库。

已确认独立集成文件真实导入 useSelfProfile 与 useSelfProfileDraft，共享 API，并连接 onRemoteEvent。允许不锁定 Vue watcher 与 Promise 续体的先后，但最终断言必须限定安全结果，不能让任意失败掩盖错误。

Codex 直接修正两份测试的局部夹具问题：宿主使用 shallowRef 保留内部 ref 契约；afterEach 恢复全局后，每例重新注册 fetch；集成宿主返回真实 wrapper；成功保存响应包含与请求一致的完整日期而不是 birthDate=null；验证旧结果被清除和当前结果被保留；校验失败原因限定 stale_version/no_source；增加409保存冲突不假同步；A→B先触发账号生命周期，再执行页面清理以验证新频道不被关闭。没有修改产品源码，也没有为测试便利弱化生产约束。

对 v5 基线中 21 个 components/composables/constants/pages/server/types/utils 文件重新核对 SHA256 均一致。git diff --check 和本轮测试文件乱码检查通过。上述证据仅为静态检查，不能据此宣称测试已通过。

下一步建议用户明确授权 R4 的 typecheck/test/lint/build，以及隔离临时库端到端与浏览器验收。运行时应覆盖原历法日期规范化、保存差异、CAS冲突、删除/撤回、账号注销级联、游客页内认证、带入与撤销、no-store、320/360/390/414宽度及200%文本；不得打开或写入业务数据库。运行失败需要修复并如实记录。验收通过并获用户批准后才提交R4；远端旧分支清理保持待办。
