# 流年签 · 关帝灵签功能设计

## 概述

已登录首页增加「今日命签」卡片，从关帝灵签池中以日期为 seed 每日抽取一支，展示签诗及解曰。

## 数据层

### `constants/fortune-sticks.ts`

导出 `fortuneSticks` 数组，每支签结构：

```ts
export interface FortuneStick {
  id: number        // 签号 1-50
  title: string     // 签题（如"苏秦不第"）
  fortune: '上吉' | '中吉' | '下吉' | '下下'
  poem: string      // 四句签诗
  explanation: string // 解曰
}
```

数据源：关帝灵签 100 首（传统签诗经典），取前 50 支。前 20 支精校原文，后 30 支按格律补全。

## 组件层

### `components/home/DailyFortuneStick.vue`

- Props: `profile: Profile`（用于获取出生信息，可选）
- 逻辑：`new Date().toISOString().slice(0,10)` 为 seed → `hashCode(dateStr) % 50` 取签
- 展示：签号、签题、吉凶标签（色编码）、四句签诗、解曰
- 卡片样式：沿用 oracle-slip 风格（纸笺背景、朱砂点缀、书法字体）
- 无数据时显示占位提示

## 数据流

```
index.vue (已登录区，工具网格上方)
  └─ DailyFortuneStick.vue
       └─ 日期 seed → fortuneSticks[idx]
       └─ 纯前端计算，无 API 调用
```

## 改动文件

| 文件 | 操作 |
|------|------|
| `constants/fortune-sticks.ts` | **新建** — 50 支关帝灵签数据 + FortuneStick 接口 |
| `components/home/DailyFortuneStick.vue` | **新建** — 签诗卡片组件 |
| `pages/index.vue` | **修改** — 已登录区工具网格上方插入组件 |

## 不变动

- 不修改现有 `DailyFortune.vue`
- 不修改后端 / API / 数据库
- 不需要认证状态（仅首页已登录区展示，该区本身已受 auth guard 保护）

## UI 设计

UI 设计由 frontend-design 技能在实现阶段完成。建议方向：传统中式签纸/灵签美学，与现有 玄·道 品牌一致。
