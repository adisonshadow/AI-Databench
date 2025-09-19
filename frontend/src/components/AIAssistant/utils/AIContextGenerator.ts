import { AIContextProvider } from './AIContextProvider';
import type { AIContext } from './AIContextProvider';

/**
 * AI 上下文生成器
 * 负责生成发送给 AI 模型的完整上下文信息
 */
export class AIContextGenerator {
  private contextProvider: AIContextProvider;

  constructor() {
    this.contextProvider = new AIContextProvider();
  }

  /**
   * 生成完整的 AI 上下文提示词
   */
  public generateContextPrompt(userInput: string): string {
    const context = this.contextProvider.getAIContext();
    
    return `
# AI 数据库设计助手上下文

## 项目基本信息
- 项目名称: ${context.projectInfo.name}
- 项目描述: ${context.projectInfo.description}
- 数据库类型: ${context.projectInfo.databaseType}
- 实体数量: ${context.projectInfo.entityCount}
- 枚举数量: ${context.projectInfo.enumCount}
- 关系数量: ${context.projectInfo.relationCount}

## ADB TypeORM 设计规范

### 框架信息
- 框架: ${context.adbTypeormSpec.framework}
- 版本: ${context.adbTypeormSpec.version}
- 描述: ${context.adbTypeormSpec.description}

### AI 操作返回格式规范
**重要：所有AI操作必须使用统一的数据结构格式：**
\`\`\`json
{
  "operationType": "create_entity|create_field|update_field|delete_field|create_enum|update_enum|delete_enum|create_relation|update_relation|delete_relation",
  "data": {
    // 具体的数据内容，根据operationType而定
  },
  "description": "操作描述",
  "impact": {
    "level": "low|medium|high",
    "description": "影响描述"
  },
  "requiresConfirmation": true|false
}
\`\`\`

**注意：**
- 必须使用 \`data\` 字段，不要使用 \`entityData\`、\`fieldData\`、\`enumData\`、\`relationData\` 等字段
- \`operationType\` 已经可以判断数据类型，无需额外的字段名区分
- 所有操作数据都放在 \`data\` 字段中

### 核心特性
${context.adbTypeormSpec.features.map(feature => `- ${feature}`).join('\n')}

### 支持的扩展类型
**ADB 扩展类型:**
${context.adbTypeormSpec.supportedTypes.adbExtend.map(type => `- ${type}`).join('\n')}

**TypeORM 原生类型:**
${context.adbTypeormSpec.supportedTypes.typeormNative.map(type => `- ${type}`).join('\n')}

### 装饰器规范
**@EntityInfo 装饰器:**
- 必需字段: ${context.adbTypeormSpec.decorators.entityInfo.required.join(', ')}
- 可选字段: ${context.adbTypeormSpec.decorators.entityInfo.optional.join(', ')}

**@ColumnInfo 装饰器:**
- 必需字段: ${context.adbTypeormSpec.decorators.columnInfo.required.join(', ')}
- 可选字段: ${context.adbTypeormSpec.decorators.columnInfo.optional.join(', ')}

**@EnumInfo 装饰器:**
- 必需字段: ${context.adbTypeormSpec.decorators.enumInfo.required.join(', ')}
- 可选字段: ${context.adbTypeormSpec.decorators.enumInfo.optional.join(', ')}

### 命名规范
**实体命名:**
- 代码格式: ${context.adbTypeormSpec.namingConventions.entity.code}
- 表名格式: ${context.adbTypeormSpec.namingConventions.entity.tableName}
- 标签格式: ${context.adbTypeormSpec.namingConventions.entity.label}

**字段命名:**
- 代码格式: ${context.adbTypeormSpec.namingConventions.field.code}
- 标签格式: ${context.adbTypeormSpec.namingConventions.field.label}

**枚举命名:**
- 代码格式: ${context.adbTypeormSpec.namingConventions.enum.code}
- 标签格式: ${context.adbTypeormSpec.namingConventions.enum.label}

## 当前项目数据

### 现有实体
${this.generateEntitiesSection(context.entities)}

### 现有枚举
${this.generateEnumsSection(context.enums)}

### 现有关系
${this.generateRelationsSection(context.relations)}

## 约束和规则

### 唯一性约束
**实体约束:**
- 已使用的实体代码: ${context.constraints.entity.uniqueCodes.join(', ') || '无'}
- 已使用的表名: ${context.constraints.entity.uniqueTableNames.join(', ') || '无'}
- 保留名称: ${context.constraints.entity.reservedNames.join(', ')}

**字段约束:**
- 已使用的字段代码: ${context.constraints.field.uniqueCodes.join(', ') || '无'}
- 保留名称: ${context.constraints.field.reservedNames.join(', ')}

**枚举约束:**
- 已使用的枚举代码: ${context.constraints.enum.uniqueCodes.join(', ') || '无'}
- 保留名称: ${context.constraints.enum.reservedNames.join(', ')}

### 业务规则
${context.constraints.businessRules.map(rule => `- ${rule}`).join('\n')}

## AI 响应格式要求

### ⚠️ 重要：操作数据代码块格式要求
**只有需要前端处理的操作数据才必须使用代码块格式，描述性内容可以正常返回文本。**

#### 1. 操作数据格式（必须使用代码块）
**所有需要前端处理的操作数据必须严格按照以下格式返回：**

\`\`\`adb-typeorm
{
  "operationType": "create_entity",
  "entityData": {
    "code": "entity:code",
    "label": "实体名称",
    "tableName": "table_name",
    "description": "实体描述",
    "fields": [
      {
        "code": "field_code",
        "label": "字段名称",
        "type": "varchar|int|datetime|adb-snowflake-id|adb-auto-increment-id|adb-guid-id|adb-enum",
        "length": 50,
        "nullable": false,
        "isPrimary": false,
        "default": "默认值",
        "comment": "字段注释"
      }
    ]
  },
  "description": "操作描述",
  "impact": {
    "database": "数据库影响说明",
    "schema": "结构影响说明"
  },
  "requiresConfirmation": true
}
\`\`\`

**重要：必须严格按照上述格式，字段结构不能变化！**

#### 2. 描述性内容格式（正常文本）
**描述性内容可以正常返回文本，不需要代码块：**

例如：
- 操作说明：可以直接用文本描述
- 影响分析：可以直接用文本说明
- 建议：可以直接用文本提供建议

#### 3. 操作类型
支持的操作类型: ${context.responseFormat.operationTypes.join(', ')}

#### 4. 前端处理要求
- 当检测到 adb-typeorm 或 adb-json 代码块格式的 AI 生成数据时，前端应显示相应的 badge
- 前端应主动应用 AI 的修改
- 需要确认的操作应显示确认对话框
- 操作失败时应显示错误信息
- **只有操作数据需要使用代码块，描述性内容可以正常返回文本**

## 用户请求
${userInput}

## ⚠️ 重要提醒
**请严格按照以下要求响应：**

1. **操作数据必须使用代码块** - 使用 \`\`\`adb-typeorm\`\`\` 代码块
2. **数据结构必须严格按照上述格式** - 不能改变字段名称和结构
3. **字段数组中的每个字段必须包含**：
   - code: 字段代码
   - label: 字段标签
   - type: 字段类型
   - nullable: 是否可空
   - isPrimary: 是否主键
   - comment: 字段注释
4. **描述性内容可以正常返回文本** - 不需要代码块包装
5. **先提供文本说明，再提供操作数据代码块**
6. **禁止使用其他字段名称如 name、columnInfo 等**

请根据以上上下文信息，按照 ADB TypeORM 规范生成相应的操作数据。
`;
  }

  /**
   * 生成实体部分
   */
  private generateEntitiesSection(entities: any[]): string {
    if (entities.length === 0) {
      return '暂无实体';
    }

    return entities.map(entity => `
**${entity.label} (${entity.code})**
- 表名: ${entity.tableName}
- 状态: ${entity.status}
- 字段数量: ${entity.fieldCount}
- 描述: ${entity.description}
- 标签: ${entity.tags.join(', ') || '无'}
- 字段列表:
${entity.fields.map((field: any) => `  - ${field.label} (${field.code}): ${field.type}${field.extendType ? ` [${field.extendType}]` : ''}${field.nullable ? ' (可空)' : ''}${field.primary ? ' (主键)' : ''}${field.unique ? ' (唯一)' : ''}`).join('\n')}
`).join('\n');
  }

  /**
   * 生成枚举部分
   */
  private generateEnumsSection(enums: any[]): string {
    if (enums.length === 0) {
      return '暂无枚举';
    }

    return enums.map(enumDef => `
**${enumDef.label} (${enumDef.code})**
- 描述: ${enumDef.description}
- 值数量: ${enumDef.valueCount}
- 值列表:
${enumDef.values.map((value: any) => `  - ${value.key}: ${value.value}`).join('\n')}
`).join('\n');
  }

  /**
   * 生成关系部分
   */
  private generateRelationsSection(relations: any[]): string {
    if (relations.length === 0) {
      return '暂无关系';
    }

    return relations.map(relation => `
**${relation.name}**
- 类型: ${relation.type}
- 从: ${relation.fromEntity}
- 到: ${relation.toEntity}
- 级联: ${relation.cascade ? '是' : '否'}
- 删除策略: ${relation.onDelete}
- 更新策略: ${relation.onUpdate}
`).join('\n');
  }

  /**
   * 生成简化的上下文（用于快速操作）
   */
  public generateSimplifiedContext(userInput: string): string {
    const context = this.contextProvider.getAIContext();
    
    return `
# 快速 AI 操作上下文

## 项目: ${context.projectInfo.name}
- 实体: ${context.projectInfo.entityCount} 个
- 枚举: ${context.projectInfo.enumCount} 个
- 关系: ${context.projectInfo.relationCount} 个

## ADB TypeORM 规范
- 实体代码格式: user:admin:super
- 表名格式: user_admin_super
- 字段代码格式: user_name
- 支持扩展类型: adb-media, adb-enum, adb-auto-increment-id, adb-guid-id, adb-snowflake-id

## 现有实体代码
${context.constraints.entity.uniqueCodes.join(', ') || '无'}

## 现有枚举代码
${context.constraints.enum.uniqueCodes.join(', ') || '无'}

## 用户请求
${userInput}

## 请返回 JSON 格式的操作数据，包含 operationType 和 data 字段。
`;
  }

  /**
   * 生成特定操作的上下文
   */
  public generateOperationContext(operationType: string, userInput: string): string {
    const context = this.contextProvider.getAIContext();
    
    let operationContext = '';
    
    switch (operationType) {
      case 'create_entity':
        operationContext = this.generateCreateEntityContext(context, userInput);
        break;
      case 'create_field':
        operationContext = this.generateCreateFieldContext(context, userInput);
        break;
      case 'create_enum':
        operationContext = this.generateCreateEnumContext(context, userInput);
        break;
      case 'analysis':
        operationContext = this.generateAnalysisContext(context, userInput);
        break;
      default:
        operationContext = this.generateSimplifiedContext(userInput);
    }

    return operationContext;
  }

  private generateCreateEntityContext(context: AIContext, userInput: string): string {
    return `
# 创建实体上下文

## ADB TypeORM 实体创建规范
- 实体代码格式: user:admin:super (多级结构，用冒号分隔)
- 表名格式: user_admin_super (下划线分隔的小写)
- 标签格式: 超级管理员用户 (中文显示名称)

## 必需字段
- id: 实体唯一标识
- code: 唯一识别码
- label: 显示名称

## 可选字段
- description: 实体描述
- tags: 标签数组
- status: 状态 (enabled/disabled/archived)
- isLocked: 是否锁定
- tableName: 数据表名
- comment: 实体注释

## 现有实体代码 (避免重复)
${context.constraints.entity.uniqueCodes.join(', ') || '无'}

## 现有表名 (避免重复)
${context.constraints.entity.uniqueTableNames.join(', ') || '无'}

## 保留名称 (避免使用)
${context.constraints.entity.reservedNames.join(', ')}

## 用户请求
${userInput}

## 请返回 JSON 格式的实体创建数据。
`;
  }

  private generateCreateFieldContext(context: AIContext, userInput: string): string {
    return `
# 创建字段上下文

## ADB TypeORM 字段创建规范
- 字段代码格式: user_name (下划线分隔的小写)
- 标签格式: 用户名 (中文显示名称)

## 必需字段
- id: 字段唯一标识
- label: 字段显示名称

## 可选字段
- code: 字段标识码
- extendType: 扩展类型 (adb-media, adb-enum, adb-auto-increment-id, adb-guid-id, adb-snowflake-id)
- comment: 字段注释
- status: 状态
- orderIndex: 排序索引

## TypeORM 配置
- type: 字段类型 (varchar, int, boolean, json, text, decimal, date, datetime, timestamp, blob, enum)
- length: 字段长度
- nullable: 是否可为空
- unique: 是否唯一
- default: 默认值
- primary: 是否为主键
- generated: 是否自动生成

## 现有字段代码 (避免重复)
${context.constraints.field.uniqueCodes.join(', ') || '无'}

## 保留名称 (避免使用)
${context.constraints.field.reservedNames.join(', ')}

## 用户请求
${userInput}

## 请返回 JSON 格式的字段创建数据。
`;
  }

  private generateCreateEnumContext(context: AIContext, userInput: string): string {
    return `
# 创建枚举上下文

## ADB TypeORM 枚举创建规范
- 枚举代码格式: order:status (冒号分隔的结构)
- 标签格式: 订单状态 (中文显示名称)

## 必需字段
- id: 枚举唯一标识
- code: 唯一识别码
- label: 枚举显示名称

## 可选字段
- description: 枚举描述

## 枚举值结构
\`\`\`json
{
  "values": {
    "PENDING_PAYMENT": "pending_payment",
    "PAID": "paid",
    "PROCESSING": "processing"
  },
  "items": {
    "PENDING_PAYMENT": {
      "label": "待支付",
      "icon": "clock-circle",
      "color": "#faad14",
      "sort": 1
    }
  }
}
\`\`\`

## 现有枚举代码 (避免重复)
${context.constraints.enum.uniqueCodes.join(', ') || '无'}

## 保留名称 (避免使用)
${context.constraints.enum.reservedNames.join(', ')}

## 用户请求
${userInput}

## 请返回 JSON 格式的枚举创建数据。
`;
  }

  private generateAnalysisContext(context: AIContext, userInput: string): string {
    return `
# 分析上下文

## 项目分析维度
1. 数据完整性分析
2. 性能优化建议
3. 安全性评估
4. 可扩展性分析
5. 最佳实践建议

## 当前项目状态
- 实体数量: ${context.projectInfo.entityCount}
- 枚举数量: ${context.projectInfo.enumCount}
- 关系数量: ${context.projectInfo.relationCount}

## 用户请求
${userInput}

## 请返回 JSON 格式的分析结果，包含分析维度和具体建议。
`;
  }
}
