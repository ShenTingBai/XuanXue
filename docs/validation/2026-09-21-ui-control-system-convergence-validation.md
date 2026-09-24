# 统一全站账户控件与工具表单视觉系统 — 验证记录

> 计划：`.claude/plans/plan-20260921-ui-control-system-convergence-v1.yaml`
> 日期：2026-09-21
> 执行：ZCode（plan-execute v2.2）
> 状态：**工程通过 + 视觉验收通过；用户接受与正式公开批准均为 pending**

---

## 1. 本轮范围

把全站「选择控件」与「账户控件」收敛到单一视觉体系，不重新设计品牌：

1. 顶栏游客态从「未登录 登录」并排双标签 → **单一账户触发器**；
2. 生肖 / 八字 / 档案 / 认证 / 合婚 / 称骨 / 紫微 / 择日 的 radio 与 checkbox → 共享 `choice-control`；
3. 规则解释与来源台账 → 默认收起，但年界、范围、隐私与关键限制直接可见。

**不在范围内**：计算规则、来源结论、工具目录、认证 API、历史策略、数据库。

---

## 2. 审计基线（改动前）

真实浏览器（`nuxi dev`，独立临时数据库）实测：

| 位置 | 改动前实现 | 实测问题 |
| --- | --- | --- |
| 顶栏（桌面，游客） | 一个 `<NuxtLink>` 内两个 `<span>` | 文本渲染为 `未登录登录`，宽度 110px，读起来像两个并列选项 |
| 顶栏（移动抽屉，游客） | 同上，`未登录` + `ml-auto` 的 `登录` | 同一项内并排双标签 |
| 生肖年龄确认 | `.age-radio`（页内 scoped） | 18px 圆点；用**玉色/朱砂**区分两个选项（颜色即语义） |
| 八字历法 | `.bazi-choice` + `.bazi-dot` | 18px 圆点；农历选项**玉色边框**，与其他页面的 ink/cinnabar 体系不一致 |
| 档案出生日期 | `.calendar-choice` + `.calendar-dot` | 最小宽 88px；选中态为朱砂，但结构自成一套 |
| 合婚性别/历法 | `.radio-custom` | 独立 scoped 体系，`sr-only:checked +` 选择器 |
| 称骨性别 | Tailwind 内联拼装 | 16px 圆点，与上面都不同 |
| 紫微性别 | `.gender-radio--selected/--unselected` | 文字 chip 无 indicator，另加内联 `boxShadow` |
| 择日事项 | `<button role="radio">` | **非原生控件**，手写 `aria-checked` 与键盘分支 |
| 认证注册勾选 | `peer` + Tailwind 拼装 | 引用了**未定义**的 `border-ink-lighter`；编译产物中该规则为 0 条 |

**关键证据（`border-ink-lighter`）**：该名称不在 `tailwind.config.ts` 的 `ink` 色阶
（只有 `faint/light/medium/muted/DEFAULT/dark/darkest`）。编译后 CSS 中
`border-ink-light` 命中 1 条、`border-ink-faint` 6 条、**`border-ink-lighter` 0 条**，
即三个注册勾选框的边框退化为 `currentColor`，从未按设计意图渲染。

---

## 3. 实施内容

### 3.1 共享选择控件（`assets/css/main.css`）

新增 `choice-control` 及其子元素，标准结构为
`label.choice-control > input.sr-only + span.choice-control__indicator + span.choice-control__text`：

- 命中区 `min-height: 44px`；
- 默认 `paper-dark` 边框、`paper-lightest` 底、`ink-medium` 文字；
- hover 35% 朱砂边框（比选中态更淡，避免误读为已选中）；
- 选中：朱砂边框 + 8% 朱砂底 + `cinnabar-deepest` 文字，indicator 内出现朱砂圆点
  （checkbox 为朱砂填充 + 纸色对勾，**形状独立于颜色**编码）；
- focus-visible：indicator 上 2px 朱砂 outline；
- disabled：50% 透明 + `not-allowed`，且 hover 不再变化；
- `--error`：边框与 indicator 双重提示；
- `--block`：长文本声明变体（整块可点、indicator 与首行对齐、选中不铺底）。

颜色全部引用既有 `--color-*`；`color-mix()` 替代 `rgba()` 与 `bg-x/N`。
`@supports` 兜底不另加：`:has()`（Chrome 105）是 `color-mix()`（Chrome 111）的子集，
而项目已在全站依赖后者。

### 3.2 账户控件

- 桌面游客：账户图形 + 「未登录」同属一个 `NuxtLink`，`aria-label="未登录，前往登录或注册"`，
  点击进入 `/login`；`min-height: 44px`；
- 移动抽屉游客：同样单项、同 aria-label，`.account-control` 保证 44px；
- 已登录：同位置 `AvatarCircle` + 真实昵称 + 下拉菜单，未改动；
- `restoring` 阶段两者都不渲染（保留原防闪烁逻辑）。

### 3.3 表单迁移

| 文件 | 迁移内容 |
| --- | --- |
| `pages/tools/shengxiao.vue` | 年龄确认 → `choice-control`；删除 `.age-radio` 整套 scoped 样式 |
| `components/profile/BirthDateGroupInput.vue` | 历法 + 闰月 → `choice-control`；删除 `.calendar-choice` / `.calendar-dot` / `.leap-dot` |
| `components/bazi/BaziInputForm.vue` | 历法 + 闰月 + 十四周岁 → `choice-control`；删除 `.bazi-choice` / `.bazi-dot` 与自建勾选框样式 |
| `components/profile/SelfProfileSaveDialog.vue` | 长期保存告知 → `choice-control--block`（消除浏览器原生蓝勾） |
| `components/auth/AuthForm.vue` | 三个注册勾选 → `choice-control--block`（同时修掉 `border-ink-lighter`） |
| `pages/tools/hehun.vue` | 性别 + 历法 → `choice-control`；删除 `.radio-inline` / `.radio-custom` |
| `pages/tools/guming.vue` | 性别 → `choice-control`（替换 Tailwind 内联拼装） |
| `components/tools/ziwei/ZiWeiInputForm.vue` | 性别 → `choice-control`；删除 `.gender-radio--*` |
| `pages/tools/zeji.vue` | `role="radio"` 按钮组 → **原生 radio** + `choice-control`；删除 `.event-btn*` |

zeji 由 `role="radio"` 改为原生 `input[type=radio]` 后，Tab 聚焦、方向键切换与 Space
选中回归浏览器原生行为，不再依赖手写键盘分支；`selectedEvent` 数据模型与计算逻辑不变。

### 3.4 折叠边界

- `VerifiedCulture.vue`：详细来源台账默认收起（`marginal-toggle`），生肖次序与地支对应仍直接展示；
- `VerifiedResult.vue`：详细传统分类默认收起，**生肖、地支、干支年、「年界与范围」、「依据与范围」全部直接可见**。

---

## 4. 工程验证

生产构建（`npm run build` 后 `node .output/server/index.mjs`，独立临时数据库）与开发态均验证：

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 空白错误 | `git diff --check` | 通过 |
| 类型 | `npm run typecheck` | 通过（exit 0） |
| 测试 | `npm run test` | **90 文件 / 2728 用例全通过** |
| 静态检查 | `npm run lint` | 0 errors（57 warnings，均为改动前既有） |
| 构建 | `npm run build` | 通过（7.06 MB / 1.62 MB gzip） |
| 乱码 | 项目 AGENTS.md 规定的乱码特征扫描 | 无命中（验证记录本身不复制检测命令，避免自指误报） |
| 迁移残留 | `rg "radio-custom\|gender-radio--selected\|age-radio" pages/tools components` | **0 匹配** |

---

## 5. 真实浏览器验收（生产构建）

浏览器：ZCode IAB。服务：`.output/server/index.mjs`，`DB_PATH` 指向临时库，
账号与档案均在本轮内新建，未触碰仓库内既有数据库。

### 5.1 账户控件

| 场景 | 结果 |
| --- | --- |
| 桌面游客 | `/login` 入口数 = 1；文本 `未登录`；`aria-label` 正确；命中区 94×44；不再出现 `未登录登录` |
| 移动抽屉游客（390px） | `.mobile-nav-item[href="/login"]` 数 = 1；文本 `未登录`；命中区 286×44 |
| 登录态 | 顶栏显示 `AvatarCircle` + 真实昵称 `audit_ui_1` + 下拉箭头，占位与游客一致 |

### 5.2 控件一致性（生产构建实测）

| 页面 | `.choice-control` 数 | 迁移前旧类残留 | 未样式化原生控件 |
| --- | --- | --- | --- |
| 生肖 | 2 | 0 | 0 |
| 八字 | 3 | 0 | 0 |
| 本人档案（编辑态） | 2 | 0 | 0 |
| 首页 / 登录 | 0 | 0 | 0 |

选中态实测（生肖年龄确认，等过渡结束后取值）：
边框 `rgb(198,40,40)`、文字 `rgb(122,20,22)`、圆点 8px 朱砂、内描边 20% 朱砂。

### 5.3 折叠边界（生产构建，已生成结果）

| 项 | 默认状态 |
| --- | --- |
| 传统分类详细内容 | 收起（`aria-expanded="false"`） |
| 依据与来源台账 | 收起（`aria-expanded="false"`） |
| 生肖结果 / 年界与范围 / 依据与范围 | **直接可见** |

### 5.4 响应式与字体缩放

| 视口 | 横向溢出 | 选择控件最小高度 |
| --- | --- | --- |
| 320px | 无 | 44px |
| 360px | 无 | 44px |
| 390px | 无 | 44px |
| 414px | 无 | 44px |
| 320px + 200% 字体 | 无 | 236px（随文本增高） |
| 414px + 200% 字体 | 无 | 101px（随文本增高） |

### 5.5 Console

首页、生肖、八字、登录、本人档案逐页采集 `error` 与 `unhandledrejection`：**全部为 0**。

### 5.6 截图

`D:/Projects/Project/XuanXue/.claude/audit-shots/`

| 文件 | 内容 |
| --- | --- |
| `01-home-guest-desktop.png` | 改动前：顶栏 `未登录 登录` 并排 |
| `05-header-guest-after.png` | 改动后：单一账户控件 |
| `06-shengxiao-choice-selected.png` | 生肖选中态（朱砂边框 + 圆点 + 底纹） |
| `07-auth-register-checkboxes.png` | 注册三个勾选框（共享控件，无原生蓝勾） |
| `08-mobile-drawer-guest.png` | 移动抽屉单一「未登录」项 |
| `10-prod-shengxiao-guest.png` | 生产构建生肖页 |
| `11-prod-shengxiao-result-collapsed.png` | 结果页：年界/依据直接可见，详细分类收起 |

---

## 6. 限制与未覆盖

1. **合婚 / 称骨 / 紫微 / 择日 未做浏览器实测**：四者在目录中为 `computePolicy: blocked`，
   路由围栏统一重定向状态页，本环境无法打开真实页面。其迁移经源码审查与
   `npm run test` 覆盖，**视觉一致性仍待公开前的浏览器复验**。
   （择日为 `enabled` 但 `/tools/zeji` 未开 SSR，内部验证白名单不生效——见 `plan_amendments`。）
2. **暗色/高对比模式**：项目无此模式，未测。
3. **真实移动设备**：仅用视口模拟，未在真机验收。
4. **键盘实操**：原生 `input` 语义由浏览器提供，本轮以 DOM 结构断言替代逐键实测。
5. `200%` 字体缩放通过根字号模拟，与浏览器「缩放文字」菜单行为等价但不完全等同。

---

## 7. 状态分离（不得互相替代）

| 状态 | 值 |
| --- | --- |
| 工程通过 | 是（typecheck / test / lint / build 全绿） |
| 视觉验收 | 通过（本文 §5，生产构建 + 真实浏览器） |
| 用户接受 | **pending** |
| 正式公开批准 | **pending**（本次未改变任何工具的公开状态） |

---

## 8. 数据库隔离

预览与开发服务均以 `DB_PATH` 指向临时文件（`/tmp/xuanxue-*.db`）启动；
`xuanxue-r2.db` 与 `xuanxue.db` 未被读取、写入或迁移。审计账号 `audit_ui_1`
及其档案只存在于临时库，进程结束后即废弃。
