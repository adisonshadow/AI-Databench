# AIDatabench Vite项目初始化指南

## 快速开始

### 1. 环境准备

```bash
# 设置网络代理（用户偏好）
export http_proxy=http://127.0.0.1:7897
export https_proxy=http://127.0.0.1:7897

# 确认Node.js版本（推荐18+）
node --version
yarn --version
```

### 2. 创建Vite项目

```bash
# 进入项目目录
cd /Users/yanfang/dev/AIDatabench

# 创建前端项目
yarn create vite frontend --template react-ts

# 进入项目目录
cd frontend

# 安装依赖
yarn install
```

### 3. 安装核心依赖

```bash
# 安装Ant Design和相关组件
yarn add antd @ant-design/pro-components @ant-design/icons
yarn add @ant-design/pro-layout @ant-design/pro-table @ant-design/pro-form

# 安装路由
yarn add react-router-dom

# 安装图谱组件
yarn add @antv/g6 @antv/graphin @antv/graphin-components

# 安装代码编辑器
yarn add @monaco-editor/react @uiw/react-codemirror @codemirror/lang-sql

# 安装其他核心依赖
yarn add axios @types/node

# 安装开发依赖
yarn add -D @types/react @types/react-dom
yarn add -D eslint prettier husky lint-staged
```

### 4. 本地依赖集成

```bash
# 添加AIModelApplicationSuite
yarn add file:../AIModelApplicationSuite

# 验证安装
ls node_modules/react-ai-model-manager
```

### 5. Vite配置

创建 `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~/': path.resolve(__dirname, './src/'),
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '/api'
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'antd-vendor': ['antd', '@ant-design/pro-components'],
          'chart-vendor': ['@antv/g6', '@antv/graphin']
        }
      }
    }
  }
})
```

### 6. TypeScript配置

更新 `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "~/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 7. 基础项目结构

```
frontend/
├── public/
├── src/
│   ├── components/          # 通用组件
│   │   ├── AIModelManager/  # AI模型管理组件
│   │   ├── ORMDesigner/     # ORM设计器
│   │   ├── GraphView/       # 图谱视图
│   │   └── CodeEditor/      # 代码编辑器
│   ├── pages/               # 页面组件
│   │   ├── Dashboard/       # 仪表盘
│   │   ├── Projects/        # 项目管理
│   │   ├── Designer/        # ORM设计器
│   │   ├── Database/        # 数据库管理
│   │   └── Settings/        # 系统设置
│   ├── services/            # API服务
│   ├── hooks/               # 自定义Hooks
│   ├── utils/               # 工具函数
│   ├── types/               # 类型定义
│   ├── styles/              # 样式文件
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 入口文件
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 8. 路由配置

创建 `src/router/index.tsx`:

```typescript
import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Projects from '@/pages/Projects'
import Designer from '@/pages/Designer'
import Database from '@/pages/Database'
import Settings from '@/pages/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'projects', element: <Projects /> },
      { path: 'designer', element: <Designer /> },
      { path: 'database', element: <Database /> },
      { path: 'settings', element: <Settings /> }
    ]
  }
])
```

### 9. 主应用配置

更新 `src/App.tsx`:

```typescript
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { router } from './router'
import './App.css'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}

export default App
```

### 10. 开发脚本

更新 `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit"
  }
}
```

### 11. 启动开发服务器

```bash
# 启动前端开发服务器
yarn dev

# 在浏览器中访问
open http://localhost:3000
```

### 12. 验证集成

1. **验证Vite启动**
   - 确认开发服务器正常启动
   - 检查热重载功能

2. **验证依赖集成**
   - 确认Ant Design组件正常显示
   - 检查AIModelApplicationSuite组件可用

3. **验证路由功能**
   - 测试页面间导航
   - 确认路由配置正确

## 下一步

完成基础项目搭建后，可以开始：

1. **迁移BDC组件** - 将现有组件迁移到新项目
2. **集成AIModelApplicationSuite** - 配置AI模型管理功能
3. **后端集成** - 配置API调用和数据交互
4. **测试和优化** - 确保功能正常和性能优化

---

*此指南提供了创建AIDatabench Vite项目的详细步骤，可根据实际需要进行调整。*