// AIDatabench LocalStorage 数据类型定义 - 基于ADB-TypeORM

// 导入ADB-TypeORM类型
import type { EntityInfoOptions, ColumnInfoOptions, EnumInfoOptions } from 'adb-typeorm';

export interface AIDatabenchStorage {
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

// 扩展ADB-TypeORM的EntityInfoOptions以包含所需字段
export interface ExtendedEntityInfo {
  id: string;                    // 实体唯一标识
  code: string;                  // 唯一识别码
  label: string;                 // 显示名称
  status?: 'enabled' | 'disabled' | 'archived';
  isLocked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  name?: string;
  description?: string;
  version?: string;
  tags?: string[];
  tableName?: string;        // 数据表名
  comment?: string;          // 实体注释
}

// 扩展ADB-TypeORM的ColumnInfoOptions以包含所需字段
export interface ExtendedColumnInfo {
  id: string;                    // 唯一标识
  label: string;                 // 字段显示名
  extendType?: string;           // 扩展类型标识
  mediaConfig?: MediaConfigOptions;
  enumConfig?: EnumConfigOptions;
  autoIncrementIdConfig?: AutoIncrementIdConfigOptions;
  guidIdConfig?: GuidIdConfigOptions;
  snowflakeIdConfig?: SnowflakeIdConfigOptions;
  code?: string;             // 字段标识码
  comment?: string;          // 字段注释
  status?: 'enabled' | 'disabled' | 'archived';
  orderIndex?: number;       // 排序索引
  
  // ADB 扩展类型配置
  mediaConfig?: {
    mediaType: 'image' | 'video' | 'audio' | 'document' | 'file';
    formats: string[];
    maxSize?: number;
    isMultiple?: boolean;
    storagePath?: string;
  };
  enumConfig?: {
    enum: any;
    isMultiple?: boolean;
    default?: any;
  };
  autoIncrementIdConfig?: {
    startValue?: number;
    increment?: number;
    sequenceName?: string;
    isPrimaryKey?: boolean;
    description?: string;
  };
  guidIdConfig?: {
    version?: 'v1' | 'v4' | 'v5';
    format?: 'default' | 'braced' | 'binary' | 'urn';
    isPrimaryKey?: boolean;
    description?: string;
    generateOnInsert?: boolean;
  };
  snowflakeIdConfig?: {
    machineId?: number;
    datacenterId?: number;
    epoch?: number;
    isPrimaryKey?: boolean;
    description?: string;
    generateOnInsert?: boolean;
    format?: 'number' | 'string';
  };
}

// 基于ADB-TypeORM的实体定义
export interface ADBEntity {
  // ADB-TypeORM EntityInfo（使用扩展类型）
  entityInfo: ExtendedEntityInfo;
  
  // 字段定义（基于ADB-TypeORM ColumnInfo）
  fields: Record<string, ADBField>;
  
  // 索引定义
  indexes?: Index[];
  
  // 原始的TypeORM实体代码
  entityCode?: string;
  
  // 生成的TypeScript代码
  generatedCode?: string;
  
  // 创建和更新时间
  createdAt: string;
  updatedAt: string;
}

// 基于ADB-TypeORM的字段定义
export interface ADBField {
  // ADB-TypeORM ColumnInfo（使用扩展类型）
  columnInfo: ExtendedColumnInfo;
  
  // TypeORM原生字段配置
  typeormConfig: {
    type: string;           // TypeORM字段类型
    length?: number;        // 字段长度
    nullable?: boolean;     // 是否可为空
    unique?: boolean;       // 是否唯一
    default?: any;          // 默认值
    comment?: string;       // 字段注释
    primary?: boolean;      // 是否为主键
    generated?: boolean | 'increment' | 'uuid' | 'rowid';  // 是否自动生成
    precision?: number;     // 精度
    scale?: number;         // 小数位数
    enum?: any;            // 枚举类型
    array?: boolean;       // 是否为数组类型
  };
  
  // 创建和更新时间
  createdAt: string;
  updatedAt: string;
}

// ADB增强枚举定义
export interface ADBEnumDefinition {
  // ADB-TypeORM EnumInfo
  enumInfo: EnumInfoOptions;
  
  // 枚举值定义
  values: Record<string, any>;
  
  // 生成的枚举代码
  generatedCode?: string;
  
  // 创建和更新时间
  createdAt: string;
  updatedAt: string;
}

export interface Project {
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
  
  // ADB-TypeORM设计数据
  schema: {
    entities: Record<string, ADBEntity>;     // ADB实体定义
    enums: Record<string, ADBEnumDefinition>; // ADB枚举定义
    relations: Relation[];                   // 关系定义
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
    enums: Record<string, string>;       // 生成的枚举代码
    migrations: string[];               // 迁移脚本
    apis: Record<string, string>;       // 生成的API代码
  };
}

export interface Entity {
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
  
  // 元数据
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    tags: string[];
  };
}

export interface Field {
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

// 关系类型枚举
export enum RelationType {
  ONE_TO_ONE = 'oneToOne',
  ONE_TO_MANY = 'oneToMany',
  MANY_TO_ONE = 'manyToOne',
  MANY_TO_MANY = 'manyToMany'
}

// 级联操作类型
export enum CascadeType {
  CASCADE = 'CASCADE',
  SET_NULL = 'SET NULL',
  RESTRICT = 'RESTRICT',
  NO_ACTION = 'NO ACTION'
}

// 关系配置
export interface RelationConfig {
  cascade: boolean;                    // 级联操作
  onDelete: CascadeType;              // 删除策略
  onUpdate: CascadeType;              // 更新策略
  nullable: boolean;                  // 是否可为空
  eager: boolean;                     // 是否立即加载
  lazy: boolean;                      // 是否懒加载
}

// 多对多关系中间表配置
export interface JoinTableConfig {
  name: string;                      // 中间表名称
  joinColumn: string;                // 连接列名称
  inverseJoinColumn: string;          // 反向连接列名称
}

// 关系元数据
export interface RelationMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  description?: string;              // 关系描述
  tags: string[];                   // 标签
}

// 关系实体端点
export interface RelationEndpoint {
  entityId: string;                  // 实体ID
  entityName: string;               // 实体名称
  fieldId?: string;                 // 字段ID（可选）
  fieldName?: string;               // 字段名称（可选）
}

// 关系接口
export interface Relation {
  id: string;                       // 关系唯一标识
  type: RelationType;               // 关系类型
  name: string;                     // 关系名称
  inverseName?: string;             // 反向关系名称
  
  // 关系的两端
  from: RelationEndpoint;           // 源实体端点
  to: RelationEndpoint;             // 目标实体端点
  
  // 关系配置
  config: RelationConfig;
  
  // 多对多关系特殊配置
  joinTable?: JoinTableConfig;
  
  // 元数据
  metadata: RelationMetadata;
}

// 关系创建配置
export interface RelationCreateConfig {
  type: RelationType;
  fromEntityId: string;
  toEntityId: string;
  name: string;
  inverseName?: string;
  config?: Partial<RelationConfig>;
  joinTable?: Partial<JoinTableConfig>;
  description?: string;
  tags?: string[];
}

// 关系验证结果
export interface RelationValidationResult {
  isValid: boolean;
  errors: RelationValidationError[];
  warnings: RelationValidationWarning[];
}

// 关系验证错误
export interface RelationValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

// 关系验证警告
export interface RelationValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// 关系冲突
export interface RelationConflict {
  type: 'duplicate' | 'circular' | 'naming' | 'field_type';
  message: string;
  conflictingRelation?: Relation;
  suggestion?: string;
}

// 关系建议
export interface RelationSuggestion {
  type: RelationType;
  fromEntityId: string;
  toEntityId: string;
  confidence: number;
  reason: string;
  suggestedName: string;
  suggestedInverseName?: string;
}

export interface AIModelConfig {
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

export interface DatabaseConfig {
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

export interface UserPreferences {
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

// 辅助类型定义
export interface GraphNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceAnchor?: number;
  targetAnchor?: number;
}

export interface Index {
  id: string;
  name: string;
  fields: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface EnumDefinition {
  id: string;
  name: string;
  values: Array<{
    key: string;
    value: string | number;
    comment?: string;
  }>;
  comment?: string;
}

export interface AIProjectConfig {
  enabled: boolean;
  defaultModel: string;
  autoSuggestion: boolean;
  confidenceThreshold: number;
}

export interface ImportRecord {
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

export interface ExportRecord {
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