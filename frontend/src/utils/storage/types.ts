// src/utils/storage/types.ts

// 存储接口定义
export interface StorageInterface<T> {
  get<K extends keyof T>(key: K): Promise<T[K] | undefined>;
  set<K extends keyof T>(key: K, value: T[K]): Promise<void>;
  delete<K extends keyof T>(key: K): Promise<void>;
  clear(): Promise<void>;
}

// 事件类型
export type EventType = string;

// 事件处理器
export type EventHandler<T = unknown> = (data: T) => void;

// 事件订阅接口
export interface EventEmitterInterface {
  on<T = unknown>(event: EventType, handler: EventHandler<T>): () => void;
  off(event: EventType, handler: EventHandler): void;
  emit<T = unknown>(event: EventType, data: T): void;
}

// 路径类型（用于细粒度订阅）
export type Path = string | string[];

// 数据变更事件类型
export interface DataChangeEvent<T = unknown> {
  path: Path;
  value: T;
  previousValue?: T;
  timestamp: number;
  source: 'local' | 'remote';
}

// 存储选项
export interface StorageOptions {
  dbName: string;
  version: number;
  storeName: string;
}

// 应用数据结构（与现有的 AIDatabenchStorage 保持兼容）
export interface AIDatabenchStorage {
  app: {
    version: string;
    lastUpdated: string;
    theme: string;
    language: string;
  };
  projects: {
    active: string | null;
    list: Record<string, Project>;
  };
  aiModels: {
    active: string | null;
    configs: Record<string, AIModelConfig>;
  };
  preferences: UserPreferences;
  history: {
    imports: unknown[];
    exports: unknown[];
  };
}

// 以下类型保持与现有代码兼容
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  schema: {
    entities: Record<string, Entity>;
    relations: Relation[];
  };
  [key: string]: unknown;
}

export interface Entity {
  id: string;                    // 实体唯一标识
  name: string;                  // 实体名称
  tableName: string;             // 数据表名
  comment?: string;              // 实体注释
  
  // 实体状态
  status: 'active' | 'disabled' | 'archived';
  isLocked: boolean;             // 是否锁定编辑
  
  // 字段定义
  fields: Record<string, unknown>;
  
  // 索引定义
  indexes?: unknown[];
  
  // 实体设置
  settings: {
    timestamps: boolean;         // 是否包含时间戳字段
    softDelete: boolean;         // 是否支持软删除
    validation: boolean;         // 是否启用验证
  };
  
  // 元数据
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    tags: string[];
  };
  
  [key: string]: unknown;
}

export interface Relation {
  id: string;
  from: {
    entityId: string;
    fieldId?: string;
  };
  to: {
    entityId: string;
    fieldId?: string;
  };
  type: string;
  [key: string]: unknown;
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
  config?: {
    apiKey?: string;
    model?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface UserPreferences {
  ui: {
    sidebarCollapsed: boolean;
    panelSizes: {
      sidebar: number;
      main: number;
      properties: number;
    };
    recentProjects: string[];
    favoriteEntities: string[];
  };
  editor: {
    theme: string;
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    autoSave: boolean;
  };
  graph: {
    layout: string;
    showMinimap: boolean;
    autoLayout: boolean;
    nodeStyle: string;
  };
  codeGen: {
    language: string;
    framework: string;
    naming: string;
    includeComments: boolean;
    includeValidation: boolean;
  };
  [key: string]: unknown;
}
