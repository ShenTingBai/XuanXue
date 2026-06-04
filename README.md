<p align="center">
  <img src="https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxt.js" alt="Nuxt 3">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind CSS 3">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

<h1 align="center">玄 · 道</h1>

<p align="center">
  <strong>玄天机 · 道命理</strong>
  <br>
  中式命理推演平台 —— 输入生辰，即刻排盘
</p>

---

## 这是什么

**玄·道** 将八字、紫微斗数、六爻、生肖、星座等传统术数搬上 Web。用户只需填写一次出生信息，即可在 9 个工具中自由探索——所有计算在浏览器端完成，无需等待后端响应。

设计语言取意传统中式书房：墨色纸纹为底，朱砂印章点缀，素雅沉静，不张扬。

<details>
<summary>📸 界面预览（展开查看）</summary>

> 运行 `npm run dev` 后访问 `http://localhost:3000` 即可体验。未登录时展示 Landing 页；登录后进入首页，可浏览全部工具。

</details>

---

## 工具矩阵

每个工具都是一个独立的计算引擎，零外部 API 依赖，纯本地运算。

### 命理推演

| 工具 | 核心算法 | 输出内容 |
|------|---------|---------|
| **八字** | 子平法四柱排盘 + 十神 + 纳音 + 大运起运 | 命盘、日主分析、五行强弱、喜用神、大运流年、神煞 |
| **紫微斗数** | iztro 星盘引擎 + 十二宫安星 | 星盘宫格、星曜精批、大限流年、三方四正 |
| **六爻** | 大衍筮法手工起卦 + 变卦推演 | 本卦、变卦、互卦、64 卦爻辞解读、装卦表 |

### 生肖星座

| 工具 | 核心算法 | 输出内容 |
|------|---------|---------|
| **生肖** | 年柱地支 + 五行 + 纳音 | 性格特质、幸运元素、月度运势、婚配指数、本命佛、太岁化解 |
| **星座** | astronomy-engine 星历计算 | 星座特征、守护星、今日宜忌、星座配对、本命星盘 |

### 实用工具

| 工具 | 核心算法 | 输出内容 |
|------|---------|---------|
| **合婚** | 双方日柱天干五合 + 地支六合 | 配对总分、五行/性格/运势等多维度拆解 |
| **测字** | 汉字笔画数 + 五行分类 | 字义解读、吉凶分析 |
| **姓名** | 三才五格剖象法 | 天格/人格/地格数理、吉凶评断 |
| **择吉** | 建除十二星 + 二十八宿 + 黄历 | 日历视图、吉日推荐、宜忌事项 |

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

# 生成 SESSION_SECRET 并写入 .env
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" > .env

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:3000`，注册一个账号（4 位 PIN），填写出生信息，即可使用全部工具。

### 可用命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动开发服务器（热更新，端口 3000） |
| `npm run build` | 生产构建 |
| `npm run preview` | 本地预览生产构建 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test` | 运行全部测试 |
| `npx vitest` | 测试 watch 模式 |

---

## 架构

### 设计哲学

**计算引擎与 UI 完全分离。** 每个 `composables/use*.ts` 是一个零依赖的纯函数集合，接收输入参数，返回计算结果。Vue 组件只负责渲染，不包含任何命理计算逻辑。

```
用户输入 → composable 纯函数计算 → 响应式结果 → Vue 组件渲染
```

这一设计的收益：
- **可测试**——每个 composable 有独立的单元测试，不依赖 Vue 运行时
- **可复用**——同一套计算逻辑可用于 Web、CLI、API 等不同终端
- **可维护**——修改八字算法不会波及星座组件，反之亦然

### 数据流

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Profile     │────▶│  Composable      │────▶│  Component   │
│  (输入)      │     │  (纯计算引擎)     │     │  (渲染)      │
│              │     │                  │     │              │
│  birth_date  │     │  useBaZi()       │     │  BaziGrid    │
│  birth_hour  │     │  useZiwei()      │     │  ElementAna- │
│  gender      │     │  useShengXiao()  │     │  lysis       │
│  ...         │     │  ...             │     │  ...         │
└─────────────┘     └──────────────────┘     └─────────────┘
       │                      │                      │
       └──────────────────────┼──────────────────────┘
                              │
                     ┌────────▼────────┐
                     │  Server API      │
                     │  (仅用于持久化)   │
                     │                  │
                     │  POST /divina-   │
                     │  tions (保存结果) │
                     │  GET  /divina-   │
                     │  tions (历史记录) │
                     └─────────────────┘
```

### 目录一览

```
XuanXue/
├── composables/        # 18 个计算引擎，纯函数为主
├── constants/          # 命理数据：干支、卦象、星曜、笔画字典等（17 个文件）
├── components/
│   ├── home/           # 首页独占组件
│   └── tools/          # 9 个工具 × 各自组件 + 通用组件（ToolPageLayout 等）
├── pages/              # 12 个页面：首页 / 登录 / 档案 / 9 个工具
├── server/
│   ├── api/            # REST API：auth / profiles / divinations
│   ├── middleware/      # Bearer token 认证
│   ├── plugins/         # 数据库初始化 + CSP nonce
│   └── utils/          # 令牌签名、限流、安全日志
├── tests/              # composables / server / utils 单元测试
└── docs/               # 设计系统规范 + 开发计划
```

> 完整项目结构及开发约定见 [`CLAUDE.md`](CLAUDE.md)。

---

## 设计系统

项目遵循 **墨韵 · Ink Resonance** 设计规范，完整文档见 [`docs/design-system.md`](docs/design-system.md)。

核心约束：

- **色板**：墨（7 阶文字色）+ 纸（6 阶底色）+ 朱砂（`#C62828`，唯一暖色强调）+ 金/玉（点缀）。禁止引入第五种色系。
- **字体**：Ma Shan Zheng（书法展示标题）+ Noto Sans SC（正文 400/500）。禁止第三种字体。
- **组件**：`btn-cin`（朱砂按钮）、`btn-seal`（印章按钮）、`input-ink`（墨线下划线输入）、`card-warm`（暖纸卡片）等。新增组件前必须查阅设计系统。

---

## 贡献

欢迎提交 Issue 和 Pull Request。

开发前请阅读：
- [`CLAUDE.md`](CLAUDE.md) — 开发约定、Git 工作流、架构细节
- [`docs/design-system.md`](docs/design-system.md) — UI 设计规范

### 分支策略

- `main` — 始终保持干净，只接受 PR 合并
- 功能开发在 `feat/*`、`fix/*`、`phase-*` 分支进行
- 合并到 `main` 必须使用 `git merge --no-ff`（禁止快进合并）

---

## 免责声明

> ⚠️ 本平台仅供**娱乐参考**。所有命理分析结果不构成任何形式的专业建议。用户因使用本平台产生的任何决策及其后果，均由用户自行承担。

---

## License

[MIT](LICENSE)
