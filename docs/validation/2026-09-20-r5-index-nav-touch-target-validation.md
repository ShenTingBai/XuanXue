# R5 卷目导航触控命中区专项收敛 · 验证记录

> 计划：`plan-20260920-r5-index-nav-touch-target-v1`
>
> 执行日期：2026-09-20（本地时间 21:11–21:16）
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**

## 1. 缺陷与根因

R5 浏览器验收发现 `components/editorial/IndexNav.vue` 的卷目链接在窄屏下实测高度
31.5–33.5px，低于治理规范 §18.1「关键触控目标至少 44px」。

根因（审计结论）：

| 断点               | `.index-link` 规则                                            | 实测高度        |
| ------------------ | ------------------------------------------------------------- | --------------- |
| 桌面（>920px）     | `padding: 9px 8px`，内容约 26px（`.index-num` 15px 行高主导） | ≈44px           |
| **窄屏（≤920px）** | `padding: 4px 8px`（为横向网格压缩垂直空间）                  | **31.5–33.5px** |

`align-items: baseline` 让盒高由内容行高决定；窄屏把上下内边距压到 4px 后，
内容高度不足以达到 44px。**问题只在移动端网格规则，桌面态本身接近达标。**

## 2. 最小修复

只改盒模型，不动字号、编号、活动态、锚点与脚本：

```css
/* 基础规则：声明 44px 命中区下限（桌面态原本即约 44px，此声明将其固定为契约） */
.index-link {
  min-height: 44px; /* 新增 */
  /* 其余规则不变：padding / margin-inline / font-size / transition 等 */
}

/* ≤920px 移动端：补足被 padding 压缩的高度，并改为垂直居中 */
@media (max-width: 920px) {
  .index-link {
    padding: 4px 8px;
    margin-inline: 0;
    align-items: center; /* 新增：避免 baseline 在拉高的盒子里把文字顶到上沿 */
  }
}
```

**边界**：未使用负 margin、未缩小字号、未加绝对定位覆盖层、未改全局 CSS、
未禁用缩放、未用 `overflow: hidden`——这些都在定向测试中以反向断言锁定。

## 3. 定向测试

`tests/components/editorial-index-nav.test.ts`（1 → **5 例**）：

| 用例                               | 断言                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| 短章节高亮（原有）                 | 空态Ⅲ滚到 5rem 吸顶线时保持Ⅲ高亮，不提前跳到Ⅳ                                        |
| 锚点与 active class 不漂移（新增） | 四项 href 与 `data-profile-index` 保持；active 仍唯一落在Ⅲ                           |
| 基础规则含命中区下限（新增）       | `.index-link` 基础规则含 `min-height: 44px`                                          |
| 移动端垂直居中（新增）             | ≤920px 规则含 `align-items: center`、`margin-inline: 0`，且**不含** `font-size` 覆盖 |
| 不得掩盖（新增）                   | 源码不含 `user-scalable=no` / `maximum-scale` / `overflow: hidden`                   |

happy-dom 不做真实布局，因此测试只断言**样式声明**；真实 ≥44px 由第 4 节浏览器证据确认，
未伪造几何通过。

**鉴别力验证**：临时移除 `min-height: 44px` 后，第三例精准失败
（`expected ... to contain 'min-height: 44px'`），其余 4 例仍通过；随后从备份恢复。

## 4. 浏览器复验（独立生产预览）

### 4.1 环境

| 项         | 取值                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 构建       | `npm run build` 产物 + `node .output/server/index.mjs`（**复验前重新构建**）                        |
| 端口       | 4397                                                                                                |
| 临时数据库 | `D:/@Temp/xuanxue-evidence/2026-09-20-r5-index-nav-touch-target/external-db/touch-tmp.db`（仓库外） |
| 白名单     | `XUANXUE_INTERNAL_TOOLS=bazi:1`（账号 id=1）                                                        |
| 证据目录   | `D:/@Temp/xuanxue-evidence/2026-09-20-r5-index-nav-touch-target/`（仓库外）                         |

**先构建后复验**：首轮测量时预览仍运行旧构建产物（实测 31.5–33.5px），
重新构建并重启后复测才反映新 CSS——这本身证明「复验必须针对当前构建」。
构建产物 `bazi.jaV81rvT.css` 已确认含 `min-height:44px`。

### 4.2 命中区实测（`getBoundingClientRect().height`）

| 视口 | 空态（6 个链接） | 生成后 | 全部 ≥44 | 页面横向溢出 |
| ---- | ---------------- | ------ | -------- | ------------ |
| 320  | 44.00 ×6         | 44.00  | ✅       | 无           |
| 360  | 44.00 ×6         | 44.00  | ✅       | 无           |
| 390  | 44.00 ×6         | 44.00  | ✅       | 无           |
| 414  | 44.00 ×6         | 44.00  | ✅       | 无           |

320px + **200% 文本缩放**：卷目最小高度 **53px**（字号放大后行高增长，min-height 是下限），
生成按钮完整可见，无页面级横向溢出。

测量 JSON：`touch-measurements-empty.json`、`touch-measurements-generated.json`；
截图：`touch-empty-{320,360,390,414}.png`、`touch-generated-{320,414}.png`、`touch-zoom200-320.png`。

### 4.3 交互不回归

| 检查                   | 结果                                                |
| ---------------------- | --------------------------------------------------- |
| 点击卷目Ⅲ              | active=Ⅲ、summary 吸顶 80px、焦点在 `#bazi-summary` |
| 点击卷目Ⅴ              | active=Ⅴ、焦点在 `#bazi-scope`                      |
| Ⅴ 展开后（169→1100px） | active 仍稳定在Ⅴ（几何重算未受影响）                |

## 5. 自动化门禁（修复后工作树）

| 命令                                                          | 退出码 | 结果                                               |
| ------------------------------------------------------------- | ------ | -------------------------------------------------- |
| `npm run typecheck`                                           | 0      | 仅既有 `HexagramInfo` 重复导入警告                 |
| `npx vitest run tests/components/editorial-index-nav.test.ts` | 0      | 5/5                                                |
| `npm run test`                                                | 0      | 89 文件 / **2686 用例**（较修复前 +4，即新增断言） |
| `npm run lint`                                                | 0      | 0 errors / 56 warnings（均为既有）                 |
| `npm run build`                                               | 0      | 生产构建成功                                       |

## 6. 敏感临时文件清理

**上轮产物清理**（本轮计划要求）：已删除
`D:/@Temp/xuanxue-evidence/2026-09-20-r5-browser-acceptance/` 下的
`.session-secret`、`external-db/r5-browser-tmp.db` 及其 `.bak`/`.lock`；
保留 28 张截图与 `preview.log`。

**本轮产物清理**：预览停止后删除同目录结构下的 `.session-secret`、
`external-db/touch-tmp.db` 及其 `.bak`/`.lock`；`external-db/` 现为空目录。
保留 7 张截图、2 份测量 JSON 与启动日志（均不含凭证）。

仓库检查：验证文档与本记录不含密码、`SESSION_SECRET`、Cookie 或业务数据库路径。

## 7. 数据库隔离

全部数据库写入只发生在仓库外临时库。业务数据库 `xuanxue-r2.db`
（mtime 2026-09-15 20:11）与 `xuanxue.db`（mtime 2026-09-07 16:40）在
复验前后 **mtime 完全一致**；本轮未读取、未哈希、未创建、未迁移、未修改、
未删除任何业务数据库文件。

## 8. 状态边界

本专项**只关闭 §18.1 触控命中区缺陷**。它**不表示**：

- R5-A 来源审阅完成——`sourceReviewStatus` 与 3 项未决 GAP 保持原样；
- 公开准入完成——`bazi` 仍为 `exposure=internal`，普通访客仍进状态页；
- R5 整体 Accepted——R5 阶段状态仍由用户确认。

相关记录：[R5 浏览器验收](2026-09-20-r5-browser-acceptance-validation.md)（本缺陷的发现来源）、
[卷目短章节收敛](2026-09-20-r5-index-nav-active-section-validation.md)。

## 9. plan_amendments

见 `.claude/results/20260920-r5-index-nav-touch-target-v1-result.yaml` 的 `plan_amendments` 段。

## 10. 结论

窄屏卷目链接命中区由 31.5–33.5px 提升至 **44px**（200% 缩放下 53px），
四档视口与生成后页面全部达标，无横向溢出，卷目高亮/锚点/焦点/reduced-motion 行为不变。
状态：**technical_verification_passed_pending_user_acceptance**。
