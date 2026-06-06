# Contributing to 玄·道 (XuanXue)

感谢你对玄·道项目的关注！我们欢迎任何形式的贡献。

## 行为准则

- 尊重所有贡献者
- 建设性的代码审查和讨论
- 专注于项目目标

## 如何贡献

### 报告 Bug

1. 搜索现有 Issues 确认未被报告
2. 使用 Bug Report 模板
3. 包含：复现步骤、预期行为、实际行为、环境信息

### 功能建议

1. 先开 Discussion 讨论
2. 说明使用场景和预期效果

### 提交代码

1. Fork 本仓库
2. 创建功能分支：`feat/your-feature` 或 `fix/your-bug`
3. 遵循项目约定（见 [CLAUDE.md](CLAUDE.md)）
4. 编写测试（`npm run test`）
5. 确保类型检查通过（`npm run typecheck`）
6. 提交 PR 到 `main` 分支

## 开发环境

```bash
# 前置要求
Node.js >= 18
npm >= 9

# 安装
npm install --registry https://registry.npmmirror.com

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 类型检查
npm run typecheck
```

## 项目架构

详见 [CLAUDE.md](CLAUDE.md) 和 [docs/design-system.md](docs/design-system.md)

## 分支策略

- `main`：稳定分支，只接受 PR 合并
- `feat/*`：新功能
- `fix/*`：Bug 修复
- 合并必须使用 `--no-ff`

## 测试要求

- 新功能需要测试
- Bug 修复需要回归测试
- 运行 `npm run test` 确保全部通过

## Git 提交规范

使用常规提交格式：

- `feat:` 新功能
- `fix:` Bug 修复
- `refactor:` 重构
- `test:` 测试
- `docs:` 文档
- `chore:` 构建/工具
