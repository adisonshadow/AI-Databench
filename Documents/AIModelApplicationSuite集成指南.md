# AIModelApplicationSuite 集成指南

## 概述

本文档说明如何将 AIModelApplicationSuite 集成到 AIDatabench 项目中。

## 集成步骤

### 1. 添加依赖

在 `frontend/package.json` 中添加 AIModelApplicationSuite 依赖：

```json
{
  "dependencies": {
    "AIModelApplicationSuite": "file:../AIModelApplicationSuite"
  }
}
```

### 2. 安装依赖

运行以下命令安装依赖：

```bash
cd frontend
yarn install
```

### 3. 在布局中使用组件

在 `frontend/src/components/Layout/index.tsx` 中导入并使用 AISelector 组件：

```typescript
import AISelector from 'AIModelApplicationSuite';
// 或者如果使用本地路径
import AISelector from '@/components/AISelector';
```

### 4. 组件使用示例

```tsx
<AISelector 
  style={{ marginRight: '8px' }}
  onChange={(modelId) => {
    console.log('Selected AI Model:', modelId);
    // 处理AI模型选择逻辑
  }}
/>
```

## 注意事项

1. AIModelApplicationSuite 尚未发布到 npm，需要通过本地路径引用
2. 确保 AIModelApplicationSuite 项目与 AIDatabench 项目在同一父目录下
3. 如果目录结构不同，请相应调整 package.json 中的路径

## 目录结构示例

```
parent-directory/
├── AIDatabench/
│   └── frontend/
│       └── package.json (引用 AIModelApplicationSuite)
└── AIModelApplicationSuite/
    ├── package.json
    └── src/
        └── components/
            └── AISelector.tsx
```

## 替代方案

如果无法通过本地路径引用，也可以考虑以下方案：

1. 使用 npm link 命令
2. 将 AIModelApplicationSuite 发布到私有 npm 仓库
3. 直接将源代码复制到项目中