# AIDatabench - AI驱动的数据库设计平台

## 项目简介

AIDatabench 是一个利用 AI 并 基于 ADB-TypeORM 的数据应用设计工具 ，为用户提供智能化的数据库实体设计、关系管理和服务生成功能。

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

## 🎯 核心组件

### AIAssistant 组件
```typescript
// AI 助手核心功能
interface AIAssistant {
  // 上下文生成
  generateContext(userInput: string): AIContext;
  
  // 响应处理
  processAIResponse(response: string): ProcessedResponse;
  
  // 操作应用
  applyAIOperation(operationData: unknown): Promise<void>;
  
  // 确认流程
  confirmOperation(operationData: unknown): Promise<void>;
}
```

### EntityManager 组件
```typescript
// 实体管理核心功能
interface EntityManager {
  // 实体创建
  createEntity(entityData: EntityData): Promise<ADBEntity>;
  
  // 实体更新
  updateEntity(id: string, updates: EntityUpdates): Promise<void>;
  
  // 实体删除
  deleteEntity(id: string): Promise<void>;
  
  // 实体状态管理
  updateEntityStatus(id: string, status: EntityStatus): Promise<void>;
}
```

### GraphView 组件
```typescript
// 图谱可视化核心功能
interface GraphView {
  // 图谱渲染
  renderGraph(entities: ADBEntity[], relations: Relation[]): void;
  
  // 交互操作
  handleNodeClick(nodeId: string): void;
  handleEdgeClick(edgeId: string): void;
  
  // 布局算法
  applyLayout(layoutType: LayoutType): void;
  
  // 导出功能
  exportGraph(format: ExportFormat): void;
}
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



## 🎨 用户界面

### 主要页面
1. **项目管理页面** - 项目列表、创建、导入导出
2. **模型设计器页面** - 实体设计、字段管理、关系映射
3. **图谱视图页面** - 实体关系可视化、交互操作
4. **AI 助手页面** - 智能对话、操作确认、建议应用
5. **设置页面** - AI 模型配置、系统参数设置

### 设计理念
- **简洁直观**：清晰的界面布局，降低学习成本
- **响应式设计**：适配不同屏幕尺寸
- **一致性**：统一的视觉风格和交互模式
- **可访问性**：支持键盘导航和屏幕阅读器

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

## 🚀 未来规划

### 短期目标 (1-2个月)
- [ ] 完善 AI 助手功能
- [ ] 优化图谱交互体验
- [ ] 增强代码生成能力
- [ ] 添加更多数据库支持

### 中期目标 (3-6个月)
- [ ] 团队协作功能
- [ ] 云端数据同步
- [ ] 插件系统
- [ ] API 接口管理

### 长期目标 (6-12个月)
- [ ] 企业级功能
- [ ] 多租户支持
- [ ] 国际化支持
- [ ] 移动端适配

## 📝 开发指南

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint + Prettier 规范
- 组件采用函数式编程
- 使用 React Hooks 管理状态

### 提交规范
```
feat: 新功能
fix: 修复问题
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

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

## 🙏 致谢

- [AIModelApplicationSuite](https://github.com/your-org/AIModelApplicationSuite) - AI 模型管理组件
- [ADB-TypeORM](https://github.com/your-org/ADB-TypeORM) - 增强型 TypeORM 框架
- [Ant Design](https://ant.design/) - 企业级 UI 设计语言
- [G6](https://g6.antv.vision/) - 图可视化引擎

---

**AIDatabench** - 让数据库设计更智能，让开发更高效！
