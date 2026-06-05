# 工具页面统一视觉设计

## 概述

统一生肖（Shengxiao）和星座（Constellation）两个工具页面的 Section Header 视觉语言，消除当前两页之间的样式差异，建立一致的「朱丝栏书眉」风格。

## 设计概念

### 朱丝栏书眉

灵感来源于中国传统手抄纸——**朱丝栏**（红色界栏的稿纸）。其细红线界定书写区域，形成优雅的视觉节奏。

```
▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁         全幅朱砂上线 (1px, rgba(156,26,28,0.08))
         性格特征                Ma Shan Zheng 楷书标题
      ·                        朱砂批注点 (4×4px, 15% opacity)
```

### 视觉层次

每节 Header 由三层组成：

1. **上栏线** — `::before` 伪元素，全幅宽 1px 朱砂细线（`rgba(156,26,28,0.08)`），距顶部 0
2. **标题行** — `<h2>`，Ma Shan Zheng display font，`1.125rem` → `1.25rem`(sm)，`letter-spacing: 0.3em`
3. **批注点** — `<h2>::after` 伪元素，`4×4px` 圆形朱砂点（`rgba(156,26,28,0.12)`），位于标题首字左下方 2px 处

## 改动范围

### main.css

替换当前 `.section-header` 系列规则：

- 移除 `.bar` span 相关规则
- 移除 `section-header--tool` 和 `section-header--tool-light` 两个变体
- 统一为单个 `.section-header` 类：
  - `::before` 伪元素作上栏线
  - `h2` 统一样式（无变体）
  - `h2::after` 伪元素作批注点

### pages/tools/shengxiao.vue

四个 section header 更新。当前：

```html
<div class="section-header section-header--tool">
  <span class="bar" aria-hidden="true"></span>
  <h2>幸运信息</h2>
</div>
```

改为：

```html
<div class="section-header">
  <h2>幸运信息</h2>
</div>
```

涉及：幸运信息、性格特征、流年运势、生肖配对。

### pages/tools/constellation.vue

两个 inline section header + Hero 内的 综合运势 header 更新。移除 `.seal-icon` 和 `.bar`。

### components/tools/constellation/HoroscopePanel.vue

`综合运势` header 更新。

### components/tools/constellation/YiJiPanel.vue

`今日宜忌` header 更新。

### components/tools/shengxiao/Personality.vue

`性格特征` header 更新。

### components/tools/shengxiao/CompatibilityGrid.vue

`生肖配对` header 更新。

## 一致性检查

| 检查项                              | 状态 |
| ----------------------------------- | ---- |
| 生肖页所有 section header 统一      | ✓    |
| 星座页所有 section header 统一      | ✓    |
| 两页之间 header 样式完全相同        | ✓    |
| 无 `.bar` / `.seal-icon` 残留       | ✓    |
| 无障碍（伪元素 `aria-hidden` 继承） | ✓    |
| 移动端响应式                        | ✓    |
| 动画时序兼容                        | ✓    |

## 不改的内容

- Hero 组件
- 卡片容器样式（card-warm / p-8）
- 间距体系（mb-6 / fade-in / --delay）
- 各区块具体内容
- 布局结构（ToolPageLayout / max-w-[48rem]）
- 功能逻辑（无 JS 改动）
