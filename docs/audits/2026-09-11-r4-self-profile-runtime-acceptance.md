# R4 本人档案运行时验收

日期：2026-09-13`n分支：`codex/foundation-rebuild``n基线：`45ad4a7`

## 修复

修复 `pages/self-profile.vue` 对嵌套 `error` ref 的判断，空档案首次读取失败可重试，且新增窄屏卡片留白规则。修复 `components/profile/SelfProfileSaveDialog.vue` 在 320px、200% 根字号下的弹层横向布局：操作按钮改为单列并降低窄屏水平内边距，保留滚动和键盘可达性。

## 自动化验证

- `npm run typecheck`：通过（仅已有重复自动导入 warning）。
- `npm run test`：64 个文件、2334 项通过。
- `npm run lint`：0 error、27 warnings；warning 为既有或非阻断未使用变量/测试组件规则。
- `npm run build`：通过，Nuxt client/server、Nitro 与 PWA 产物生成完成。
- `git diff --check`：通过；乱码特征扫描仅命中 AGENTS.md 中的检测命令、既有 `stroke-dict.ts` 字符键与历史产品文案，未命中本轮新增或修改文件。

## 生产预览与临时库

使用最新构建在 `127.0.0.1:4320` 启动，每次启动器通过 `os.tmpdir()` 创建唯一 `xuanxue-r4-preview-*` 目录和数据库；未读取、哈希、修改或删除受保护业务数据库。真实浏览器链路覆盖注册、首次建档、差异修改、撤回保留日期、重新允许带入、旧版本删除 409/no-store、删除出生日期保留档案、删除整档保留会话，以及生肖公开围栏保持。

## 响应式证据

Playwright（Browser 插件在本环境不可用，按前端调试规范采用 Playwright fallback）检查 320、360、390、414 CSS px，根字号 16px 与 32px。页面 `scrollWidth` 未超过 viewport；按钮文字边界均在按钮内。320px + 200% 保存弹层 `clientWidth=305`、`scrollWidth=305`，弹层可纵向滚动，确认按钮滚动至视口后可用。截图保存在 `D:/@Temp/r4-acceptance/profile-fixed-*.png` 与 `profile-dialog-bottom-320-32.png`。

## 隐私与残余说明

网络记录中出生日期只出现在明确保存请求的 PUT body；GET 请求不返回出生日期的 summary 路径。预览启动期间一次 `/api/auth/me` 的 401 是注册前游客会话探测，已从浏览器错误判定中排除，不是运行时异常。R3 生肖公开围栏仍保持原状态，隔离桥接 harness 不冒充生产公开功能。

R4 目前为技术验收通过、待用户接受；未提交、未推送、未标记 `Accepted`。
