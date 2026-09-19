<p align="center">
  <img src="https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxt.js" alt="Nuxt 3">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind CSS 3">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

<h1 align="center">玄 · 道</h1>

<p align="center">
  <strong>透明、可解释、可验证边界</strong>
  <br>
  传统文化互动与自我探索项目
</p>

---

## 这是什么

**玄·道** 是一个正在系统性打磨的 Nuxt 3 全栈项目。仓库保留八字、生肖、太阳星座、择日、六爻等传统文化工具的既有代码资产，但“代码存在”不等于“规则已经核验”或“功能已经批准公开”。

当前产品方向是帮助用户理解输入、传统规则、形成过程、来源状态和适用边界，不提供确定性现实预测。未知资料保持未知，未核验内容不得用免责声明、娱乐标签或工程评分包装成可信结论。

设计语言取意传统中式书房：墨色纸纹为底，朱砂印章点缀，素雅沉静，不张扬。

现有首页包含以下待持续治理的模块：

- **今日玄机**：现有公历、农历、干支和节气展示；部分日期边界仍待整改
- **今日命签**：现有组件未传入日期，函数默认按 UTC 日期字符串稳定映射同一签，不读取个人状态；签谱来源未核验，目标首页不再保留自动命签
- **档案管理**：现有实现待按渐进式本人档案规范整改
- **历史记录**：目标状态为用户主动保存；现有自动保存属于待整改行为

项目已经部署在可由互联网访问的服务器上，当前分类为 `public_preview`。这不表示项目已经具备正式生产资格，也不表示所有现有工具都允许普通访客使用。当前规范、工具状态和待讨论范围见 [产品规范索引](docs/product/README.md)。

<details>
<summary>📸 界面预览（展开查看）</summary>

> 运行 `npm run dev` 后访问 `http://localhost:3000` 可检查当前实现。当前页面行为仍可能与已批准目标规范存在差距，不能把可访问状态当作真实性或完成度验收。

</details>

---

## 工具治理状态

| 范围                                 | 产品决策状态 | 当前说明                                                                                                   |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------- |
| 用户档案、统一工具体验               | Approved     | 本人档案 R4 已 Accepted（2026-09-14，不构成公开放行）；统一工具体验系统性实施和验收尚未完成                |
| 八字                                 | Approved     | 工具契约已批准，多项历法、时间和传统规则仍待来源核验与实施                                                 |
| 生肖、太阳星座                       | Approved     | 轻量工具契约已批准；生肖限定功能 R3 Accepted，太阳星座未实施；旧人格、运势、配对、评分等内容不属于目标版本 |
| 择日                                 | Approved     | 合同要求维持内部审核并阻止普通公开访客生成新结果；现有代码是否完整落实仍待验收                             |
| 首页、姓名、测字、称骨、周易卦象阅读 | Approved     | 对应产品契约已形成；代码实施、来源核验和公开验收尚未完成                                                   |
| 合婚、紫微、梅花                     | Approved     | 对应契约已形成；继续封存，来源核验、代码实施和重新公开验收尚未完成                                         |
| 独立六爻排盘                         | Pending      | 继续封存，尚无恢复契约；不能借周易卦象阅读或梅花易数恢复                                                   |

详细状态、规范层级和证据链接统一维护在 [产品规范索引](docs/product/README.md)。

2026-09-09：R3 生肖限定功能已完成技术验收并获用户接受（57 文件、2170 用例通过），[验收记录](docs/audits/2026-09-09-r3-shengxiao-runtime-acceptance.md)区分组件交互与生产围栏证据。工具公开入口仍关闭。当前优先跑通功能和要求，产品 UI 视觉打磨后置。

### R4 本人档案（Accepted）

R4 本人档案状态为 **`Accepted`（2026-09-14 用户确认接受）**。接受限定为「本人档案初版」：功能、数据流程与已批准要求成立，**不构成公开放行**——工具目录仍为 `in_review / internal / blocked / disabled`，R6 公开门禁未开始。接受依据：四项门禁在格式化稳定的提交树上通过（typecheck 0 错、测试 67 文件 / 2379 用例、lint 0 error、build 成功），另有复验 35/35、出版版视觉 51/51、信息架构 32/32 三轮真机浏览器验收。本轮范围：

- 新独立接口 `/api/self-profile`（GET 档案、GET summary、PUT 保存、DELETE 出生日期、DELETE 整档、PATCH 使用授权），旧 `/api/profiles` 继续 410；
- 新数据库表 `self_profiles`、`consent_receipts`（独立 `self-profile-schema.ts`，默认仍为 `xuanxue-r2.db`）；
- 本人档案页 `/self-profile` 与账号设置入口，生肖页「从本人档案带入 / 保存本人资料」显式交互；
- 完整出生日期字段组（公历/农历 + 闰月）、服务端规范化与未满十四岁拒绝、差异确认、版本并发冲突、删除/撤回与最小授权凭证。

详情见 [产品规范索引 §8.6](docs/product/README.md)。R3 限定功能保持 Accepted；公开准入与工具围栏不变，R4 的构建测试授权**不延伸**至 R5。

---

## 快速开始

### 前置要求

- Node.js ≥ 18
- npm ≥ 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/<user>/XuanXue.git
cd XuanXue

# 安装依赖
npm install

# 生成随机 SESSION_SECRET；把输出手动写入未提交的 .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 启动开发服务器
npm run dev
```

把生成值按 `SESSION_SECRET=<随机值>` 写入 `.env`，再打开 `http://localhost:3000`。未登录用户可以浏览当前公开内容；登录、档案、历史和各工具的目标行为以正式产品规范为准。

### 可用命令

| 命令                | 用途                                |
| ------------------- | ----------------------------------- |
| `npm run dev`       | 启动开发服务器（热更新，端口 3000） |
| `npm run build`     | 生产构建                            |
| `npm run preview`   | 本地预览生产构建                    |
| `npm run typecheck` | TypeScript 类型检查                 |
| `npm run test`      | 运行全部测试                        |
| `npx vitest`        | 测试 watch 模式                     |

### 测试

项目采用 Vitest 进行单元测试，覆盖既有计算引擎和服务端逻辑。测试只能证明实现行为，不能替代传统规则和来源核验。

```bash
npm run test           # 运行当前全部测试
npx vitest run tests/composables/useBaZi.test.ts  # 运行单个测试文件
npx vitest             # watch 模式
```

---

## 架构

### 设计方向

项目目标是让输入规范化、领域规则、结果解释、页面状态和持久化职责逐步分离。现有代码仍包含组件直接计算、读取当前时间、自动保存和跨层状态等遗留问题，因此下列结构是持续整改方向，不是已经全部兑现的架构声明。

```
用户输入 → composable 纯函数计算 → 响应式结果 → Vue 组件渲染
```

完成这种分离后的收益：

- **可测试**——纯领域计算可以独立测试；页面状态 composable 与领域算法分开验证
- **可复用**——同一套计算逻辑可用于 Web、CLI、API 等不同终端
- **可维护**——修改八字算法不会波及星座组件，反之亦然

### 数据职责

当前服务端承担认证、会话、档案和历史 API，并非只用于保存计算结果。工具页面仍有自动读取档案和生成后自动保存的遗留路径。

目标规范要求：本人档案经用户主动选择后复制必要字段到当次草稿；领域计算只接收实际输入，页面负责结果与解释。只有工具允许历史且用户主动确认时才请求保存，服务端校验权限和数据。生成不等于保存，当次修改不覆盖本人档案。这是待实施的数据流程，不表示现有代码已经完成改造。

### 目录一览

```
XuanXue/
├── composables/        # 既有计算与页面编排逻辑
├── constants/          # 干支、卦象、星曜、笔画字典等既有数据
├── components/
│   ├── home/           # 首页组件
│   └── tools/          # 既有工具组件与通用组件
├── pages/              # 首页、账号、档案与既有工具页面
├── server/
│   ├── api/            # REST API：auth / profiles / divinations
│   ├── middleware/      # 请求认证与安全处理
│   ├── plugins/         # 数据库初始化 + CSP nonce
│   └── utils/          # 令牌签名、限流、安全日志
├── tests/              # composables / server / utils 单元测试
└── docs/               # 产品规范、审计证据、设计系统与项目记录
```

> 完整项目结构及开发约定见 [`CLAUDE.md`](CLAUDE.md)。

---

## 设计系统

项目遵循 **墨韵 · Ink Resonance** 设计规范，完整文档见 [`docs/design/design-system.md`](docs/design/design-system.md)。

核心约束：

- **色板**：墨（7 阶文字色）+ 纸（6 阶底色）+ 朱砂（`#C62828`，唯一暖色强调）+ 金/玉（点缀）。禁止引入第五种色系。
- **字体**：Ma Shan Zheng（书法展示标题）+ Noto Sans SC（正文 400/500）。禁止第三种字体。
- **组件**：`btn-cin`（朱砂按钮）、`btn-seal`（印章按钮）、`input-ink`（墨线下划线输入）、`card-warm`（暖纸卡片）等。新增组件前必须查阅设计系统。

### PWA 支持

应用支持 iOS Safari 添加到主屏幕，提供接近原生的全屏体验。

- `apple-touch-icon` + `apple-mobile-web-app-capable`
- 自定义启动图标（纸纹背景 + 印章 logo）

---

## 贡献

欢迎提交 Issue 和 Pull Request。

开发前请阅读：

- [`docs/README.md`](docs/README.md) — 文档分类与完整导航
- [`docs/product/README.md`](docs/product/README.md) — 产品规范、状态和当前决策入口
- [`CLAUDE.md`](CLAUDE.md) — 开发约定、Git 工作流、架构细节
- [`docs/design/design-system.md`](docs/design/design-system.md) — UI 设计规范

### 分支策略

- `main` — 保存经过验收的稳定基线
- 功能开发在短期 `feat/*`、`fix/*`、`docs/*` 分支进行
- 个人开发不强制复杂 GitFlow 或每次走 PR；提交、合并和推送须按用户授权与阶段证据执行

---

## 使用边界

传统文献或规则只能证明某种分类、说法或互动方式存在，不能证明其具有现实预测能力。项目不应被用于医疗、法律、财务、安全、婚育等高影响决策。“娱乐”不是降低来源、真实性和个人信息保护要求的理由；具体内容仍须通过产品契约和公开准入门。

---

## License

[MIT](LICENSE)
