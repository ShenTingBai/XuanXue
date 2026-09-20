# R5 卷目短章节高亮收敛 · 验证记录

> 日期：2026-09-20
>
> 状态：**superseded_by_browser_acceptance**（本记录的浏览器阻塞已由 [R5 生产预览与全链路浏览器验收](2026-09-20-r5-browser-acceptance-validation.md) 补齐；本记录保留为前置收敛轨迹）

## 1. 缺陷与根因

八字页空态的Ⅲ「核心结果摘要」高度约 80px。旧算法把视口 25%—35% 作为高亮带：
当Ⅲ按 `scroll-margin-top: 5rem` 滚到吸顶位置时，Ⅲ可能已经整体位于高亮带上方，
而下一节Ⅳ进入带内，导致卷目提前显示Ⅳ。

根因不是某个页面的固定高度，而是“当前节”判定依据与锚点落点不一致：
页面锚点按 5rem 吸顶线定位，导航却按另一个随视口高度变化的窄带判定。

## 2. 修复

- `components/editorial/IndexNav.vue`
  - 当前节统一按“5rem 吸顶线处最后一个顶边已越线的章节”判定；
  - 不再依赖章节自身高度，短章节与展开章节采用同一规则；
  - 滚动与窗口变化按动画帧合并，避免同一帧重复读取布局；
  - 使用 `ResizeObserver` 监听折叠内容带来的几何变化；卸载时清理监听、观察器与待执行帧。
- `tests/components/editorial-index-nav.test.ts`
  - 新增空态Ⅲ仅 80px、高亮吸顶线为 5rem、Ⅳ已进入视口上部的几何回归用例；
  - 期望仍高亮Ⅲ，不得提前跳到Ⅳ。

## 3. 本轮验证

- `npm run typecheck`：exit 0；保留既有 `HexagramInfo` 重复导入警告。
- `npx vitest run tests/components/editorial-index-nav.test.ts`：1/1 通过。
- `npm run test`：89 文件 / 2682 用例通过。
- `npm run lint`：exit 0，0 errors / 56 warnings。
- `npm run build`：exit 0；保留既有重复导入、chunk 大小与 Node 依赖弃用警告。
- `git diff --check`：通过。
- 乱码检测：`components/editorial/IndexNav.vue` 与新增测试 0 命中。
- 临时预览 HTTP：`/tools/status?tool=bazi` 与 `/tools/bazi` 均返回 200；使用独立临时数据库和端口 4395。
- 浏览器交互当时未完成：Browser 插件不可用，Playwright Chromium 下载/启动失败，已有 headless shell 不能稳定退出；该时点未伪造截图或交互通过证据。后续 IAB 生产预览证据见 [R5 浏览器验收记录](2026-09-20-r5-browser-acceptance-validation.md)。

## 4. 待验证

本记录当时的待验证项已由后续计划补齐；历史清单如下：

1. 定向组件用例；
2. typecheck 与全量测试；
3. 临时数据库隔离的 `/tools/bazi` 浏览器回归，覆盖空态Ⅲ、生成后Ⅲ、Ⅴ折叠/展开；
4. 320px 与桌面视口的卷目点击、高亮、焦点及 reduced-motion 行为。

本记录不单独决定 R5 状态；后续浏览器记录仍如实保留卷目触控目标 34px 缺陷与 console 逐条采集限制。
