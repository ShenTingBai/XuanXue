# 字体子集化指南

## 问题

`ma-shan-zheng-v17-chinese-simplified-regular.woff2` 为 **2.6MB** 全量中文字体，
但本项目仅使用约 200 个展示标题字符。每次首屏预加载此文件严重影响 LCP。

## 子集化步骤

### 1. 安装工具

```bash
pip install fonttools brotli
```

### 2. 提取项目中实际使用的字符

从源码中提取所有 Ma Shan Zheng 字体渲染的中文字符（组件名、卦名、标题等），
保存为 `subset-chars.txt`，每行一个字符。

### 3. 生成子集字体

```bash
pyftsubset ma-shan-zheng-v17-chinese-simplified-regular.woff2 \
  --text-file=subset-chars.txt \
  --output-file=ma-shan-zheng-subset.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --desubroutinize
```

### 4. 替换文件

将生成的 `ma-shan-zheng-subset.woff2` 替换原文件，并更新
`assets/css/main.css` 中的 `@font-face` 引用。

### 预期效果

子集化后文件大小约 **30-80KB**（取决于字符数量），可安全保留 `rel="preload"`。
