import { StorageService } from '@/stores/storage';
import type { Project, ADBEntity, ADBEnumDefinition, Relation } from '@/types/storage';

/**
 * AI 上下文提供器
 * 负责向 AI 模型提供完整的项目上下文信息
 */
export class AIContextProvider {
  private currentProject: Project | null = null;

  constructor() {
    this.loadCurrentProject();
  }

  /**
   * 加载当前项目
   */
  private loadCurrentProject(): void {
    const activeProjectId = StorageService.getActiveProject();
    if (activeProjectId) {
      this.currentProject = StorageService.getProject(activeProjectId);
    }
  }

  /**
   * 获取完整的 AI 上下文信息
   */
  public getAIContext(): AIContext {
    if (!this.currentProject) {
      // 如果没有项目，返回默认的空项目上下文
      return this.getDefaultContext();
    }

    return {
      // ADB TypeORM 规范信息
      adbTypeormSpec: this.getADBTypeormSpecification(),
      
      // 项目基本信息
      projectInfo: this.getProjectInfo(),
      
      // 实体信息
      entities: this.getEntitiesInfo(),
      
      // 枚举信息
      enums: this.getEnumsInfo(),
      
      // 关系信息
      relations: this.getRelationsInfo(),
      
      // 约束和规则
      constraints: this.getConstraints(),
      
      // AI 响应格式要求
      responseFormat: this.getResponseFormat()
    };
  }

  /**
   * 获取默认上下文（当没有项目时）
   */
  private getDefaultContext(): AIContext {
    return {
      // ADB TypeORM 规范信息
      adbTypeormSpec: this.getADBTypeormSpecification(),
      
      // 默认项目信息
      projectInfo: {
        id: 'default',
        name: '新项目',
        description: '这是一个新项目，还没有创建任何实体',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        databaseType: 'mysql',
        entityCount: 0,
        enumCount: 0,
        relationCount: 0
      },
      
      // 空的实体、枚举、关系信息
      entities: [],
      enums: [],
      relations: [],
      
      // 默认约束
      constraints: {
        entity: {
          uniqueCodes: [],
          uniqueTableNames: [],
          reservedNames: ['user', 'admin', 'system', 'config', 'setting']
        },
        field: {
          uniqueCodes: [],
          reservedNames: ['id', 'createdAt', 'updatedAt', 'deletedAt']
        },
        enum: {
          uniqueCodes: [],
          reservedNames: ['status', 'type', 'state', 'level']
        },
        businessRules: [
          '实体名称不能重复',
          '实体代码不能重复',
          '表名不能重复',
          '字段代码在同一实体内不能重复',
          '枚举代码不能重复',
          '关系名称不能重复'
        ]
      },
      
      // 响应格式要求
      responseFormat: this.getResponseFormat()
    };
  }

  /**
   * 获取 ADB TypeORM 规范信息
   */
  private getADBTypeormSpecification(): ADBTypeormSpec {
    return {
      framework: 'ADB TypeORM',
      version: '0.0.3',
      description: '基于并完全兼容 TypeORM，为适配 AI 设计 ORM 和可视化管理 ORM 的需要而设计',
      
      // 核心特性
      features: [
        '完全兼容 TypeORM',
        '增强的实体信息',
        '扩展的列类型',
        'ADB 增强枚举',
        '枚举元数据持久化',
        'AI 友好设计',
        '类型安全',
        '装饰器增强',
        '类型支持系统'
      ],
      
      // 支持的扩展类型
      supportedTypes: {
        adbExtend: [
          'adb-media',           // 媒体类型
          'adb-enum',            // ADB 增强枚举
          'adb-auto-increment-id', // 自增ID
          'adb-guid-id',         // GUID ID
          'adb-snowflake-id'     // Snowflake ID
        ],
        typeormNative: [
          'varchar', 'int', 'boolean', 'json', 'text', 'decimal',
          'date', 'datetime', 'timestamp', 'blob', 'enum'
        ]
      },
      
      // 装饰器规范
      decorators: {
        entityInfo: {
          required: ['id', 'code', 'label'],
          optional: ['description', 'tags', 'status', 'isLocked', 'tableName', 'comment']
        },
        columnInfo: {
          required: ['id', 'label'],
          optional: ['extendType', 'code', 'comment', 'status', 'orderIndex']
        },
        enumInfo: {
          required: ['id', 'code', 'label'],
          optional: ['description']
        }
      },
      
      // 命名规范
      namingConventions: {
        entity: {
          code: '使用冒号分隔的多级结构，如: user:admin:super',
          tableName: '使用下划线分隔的小写，如: user_admin_super',
          label: '中文显示名称，如: 超级管理员用户'
        },
        field: {
          code: '使用下划线分隔的小写，如: user_name',
          label: '中文显示名称，如: 用户名'
        },
        enum: {
          code: '使用冒号分隔的结构，如: order:status',
          label: '中文显示名称，如: 订单状态'
        }
      }
    };
  }

  /**
   * 获取项目基本信息
   */
  private getProjectInfo(): ProjectInfo {
    if (!this.currentProject) {
      throw new Error('项目信息不可用');
    }

    return {
      id: this.currentProject.id,
      name: this.currentProject.name,
      description: this.currentProject.description || '',
      version: this.currentProject.version,
      createdAt: this.currentProject.createdAt,
      updatedAt: this.currentProject.updatedAt,
      databaseType: this.currentProject.config.database.type,
      entityCount: Object.keys(this.currentProject.schema.entities).length,
      enumCount: Object.keys(this.currentProject.schema.enums).length,
      relationCount: this.currentProject.schema.relations.length
    };
  }

  /**
   * 获取实体信息
   */
  private getEntitiesInfo(): EntityInfo[] {
    if (!this.currentProject) {
      return [];
    }

    return Object.values(this.currentProject.schema.entities).map(entity => ({
      id: entity.entityInfo.id,
      code: entity.entityInfo.code,
      label: entity.entityInfo.label,
      tableName: entity.entityInfo.tableName || '',
      description: entity.entityInfo.description || '',
      status: entity.entityInfo.status || 'enabled',
      isLocked: entity.entityInfo.isLocked || false,
      tags: entity.entityInfo.tags || [],
      fieldCount: Object.keys(entity.fields).length,
      fields: Object.values(entity.fields).map(field => ({
        id: field.columnInfo.id,
        code: field.columnInfo.code || '',
        label: field.columnInfo.label,
        type: field.typeormConfig.type,
        extendType: field.columnInfo.extendType,
        nullable: field.typeormConfig.nullable || false,
        primary: field.typeormConfig.primary || false,
        unique: field.typeormConfig.unique || false,
        comment: field.columnInfo.comment || ''
      }))
    }));
  }

  /**
   * 获取枚举信息
   */
  private getEnumsInfo(): EnumInfo[] {
    if (!this.currentProject) {
      return [];
    }

    return Object.values(this.currentProject.schema.enums).map(enumDef => ({
      id: enumDef.enumInfo.id,
      code: enumDef.enumInfo.code,
      label: enumDef.enumInfo.label,
      description: enumDef.enumInfo.description || '',
      valueCount: Object.keys(enumDef.values).length,
      values: Object.entries(enumDef.values).map(([key, value]) => ({
        key,
        value: String(value)
      }))
    }));
  }

  /**
   * 获取关系信息
   */
  private getRelationsInfo(): RelationInfo[] {
    if (!this.currentProject) {
      return [];
    }

    return this.currentProject.schema.relations.map(relation => ({
      id: relation.id,
      type: relation.type,
      name: relation.name,
      inverseName: relation.inverseName,
      fromEntity: relation.from.entityName,
      toEntity: relation.to.entityName,
      cascade: relation.config.cascade,
      onDelete: relation.config.onDelete,
      onUpdate: relation.config.onUpdate
    }));
  }

  /**
   * 获取约束和规则
   */
  private getConstraints(): Constraints {
    return {
      // 实体约束
      entity: {
        uniqueCodes: this.getUniqueEntityCodes(),
        uniqueTableNames: this.getUniqueTableNames(),
        reservedNames: ['user', 'admin', 'system', 'config', 'setting']
      },
      
      // 字段约束
      field: {
        uniqueCodes: this.getUniqueFieldCodes(),
        reservedNames: ['id', 'createdAt', 'updatedAt', 'deletedAt']
      },
      
      // 枚举约束
      enum: {
        uniqueCodes: this.getUniqueEnumCodes(),
        reservedNames: ['status', 'type', 'state', 'level']
      },
      
      // 业务规则
      businessRules: [
        '实体名称不能重复',
        '实体代码不能重复',
        '表名不能重复',
        '字段代码在同一实体内不能重复',
        '枚举代码不能重复',
        '关系名称不能重复'
      ]
    };
  }

  /**
   * 获取 AI 响应格式要求
   */
  private getResponseFormat(): ResponseFormat {
    return {
      // 必须使用 JSON 格式
      format: 'JSON',
      
      // 操作类型标识
      operationTypes: [
        'create_entity',      // 创建实体
        'update_entity',      // 修改实体
        'delete_entity',      // 删除实体
        'create_field',       // 创建字段
        'update_field',       // 修改字段
        'delete_field',       // 删除字段
        'create_enum',        // 创建枚举
        'update_enum',        // 修改枚举
        'delete_enum',        // 删除枚举
        'create_relation',    // 创建关系
        'update_relation',    // 修改关系
        'delete_relation',    // 删除关系
        'analysis',           // 分析建议
        'optimization'        // 优化建议
      ],
      
      // 响应结构
      structure: {
        operationType: 'string',  // 操作类型
        data: 'object',           // 操作数据
        description: 'string',    // 操作描述
        impact: 'object',         // 影响分析
        requiresConfirmation: 'boolean'  // 是否需要确认
      },
      
      // 前端处理要求
      frontendRequirements: {
        badgeDisplay: '当检测到 adb-typeorm 或 adb-json 代码块格式的 AI 生成数据时，前端应显示相应的 badge',
        autoApply: '前端应主动应用 AI 的修改',
        confirmationFlow: '需要确认的操作应显示确认对话框',
        errorHandling: '操作失败时应显示错误信息',
        codeBlockFormat: '所有需要前端处理的操作数据必须使用 ```adb-typeorm 或 ```adb-json 代码块格式'
      }
    };
  }

  // 辅助方法
  private getUniqueEntityCodes(): string[] {
    if (!this.currentProject) return [];
    return Object.values(this.currentProject.schema.entities)
      .map(entity => entity.entityInfo.code);
  }

  private getUniqueTableNames(): string[] {
    if (!this.currentProject) return [];
    return Object.values(this.currentProject.schema.entities)
      .map(entity => entity.entityInfo.tableName)
      .filter(Boolean);
  }

  private getUniqueFieldCodes(): string[] {
    if (!this.currentProject) return [];
    const codes: string[] = [];
    Object.values(this.currentProject.schema.entities).forEach(entity => {
      Object.values(entity.fields).forEach(field => {
        if (field.columnInfo.code) {
          codes.push(field.columnInfo.code);
        }
      });
    });
    return codes;
  }

  private getUniqueEnumCodes(): string[] {
    if (!this.currentProject) return [];
    return Object.values(this.currentProject.schema.enums)
      .map(enumDef => enumDef.enumInfo.code);
  }
}

// 类型定义
export interface AIContext {
  adbTypeormSpec: ADBTypeormSpec;
  projectInfo: ProjectInfo;
  entities: EntityInfo[];
  enums: EnumInfo[];
  relations: RelationInfo[];
  constraints: Constraints;
  responseFormat: ResponseFormat;
}

export interface ADBTypeormSpec {
  framework: string;
  version: string;
  description: string;
  features: string[];
  supportedTypes: {
    adbExtend: string[];
    typeormNative: string[];
  };
  decorators: {
    entityInfo: { required: string[]; optional: string[] };
    columnInfo: { required: string[]; optional: string[] };
    enumInfo: { required: string[]; optional: string[] };
  };
  namingConventions: {
    entity: { code: string; tableName: string; label: string };
    field: { code: string; label: string };
    enum: { code: string; label: string };
  };
}

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  databaseType: string;
  entityCount: number;
  enumCount: number;
  relationCount: number;
}

export interface EntityInfo {
  id: string;
  code: string;
  label: string;
  tableName: string;
  description: string;
  status: string;
  isLocked: boolean;
  tags: string[];
  fieldCount: number;
  fields: FieldInfo[];
}

export interface FieldInfo {
  id: string;
  code: string;
  label: string;
  type: string;
  extendType?: string;
  nullable: boolean;
  primary: boolean;
  unique: boolean;
  comment: string;
}

export interface EnumInfo {
  id: string;
  code: string;
  label: string;
  description: string;
  valueCount: number;
  values: Array<{ key: string; value: string }>;
}

export interface RelationInfo {
  id: string;
  type: string;
  name: string;
  inverseName?: string;
  fromEntity: string;
  toEntity: string;
  cascade: boolean;
  onDelete: string;
  onUpdate: string;
}

export interface Constraints {
  entity: {
    uniqueCodes: string[];
    uniqueTableNames: string[];
    reservedNames: string[];
  };
  field: {
    uniqueCodes: string[];
    reservedNames: string[];
  };
  enum: {
    uniqueCodes: string[];
    reservedNames: string[];
  };
  businessRules: string[];
}

export interface ResponseFormat {
  format: string;
  operationTypes: string[];
  structure: {
    operationType: string;
    data: string;
    description: string;
    impact: string;
    requiresConfirmation: string;
  };
  frontendRequirements: {
    badgeDisplay: string;
    autoApply: string;
    confirmationFlow: string;
    errorHandling: string;
  };
}
