# Accessibility Auditor Audit — WCAG 2.1 AA 合规性

**日期**: 2026-05-26
**状态**: 部分符合
**评分**: 良好基础，22 个问题（0 Critical, 5 Serious, 8 Moderate, 9 Minor）

---

## Serious Issues (5)

### 1. 首页工具卡片使用 `<div role="button">` 而非原生元素
- **WCAG 1.3.1** | pages/index.vue:78-136
- 修复：替换为 `<NuxtLink>` 或 `<button>`，消除手动 role/tabindex/keyboard 处理

### 2. 性别单选按钮缺少 `name` 属性
- **WCAG 4.1.2** | pages/profile/[id].vue:322,328,346
- 修复：添加 `name="gender"` 到全部三个 radio input

### 3. 流年分数图例文字对比度不足
- **WCAG 1.4.3** | LiuNianTimeline.vue:5
- `text-ink-faint (#D4C5B0)` 在纸色背景上约 1.5:1（需要 4.5:1）
- 修复：改为 `text-ink-medium`

### 4. 表单验证错误未与输入字段关联
- **WCAG 3.3.1** | login.vue:131-137, YijingCastingPanel.vue:154-156
- 修复：添加 `aria-describedby` 指向错误消息

### 5. 必填字段未标记
- **WCAG 3.3.2** | 登录、资料、六爻数字起卦表单
- 修复：添加 `required` + `aria-required="true"` + 红色星号

---

## Moderate Issues (8)

6. 六爻页面 `aria-live` 缺少 `role="status"`
7. 历史记录恢复未通知屏幕阅读器
8. PageHero emojiLabel prop 已定义但未使用
9. constellation.vue 非交互卡片错误使用 `cursor-pointer`
10. 文本内链接仅靠颜色区分（hover 才出现下划线）
11. SVG 分数字环无 NaN 防护

---

## Minor Issues (9)

12. 六爻回到顶部按钮 40px < 44px 触摸目标
13. btn-ghost / nav-link 触摸目标过小（30px / 26px）
14. 神煞 tooltip 文字极小（~7px 基准）
15. 流年分数字环 aria-label 不一致
16. 星座符号未标记 `role="img"`
17. 六爻起卦表单缺少 `novalidate`
18. preferes-reduced-motion 下骨架屏显示异常渐变色
19. `title` 属性用作 tooltip 无键盘访问
20. 锁定工具卡片 seal stamp 已正确处理（无问题）
21. FortuneBars progressbar 属性完整（无问题）

---

## 做得好的地方

- ✅ Skip-to-content 链接正确
- ✅ Landmark 结构完整（header/nav/main/aside）
- ✅ 全局 focus-visible 样式统一
- ✅ prefers-reduced-motion 全面覆盖
- ✅ 加载状态 + aria-busy + live region
- ✅ Tab 组件键盘导航（ArrowLeft/Right/Home/End）
- ✅ Menu 组件键盘导航（ArrowUp/Down + Escape）
- ✅ 表格语义正确（thead/th scope/aria-label）
- ✅ 骨架屏 aria-hidden
- ✅ toast/alert role 正确使用
- ✅ html lang="zh-CN"

---

## Top 5 修复优先级

1. **首页工具卡片 `<div role="button">` → `<NuxtLink>`** — 修复语义 HTML
2. **性别单选按钮添加 `name="gender"`** — 一个属性修复键盘导航
3. **流年分数图例对比度** — 一行 CSS 变更满足 4.5:1
4. **表单错误用 `aria-describedby` 关联输入框** — 修复屏幕阅读器体验
5. **必填字段标记 `required` + `aria-required` + 视觉星号** — 影响 3 个文件的表单
