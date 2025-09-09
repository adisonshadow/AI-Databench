# AIDatabench LocalStorage 数据结构设计

## 概述

基于用户需求，AIDatabench将使用localStorage作为唯一的数据持久化方案，不再依赖数据库系统。以下是详细的数据结构设计。

## 1. 顶层数据结构

```typescript
interface AIDatabenchStorage {
  // 应用元数据
  app: {
    version: string;           // 应用版本
    lastUpdated: string;      // 最后更新时间 ISO 8601
    theme: 'light' | 'dark';  // 主题设置
    language: 'zh-CN' | 'en-US';
  };
  
  // 项目管理
  projects: {
    active: string | null;    // 当前激活的项目ID
    list: Record<string, Project>;  // 项目列表 key: projectId
  };
  
  // AI模型配置
  aiModels: {
    active: string | null;    // 当前选中的模型ID
    configs: Record<string, AIModelConfig>;  // 模型配置
  };
  
  // 用户偏好设置
  preferences: UserPreferences;
  
  // 导入导出历史
  history: {
    imports: ImportRecord[];
    exports: ExportRecord[];
  };
}
```

## 2. 项目数据结构

```typescript
interface Project {
  // 基本信息
  id: string;                 // 项目唯一标识
  name: string;              // 项目名称
  description?: string;      // 项目描述
  createdAt: string;         // 创建时间 ISO 8601
  updatedAt: string;         // 更新时间 ISO 8601
  version: string;           // 项目版本
  
  // 项目配置
  config: {
    database: DatabaseConfig;  // 数据库配置（仅用于连接测试）
    ai: AIProjectConfig;      // AI相关配置
  };
  
  // ORM设计数据
  schema: {
    entities: Record<string, Entity>;     // 实体定义
    enums: Record<string, EnumDefinition>; // 枚举定义
    relations: Relation[];               // 关系定义
  };
  
  // 图谱布局
  layout: {
    nodes: GraphNode[];       // 图谱节点位置
    edges: GraphEdge[];       // 图谱边连接
    viewport: {               // 视图状态
      x: number;
      y: number;
      zoom: number;
    };
  };
  
  // 生成的代码
  generated: {
    entities: Record<string, string>;    // 生成的实体代码
    migrations: string[];               // 迁移脚本
    apis: Record<string, string>;       // 生成的API代码
  };
}
```

## 3. 实体定义结构

```typescript
interface Entity {
  // 实体基本信息
  id: string;                // 实体唯一标识
  name: string;             // 实体名称
  tableName: string;        // 数据表名
  comment?: string;         // 实体注释
  
  // 实体状态
  status: 'active' | 'disabled' | 'archived';
  isLocked: boolean;        // 是否锁定编辑
  
  // 字段定义
  fields: Record<string, Field>;
  
  // 索引定义
  indexes: Index[];
  
  // 实体设置
  settings: {
    timestamps: boolean;     // 是否包含时间戳字段
    softDelete: boolean;     // 是否支持软删除
    validation: boolean;     // 是否启用验证
  };
  
  // 元数据（来源于ADB-TypeORM的EntityInfo概念）
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    tags: string[];
  };
}

interface Field {
  id: string;
  name: string;              // 字段名
  type: string;             // 数据类型
  nullable: boolean;        // 是否可为空
  primary: boolean;         // 是否为主键
  unique: boolean;          // 是否唯一
  index: boolean;           // 是否创建索引
  default?: any;            // 默认值
  length?: number;          // 字段长度
  precision?: number;       // 精度
  scale?: number;           // 小数位数
  comment?: string;         // 字段注释
  
  // 字段验证规则
  validation?: {
    required: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
  
  // AI相关元数据
  aiMetadata?: {
    description: string;     // AI生成的字段描述
    suggestions: string[];   // AI建议
    confidence: number;      // AI建议的置信度
  };
}
```

## 4. 关系定义结构

```typescript
interface Relation {
  id: string;
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  
  // 关系的两端
  from: {
    entityId: string;
    fieldId: string;
  };
  to: {
    entityId: string;
    fieldId: string;
  };
  
  // 关系配置
  config: {
    cascade: boolean;        // 级联操作
    onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    nullable: boolean;
  };
  
  // 关系名称
  name?: string;
  inverseName?: string;
}
```

## 5. AI模型配置结构

```typescript
interface AIModelConfig {
  id: string;
  name: string;             // 模型名称
  provider: string;         // 提供商 (openai, claude, etc.)
  apiKey: string;          // API密钥
  baseUrl?: string;        // 自定义API地址
  model: string;           // 模型名称
  
  // 模型参数
  parameters: {
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
  };
  
  // 使用统计
  usage: {
    totalRequests: number;
    totalTokens: number;
    lastUsed: string;
  };
  
  // 模型能力配置
  capabilities: {
    entityGeneration: boolean;     // 实体生成
    relationshipSuggestion: boolean; // 关系建议
    codeGeneration: boolean;       // 代码生成
    queryGeneration: boolean;      // 查询生成
  };
}
```

## 6. 数据库连接配置

```typescript
interface DatabaseConfig {
  id: string;
  name: string;             // 连接名称
  type: 'mysql' | 'postgresql' | 'sqlite' | 'oracle' | 'mssql';
  
  // 连接参数（仅用于测试连接）
  connection: {
    host: string;
    port: number;
    username: string;
    password: string;        // 注意：实际使用时需要加密
    database: string;
    schema?: string;
  };
  
  // 连接状态
  status: 'connected' | 'disconnected' | 'error';
  lastTested: string;
  
  // SSL配置
  ssl?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}
```

## 7. 用户偏好设置

```typescript
interface UserPreferences {
  // 界面设置
  ui: {
    sidebarCollapsed: boolean;
    panelSizes: Record<string, number>;
    recentProjects: string[];        // 最近使用的项目ID列表
    favoriteEntities: string[];      // 收藏的实体ID列表
  };
  
  // 编辑器设置
  editor: {
    theme: 'vs-light' | 'vs-dark';
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    autoSave: boolean;
  };
  
  // 图谱设置
  graph: {
    layout: 'force' | 'dagre' | 'circle' | 'grid';
    showMinimap: boolean;
    autoLayout: boolean;
    nodeStyle: 'simple' | 'detailed';
  };
  
  // 代码生成偏好
  codeGen: {
    language: 'typescript' | 'javascript';
    framework: 'typeorm' | 'prisma' | 'sequelize';
    naming: 'camelCase' | 'snake_case' | 'PascalCase';
    includeComments: boolean;
    includeValidation: boolean;
  };
}
```

## 8. 导入导出记录

```typescript
interface ImportRecord {
  id: string;
  timestamp: string;
  source: 'bdc' | 'file' | 'url';
  sourceInfo: {
    path?: string;
    url?: string;
    size?: number;
  };
  result: {
    success: boolean;
    projectsImported: number;
    entitiesImported: number;
    errors?: string[];
  };
}

interface ExportRecord {
  id: string;
  timestamp: string;
  target: 'file' | 'clipboard';
  format: 'json' | 'sql' | 'typescript' | 'zip';
  content: {
    projects: string[];
    entities: string[];
    size: number;
  };
}
```

## 9. LocalStorage 操作接口设计

```typescript
class AIDatabenchStorage {
  private static readonly STORAGE_KEY = 'aidatabench_data';
  private static readonly VERSION = '1.0.0';

  // 初始化存储
  static initialize(): void;
  
  // 获取完整数据
  static getData(): AIDatabenchStorage;
  
  // 保存数据
  static saveData(data: Partial<AIDatabenchStorage>): void;
  
  // 项目操作
  static getProject(id: string): Project | null;
  static saveProject(project: Project): void;
  static deleteProject(id: string): void;
  static listProjects(): Project[];
  
  // 实体操作
  static getEntity(projectId: string, entityId: string): Entity | null;
  static saveEntity(projectId: string, entity: Entity): void;
  static deleteEntity(projectId: string, entityId: string): void;
  
  // AI模型配置
  static getAIModel(id: string): AIModelConfig | null;
  static saveAIModel(config: AIModelConfig): void;
  static deleteAIModel(id: string): void;
  
  // 数据备份与恢复
  static backup(): string;  // 返回JSON字符串
  static restore(backup: string): boolean;
  
  // 数据清理
  static clear(): void;
  static clearProject(id: string): void;
}
```

## 10. 数据迁移与版本管理

```typescript
interface DataMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => AIDatabenchStorage;
}

class DataMigrationManager {
  private static migrations: DataMigration[] = [];
  
  static registerMigration(migration: DataMigration): void;
  static migrateData(data: any, currentVersion: string): AIDatabenchStorage;
  static needsMigration(storedVersion: string): boolean;
}
```

## 11. 存储大小管理

```typescript
interface StorageInfo {
  totalSize: number;        // 总大小（字节）
  usedSize: number;         // 已使用大小
  availableSize: number;    // 可用大小
  itemCount: number;        // 项目数量
  largestProject: string;   // 最大项目ID
}

class StorageManager {
  static getStorageInfo(): StorageInfo;
  static cleanupOldData(keepDays: number): void;
  static compressData(): void;
  static isStorageFull(): boolean;
}
```

## 12. 使用示例

```typescript
// 初始化应用时
AIDatabenchStorage.initialize();

// 创建新项目
const newProject: Project = {
  id: 'proj_' + Date.now(),
  name: '我的项目',
  description: '项目描述',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: '1.0.0',
  // ... 其他字段
};
AIDatabenchStorage.saveProject(newProject);

// 添加实体
const entity: Entity = {
  id: 'entity_user',
  name: 'User',
  tableName: 'users',
  status: 'active',
  isLocked: false,
  fields: {
    id: {
      id: 'field_id',
      name: 'id',
      type: 'bigint',
      nullable: false,
      primary: true,
      unique: true,
      index: false
    }
  },
  // ... 其他字段
};
AIDatabenchStorage.saveEntity(newProject.id, entity);
```

## 13. 安全性考虑

1. **敏感数据加密**: 数据库密码等敏感信息需要进行本地加密
2. **数据校验**: 读取数据时进行结构校验，防止数据损坏
3. **备份机制**: 定期自动备份到文件，防止数据丢失
4. **容量监控**: 监控localStorage使用量，及时清理过期数据

## 14. 性能优化

1. **懒加载**: 大型项目数据按需加载
2. **缓存策略**: 频繁访问的数据保持在内存缓存中
3. **压缩存储**: 对大型JSON数据进行压缩存储
4. **分片存储**: 将大型项目分片存储，避免单次读写过大

---

*此数据结构设计支持完整的AIDatabench功能，同时保持了良好的扩展性和可维护性。*