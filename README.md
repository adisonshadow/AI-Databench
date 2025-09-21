# AIDatabench - AI驱动的数据库设计平台

## 项目简介

AIDatabench 是一个利用 AI 并 基于 ADB-TypeORM 的数据应用设计工具 ，为用户提供智能化的数据库实体设计、关系管理和服务生成功能。

<img src="https://raw.githubusercontent.com/adisonshadow/AI-Databench/refs/heads/main/Screenshots/g1.gif" width="100%" alt="Main UI">

## 🚀 核心功能

### 1. AI 辅助数据库设计
- **智能实体生成**：通过自然语言描述自动生成数据库实体
- **关系智能建议**：AI 分析业务逻辑，自动建议实体间关系
- **设计规范检查**：自动检查命名规范、数据类型合理性
- **性能优化建议**：基于最佳实践提供数据库优化建议

### 2. 可视化 ORM 设计器
- **拖拽式设计**：直观的实体和字段设计界面
- **关系图谱**：基于 G6 的实体关系可视化
- **实时预览**：设计变更实时反映到图谱中
- **状态管理**：支持实体的启用/禁用/归档状态

### 3. 智能代码生成
- **TypeScript 类型**：自动生成实体对应的 TypeScript 接口
- **ADB-TypeORM 装饰器**：生成符合 ADB-TypeORM 规范的装饰器代码
- **API 接口**：自动生成 CRUD 操作的 API 接口代码
- **数据库迁移脚本**：生成数据库结构变更的迁移脚本

### 4. 项目管理
- **多项目支持**：支持创建和管理多个数据库设计项目
- **数据持久化**：基于 localStorage 的本地数据存储
- **导入导出**：支持项目数据的导入导出功能
- **版本控制**：设计变更的历史记录和回滚功能

## 📊 功能特性

### AI 智能设计
- ✅ 自然语言实体生成
- ✅ 智能字段类型推荐
- ✅ 关系自动识别
- ✅ 设计规范检查
- ✅ 性能优化建议

### 可视化设计
- ✅ 拖拽式实体设计
- ✅ 实时关系图谱
- ✅ 多布局算法支持
- ✅ 交互式编辑
- ✅ 图谱导出功能

### 代码生成
- ✅ TypeScript 接口生成
- ✅ ADB-TypeORM 装饰器生成
- ✅ API 接口代码生成
- ✅ 数据库迁移脚本
- ✅ 代码模板管理

### 项目管理
- ✅ 多项目支持
- ✅ 数据导入导出
- ✅ 版本历史管理
- ✅ 项目模板系统
- ✅ 本地数据持久化

## 🛠️ 技术架构

### 前端技术栈
```
Vite + React 18 + TypeScript
├── UI 框架: Ant Design 5.x
├── 路由管理: React Router 6.x
├── 状态管理: React Hooks + Context
├── 图表可视化: @antv/g6
├── 代码编辑: Monaco Editor
└── 构建工具: Vite (快速构建 + HMR)
```

### 核心依赖集成

#### ADB-TypeORM
- **增强装饰器**：支持 EntityInfo、ColumnInfo 等元数据装饰器
- **扩展类型**：支持 adb-snowflake-id、adb-auto-increment-id 等扩展类型
- **枚举管理**：智能枚举类型定义和管理
- **关系映射**：复杂实体关系的类型安全映射

### 数据存储方案
- localStorage
```typescript
// localStorage 数据结构
interface AIDatabenchStorage {
  projects: {
    active: string | null;
    list: Project[];
    recent: string[];
  };
  entities: Record<string, ADBEntity>;
  enums: Record<string, ADBEnumDefinition>;
  relations: Record<string, Relation>;
  settings: UserSettings;
}
```

- IndexedDB
详见 [IndexedDB 存储系统](./frontend/src/utils/storage/IndexedDB%20存储系统.md)

## 📁 项目结构

```
AIDatabench/
├── frontend/                    # 前端应用
│   ├── src/
│   │   ├── components/         # 组件库
│   │   │   ├── AIAssistant/    # AI 助手组件
│   │   │   ├── EntityManager/  # 实体管理组件
│   │   │   ├── FieldsManager/  # 字段管理组件
│   │   │   ├── GraphView/      # 图谱可视化组件
│   │   │   └── Layout/         # 布局组件
│   │   ├── pages/              # 页面组件
│   │   │   ├── ModelDesigner/  # 模型设计器页面
│   │   │   ├── Projects/       # 项目管理页面
│   │   │   └── Settings/       # 设置页面
│   │   ├── stores/             # 状态管理
│   │   ├── types/              # 类型定义
│   │   └── utils/              # 工具函数
│   └── package.json
├── Documents/                   # 项目文档
├── README.md                   # 项目说明
└── package.json               # 根项目配置
```


## 🔧 开发环境

### 环境要求
- Node.js >= 16.0.0
- Yarn >= 1.22.0
- 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

### 快速开始
```bash
# 克隆项目
git clone <repository-url>
cd AIDatabench

# 安装依赖
cd frontend
yarn install

# 启动开发服务器
yarn dev

# 访问应用
open http://localhost:3000
```

### 本地依赖配置
```bash
# 配置 AIModelApplicationSuite 本地依赖
yarn add file:../AIModelApplicationSuite

# 配置 ADB-TypeORM 本地依赖  
yarn add file:../ADB-TypeORM
```

## 🔄 数据流

### AI 操作流程
```
用户输入 → AI 上下文生成 → AI 模型调用 → 响应解析 → 操作确认 → 数据应用
```

### 实体设计流程
```
创建实体 → 字段设计 → 关系映射 → 图谱更新 → 代码生成 → 数据保存
```

### 项目管理流程
```
项目创建 → 实体设计 → AI 优化 → 代码生成 → 项目导出
```

## 📝 开发指南

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint + Prettier 规范
- 组件采用函数式编程
- 使用 React Hooks 管理状态

### 测试策略
- 单元测试：核心业务逻辑
- 集成测试：组件间交互
- E2E 测试：关键用户流程

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢/引用

- [AIModelApplicationSuite](https://github.com/adisonshadow/AIModelApplicationSuite) - AI 模型管理组件
- [ADB-TypeORM](https://github.com/adisonshadow/ADB-TypeORM) - 增强型 TypeORM 框架
- [Ant Design](https://ant.design/) - 企业级 UI 设计语言
- [G6](https://g6.antv.vision/) - 图可视化引擎


