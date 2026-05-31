# 玄·道 — 总设计文档

> **更新记录：** 2026-05-31 品牌从"玄学"升级为"玄·道"，新增设计系统规范

## 概述

一个多人可用的玄学互动 Web 应用。用户通过昵称 + 4 位 PIN 登录，创建个人档案后可使用八字排盘、紫微斗数、六爻占卜、生肖运势、星座星盘等术数工具进行命理推算。

**品牌：** 玄·道 — 融合玄学的神秘主义与道的哲学深度。设计语言为"墨韵 · Ink Resonance"（传统中式书房美学）。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Nuxt.js 3 (Vue 3 全栈) |
| 数据库 | SQLite (sql.js) |
| 前端样式 | TailwindCSS + 自定义设计系统（墨韵 · Ink Resonance） |
| 玄学引擎 | 纯 TypeScript，前端直接计算 |
| 部署 | 阿里云 + Nginx |

## 设计系统：墨韵 · Ink Resonance

详见 [`2026-05-31-xuandao-design-system.md`](2026-05-31-xuandao-design-system.md)。

### 色彩体系

| Token | 色值 | 用途 |
|-------|------|------|
| `paper-lightest` | #FBF8F4 | 最浅纸色 |
| `paper` / `paper-light` | #F5F0E8 | 页面背景（暖纸底） |
| `paper-card` | #E8DCC6 | 卡片背景（暖笺） |
| `cinnabar-deeper` | #9C1A1C | 朱砂主色 |
| `ink-darkest` | #1A0F0A | 最深墨色（标题） |
| `ink` / `ink-dark` | #2C1810 | 正文墨色 |

### 品牌标识

- **玄·道**（间隔号 U+00B7 连接）
- **印章元素**：`seal-icon` 组件，朱砂红底暖纸色字，微旋转模拟手工盖印
- **咒语副标题**：五行堆叠"玄天机 / 道命理 / 玄道在手 / 天地万物 / 皆可问之"

### 核心组件

| 组件类 | 用途 |
|--------|------|
| `btn-cin` | 朱砂实心按钮（双边框 + hover 加深） |
| `btn-ink` | 墨色描边按钮 |
| `seal-icon` / `seal-icon--lg` / `seal-icon--hero` | 朱砂印章 |
| `card-warm` / `card-warm--elevated` | 暖笺卡片 |
| `tool-card--new` | 工具入口卡片（符头顶线 + 卦象角标 + hover 动画） |
| `input-warm` | 暖笺输入框 |
| `section-header` | 分区标题（朱砂短杠 + 文字） |
| `talisman-line` | 符头顶线装饰 |
| `corner-mark` | 卦象角标（☰☷☵☲等） |
| `divider-seal` | 朱砂印分割线 |
| `rule-boundary` / `fish-tail` | 线装书天地界栏 + 鱼尾 |
| `anim-rise` + `anim-delay-1~5` | 入场动画 |

### 纸纹纹理

页面通过 CSS `body::after` + SVG feTurbulence 实现纸纹质感，全局不透明度 0.015。

## 数据模型

### profiles（用户档案）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer (PK, 自增) | 自动生成 |
| nickname | text (唯一) | 用户昵称，登录标识 |
| pin | text (4位) | 登录 PIN 码 |
| birth_date | text (YYYY-MM-DD, 可选) | 出生日期 |
| birth_calendar | text (solar/lunar, 可选) | 出生日期历法（阳历/农历） |
| birth_hour | integer (0-23, 可选) | 出生小时 |
| birth_minute | integer (0-59, 可选) | 出生分钟 |
| gender | text (男/女, 可选) | 性别 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### sessions（登录会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer (PK, 自增) | 自动生成 |
| profile_id | integer (FK → profiles.id) | 关联档案 |
| token | text (唯一) | 登录令牌 |
| created_at | datetime | 创建时间 |

- 登录/注册时服务端生成 token，存入 `sessions` 表
- 同时返回给客户端，存入 `localStorage`（键 `xuanxue:session`）
- 后续 API 请求通过 `Authorization: Bearer <token>` 头携带
- 写入类 API 验证 token 确保所有权
- 退出时调用 `DELETE /api/auth/logout` 删除会话记录

### divination_results（测算记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer (PK) | 自动生成 |
| profile_id | integer (FK → profiles.id) | 关联档案 |
| type | text | 工具类型 (shengxiao / constellation / bazi / yijing / ziwei) |
| input_data | json | 输入参数 |
| result_data | json | 计算结果 |
| created_at | datetime | 测算时间 |

## 页面路由

| 路由 | 页面 | 说明 | 状态 |
|------|------|------|------|
| `/` | 首页 | 未登录：英雄区 + 工具卡片 + 预览；已登录：问候语 + 工具网格 | ✅ |
| `/login` | 登录/注册 | 结缘立卷卡片 + 号令/密令 + 四角卦象 | ✅ |
| `/profile/:id` | 档案编辑 | 修改个人信息 | ✅ |
| `/tools/shengxiao` | 生肖 | 生肖排盘 + 五行 + 性格 + 配对 | ✅ |
| `/tools/constellation` | 星座 | 星座特征 + 今日运势 + 星盘 | ✅ |
| `/tools/bazi` | 八字 | 四柱排盘 + 十神 + 大运 + 神煞 + 流年 | ✅ |
| `/tools/yijing` | 六爻 | 数字起卦 + 六十四卦 + 变卦 | ✅ |
| `/tools/ziwei` | 紫微斗数 | 十二宫排盘 + 天星图 + 星曜分析 | ✅ |

## 功能规划

### Phase 1：基础系统 ✅
- 用户登录（昵称 + 4 位 PIN）
- 档案管理（创建、编辑）
- 首页工具网格 + 导航
- Session 持久化（localStorage）

### Phase 2：生肖 + 星座 ✅
- 生肖计算（标准生肖算法）
- 生肖五行属性、性格特征（标准参考资料）
- 十二星座划分、性格特征、星盘

### Phase 3：八字排盘 ✅
- 节气数据（lunar-javascript 万年历）
- 年柱推算（立春为界）
- 月柱推算（五虎遁）
- 日柱推算（日干支公式）
- 时柱推算（五鼠遁）
- 十神定位 + 五行生克 + 日主强弱
- 大运起运（标准子平法）

### Phase 4：八字增强 ✅
- 神煞系统（25+ 查表，覆盖四柱/大运/流年）
- 流年详批（前后各 5 年，规则驱动评分 + 文本模板）
- 测算记录保存 + 历史回看（HistoryModal）

### Phase 5：六爻占卜 ✅
- 数字起卦 / 手动摇卦
- 六十四卦系统（含变卦）
- 卦象解读 + 爻辞展示

### Phase 6：紫微斗数 ✅
- 十二宫排盘
- 星曜安放 + 天星图可视化
- 大限流年

### 设计系统落地 🔄 （`feat/design-system-rollout` 分支）
- 品牌从"玄学"升级为"玄·道"
- 墨韵 · Ink Resonance 视觉体系
- 英雄区 + 工具卡片 + 登录页面重设计
- 待办：工具页面视觉适配

## 项目结构

详见 `CLAUDE.md` 中的完整项目结构。

```
├── app.vue                       # 根组件
├── nuxt.config.ts                # 模块、CSP/HSTS 头
├── tailwind.config.ts            # 设计令牌
├── assets/css/main.css           # 设计系统 CSS 组件
├── constants/                    # STEMS、BRANCHES、六十四卦等（唯一数据源）
├── composables/                  # 计算引擎 + 状态管理
├── components/tools/             # 各工具 UI 组件
├── pages/                        # 路由页面
├── server/                       # Nitro API（auth + divinations + profiles）
└── tests/                        # composables 测试
```

## 状态管理

- 使用 `useState()`（而非 `ref()`）管理共享状态
- `useAuth` → `useState<Profile | null>('auth:profile', ...)`
- Session 持久化：localStorage 键 `xuanxue:session`
- 纯计算 composables（useBaZi、useSolarTerms 等）不导出 Vue 响应式

## 架构原则

- 玄学计算引擎全部为 TypeScript 纯函数，与 UI 解耦
- 计算模块放在 `composables/`，可单独测试（`tests/composables/`）
- 不引入外部 API 依赖，所有计算离线可完成
- 前端负责展示，后端负责持久化
- 每次改动 `npm run typecheck` + `npm run build` 验证

## 计算规则来源原则

1. 每种工具的计算规则在实现前，必须搜索行业标准资料确认
2. 数据（如节气、干支表、十神表、六十甲子等）使用权威来源
3. 不编造任何性格描述或命理判断——全部有实测依据

## 关键约定

- **纳音公式**：天干和地支索引必须同奇偶才构成有效甲子对
- **大运起运**：阳男阴女顺排、阴男阳女逆排，天数差 ÷ 3 = 起运岁数
- **节气边界**：使用 `getSolarTerm()`，禁止硬编码日期
- **十神**：`getTenGod` 永远不返回 `'日主'`——手动在日柱赋值
- **日期解析**：使用 `parseDate()`，禁止 `new Date(str)`

