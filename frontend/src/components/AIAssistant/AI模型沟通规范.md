# AI模型沟通规范文档

## 概述

本文档定义了AIDatabench项目中与AI模型进行数据交换和交互的规范，确保AI能够准确理解项目结构、执行操作并清晰地向用户反馈结果。

## 1. Function Calling 设计

### 1.1 是否需要 Function Calling

**答案**: 是的，需要 Function Calling

**原因**:
- AI需要执行具体的项目操作（创建实体、修改字段、建立关系等）
- 需要获取项目当前状态和上下文信息
- 需要提供结构化的操作结果供前端处理
- 支持用户确认和选择性应用操作

### 1.2 Function Calling 架构设计

```typescript
// AI可调用的函数定义
interface AIFunctions {
  // 项目信息获取
  getProjectInfo(): ProjectInfo;
  getEntities(): Entity[];
  getEntityById(id: string): Entity | null;
  getFieldsByEntityId(entityId: string): Field[];
  getRelations(): Relation[];
  
  // 实体操作
  createEntity(entityData: EntityData): CreateEntityResult;
  updateEntity(id: string, updates: EntityUpdates): UpdateEntityResult;
  deleteEntity(id: string): DeleteEntityResult;
  
  // 字段操作
  addField(entityId: string, fieldData: FieldData): AddFieldResult;
  updateField(fieldId: string, updates: FieldUpdates): UpdateFieldResult;
  deleteField(fieldId: string): DeleteFieldResult;
  
  // 关系操作
  createRelation(relationData: RelationData): CreateRelationResult;
  updateRelation(id: string, updates: RelationUpdates): UpdateRelationResult;
  deleteRelation(id: string): DeleteRelationResult;
  
  // 分析操作
  analyzeEntityRobustness(entityId: string): AnalysisResult;
  analyzeDatabasePerformance(): PerformanceAnalysisResult;
  generateMigrationScript(changes: Change[]): MigrationScriptResult;
  
  // 用户交互
  showUserChoice(options: UserChoice[]): UserChoiceResult;
  requestConfirmation(message: string, details: ConfirmationDetails): ConfirmationResult;
}
```

### 1.3 Function Calling 实现示例

```typescript
// OpenAI Function Calling 配置
const aiFunctions = {
  getProjectInfo: {
    name: "getProjectInfo",
    description: "获取当前项目的基本信息",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  
  createEntity: {
    name: "createEntity",
    description: "创建新的数据库实体",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "实体名称"
        },
        description: {
          type: "string",
          description: "实体描述"
        },
        fields: {
          type: "array",
          description: "实体字段列表",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              nullable: { type: "boolean" },
              defaultValue: { type: "string" }
            }
          }
        }
      },
      required: ["name", "fields"]
    }
  },
  
  showUserChoice: {
    name: "showUserChoice",
    description: "向用户展示选择项",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "选择标题" },
        options: {
          type: "array",
          description: "选择项列表",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              description: { type: "string" },
              recommended: { type: "boolean" }
            }
          }
        }
      },
      required: ["title", "options"]
    }
  }
};
```

## 2. 项目数据结构描述

### 2.1 项目信息结构

```typescript
interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  databaseType: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
  version: string;
  createdAt: Date;
  updatedAt: Date;
  entities: Entity[];
  relations: Relation[];
  businessRules: BusinessRule[];
  techStack: TechStack;
}

interface Entity {
  id: string;
  name: string;
  description: string;
  tableName: string;
  fields: Field[];
  indexes: Index[];
  createdAt: Date;
  updatedAt: Date;
}

interface Field {
  id: string;
  name: string;
  type: FieldType;
  nullable: boolean;
  defaultValue?: string;
  length?: number;
  precision?: number;
  scale?: number;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTarget?: string;
  constraints: Constraint[];
  description?: string;
}

interface Relation {
  id: string;
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  sourceEntityId: string;
  targetEntityId: string;
  sourceFieldId?: string;
  targetFieldId?: string;
  joinTable?: string;
  cascadeDelete: boolean;
  cascadeUpdate: boolean;
}
```

### 2.2 上下文信息结构

```typescript
interface ProjectContext {
  // 项目基本信息
  project: ProjectInfo;
  
  // 当前操作上下文
  currentOperation: {
    type: OperationType;
    targetEntityId?: string;
    targetFieldId?: string;
    userIntent: string;
  };
  
  // 业务规则
  businessRules: BusinessRule[];
  
  // 技术约束
  technicalConstraints: {
    databaseLimitations: string[];
    performanceRequirements: string[];
    securityRequirements: string[];
  };
  
  // 用户偏好
  userPreferences: {
    namingConvention: 'camelCase' | 'snake_case' | 'PascalCase';
    fieldTypes: FieldTypePreference[];
    relationPatterns: RelationPattern[];
  };
}
```

## 3. 修改反馈机制

### 3.1 修改信息结构

```typescript
interface ModificationInfo {
  // 修改标识
  modificationId: string;
  timestamp: Date;
  
  // 修改类型
  type: 'create' | 'update' | 'delete' | 'analyze';
  
  // 修改目标
  target: {
    entityId?: string;
    fieldId?: string;
    relationId?: string;
    targetType: 'entity' | 'field' | 'relation' | 'project';
  };
  
  // 修改内容
  changes: Change[];
  
  // 影响分析
  impact: ImpactAnalysis;
  
  // 用户确认
  requiresConfirmation: boolean;
  confirmationMessage: string;
}

interface Change {
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

interface ImpactAnalysis {
  // 影响的界面
  affectedUIs: string[];
  
  // 影响的模块
  affectedModules: string[];
  
  // 影响的功能
  affectedFeatures: string[];
  
  // 潜在风险
  risks: Risk[];
  
  // 建议措施
  recommendations: string[];
}
```

### 3.2 修改反馈实现

```typescript
// AI返回的修改信息格式
interface AIResponse {
  // 描述性内容
  description: {
    summary: string;
    details: string;
    reasoning: string;
  };
  
  // 修改数据
  modifications: ModificationInfo[];
  
  // 用户选择项
  userChoices?: UserChoice[];
  
  // 确认请求
  confirmationRequest?: ConfirmationRequest;
  
  // 后续建议
  nextSteps: string[];
}
```

## 4. AI返回内容分类

### 4.1 内容类型定义

```typescript
interface AIResponseContent {
  // 描述性内容 (纯文本，用于显示)
  description: {
    summary: string;           // 操作摘要
    details: string;          // 详细说明
    reasoning: string;        // 决策理由
    warnings?: string[];      // 警告信息
    tips?: string[];         // 使用建议
  };
  
  // 修改数据 (结构化数据，用于执行操作)
  modifications: {
    operations: Operation[];   // 具体操作列表
    metadata: OperationMetadata; // 操作元数据
  };
  
  // 用户交互内容
  interactions: {
    choices?: UserChoice[];           // 用户选择项
    confirmations?: Confirmation[];   // 确认请求
    questions?: Question[];          // 澄清问题
  };
}
```

### 4.2 内容处理流程

```typescript
// 前端处理AI响应的流程
class AIResponseProcessor {
  processResponse(response: AIResponse): ProcessedResponse {
    return {
      // 显示描述性内容
      displayContent: this.extractDescription(response),
      
      // 执行修改操作
      modifications: this.extractModifications(response),
      
      // 处理用户交互
      interactions: this.extractInteractions(response),
      
      // 更新界面状态
      uiUpdates: this.generateUIUpdates(response)
    };
  }
  
  private extractDescription(response: AIResponse): DisplayContent {
    return {
      summary: response.description.summary,
      details: response.description.details,
      reasoning: response.description.reasoning,
      warnings: response.description.warnings || [],
      tips: response.description.tips || []
    };
  }
  
  private extractModifications(response: AIResponse): Modification[] {
    return response.modifications.map(mod => ({
      id: mod.modificationId,
      type: mod.type,
      target: mod.target,
      changes: mod.changes,
      impact: mod.impact,
      requiresConfirmation: mod.requiresConfirmation
    }));
  }
}
```

## 5. 用户选择展示和交互

### 5.1 选择项结构

```typescript
interface UserChoice {
  id: string;
  type: 'single' | 'multiple' | 'range' | 'custom';
  title: string;
  description: string;
  options: ChoiceOption[];
  defaultSelection?: string[];
  required: boolean;
  validation?: ValidationRule[];
}

interface ChoiceOption {
  id: string;
  label: string;
  description: string;
  value: any;
  recommended: boolean;
  disabled?: boolean;
  icon?: string;
  preview?: PreviewData;
}

interface PreviewData {
  type: 'entity' | 'field' | 'relation' | 'code';
  content: any;
  format: 'json' | 'sql' | 'typescript' | 'markdown';
}
```

### 5.2 交互界面设计

```typescript
// 用户选择组件
interface UserChoiceComponent {
  // 选择项展示
  renderChoice(choice: UserChoice): ReactElement;
  
  // 选择处理
  handleSelection(choiceId: string, selectedOptions: string[]): void;
  
  // 预览功能
  showPreview(optionId: string): void;
  
  // 确认提交
  confirmSelection(choiceId: string): void;
  
  // 取消选择
  cancelSelection(choiceId: string): void;
}
```

### 5.3 交互流程实现

```typescript
// 用户选择处理流程
class UserChoiceHandler {
  async handleUserChoice(choice: UserChoice): Promise<ChoiceResult> {
    // 1. 展示选择界面
    const choiceUI = this.renderChoiceInterface(choice);
    
    // 2. 等待用户选择
    const userSelection = await this.waitForUserSelection(choice.id);
    
    // 3. 验证选择
    const validationResult = this.validateSelection(choice, userSelection);
    
    // 4. 处理选择结果
    return this.processSelection(choice, userSelection, validationResult);
  }
  
  private renderChoiceInterface(choice: UserChoice): ReactElement {
    switch (choice.type) {
      case 'single':
        return <SingleChoiceComponent choice={choice} />;
      case 'multiple':
        return <MultipleChoiceComponent choice={choice} />;
      case 'range':
        return <RangeChoiceComponent choice={choice} />;
      case 'custom':
        return <CustomChoiceComponent choice={choice} />;
    }
  }
}
```

## 6. 完整沟通协议

### 6.1 AI请求格式

```typescript
interface AIRequest {
  // 用户输入
  userInput: string;
  
  // 操作类型
  operationType: OperationType;
  
  // 项目上下文
  context: ProjectContext;
  
  // 可用函数
  availableFunctions: string[];
  
  // 用户偏好
  preferences: UserPreferences;
  
  // 历史操作
  operationHistory: OperationHistory[];
}
```

### 6.2 AI响应格式

```typescript
interface AIResponse {
  // 响应ID
  responseId: string;
  
  // 响应类型
  type: 'description' | 'modification' | 'choice' | 'confirmation' | 'error';
  
  // 内容
  content: AIResponseContent;
  
  // 函数调用
  functionCalls?: FunctionCall[];
  
  // 后续建议
  nextSteps: string[];
  
  // 错误信息
  error?: ErrorInfo;
}
```

### 6.3 错误处理

```typescript
interface ErrorInfo {
  code: string;
  message: string;
  details?: string;
  suggestions: string[];
  retryable: boolean;
}

// 错误处理策略
class AIErrorHandler {
  handleError(error: ErrorInfo): ErrorHandlingResult {
    return {
      displayMessage: this.formatErrorMessage(error),
      userActions: this.generateUserActions(error),
      retryOptions: error.retryable ? this.generateRetryOptions(error) : null,
      fallbackOptions: this.generateFallbackOptions(error)
    };
  }
}
```

## 7. 实施建议

### 7.1 开发阶段

1. **阶段1**: 实现基础Function Calling
2. **阶段2**: 完善数据结构定义
3. **阶段3**: 实现修改反馈机制
4. **阶段4**: 开发用户交互界面
5. **阶段5**: 优化错误处理和用户体验

### 7.2 测试策略

- **单元测试**: 测试每个Function Calling的正确性
- **集成测试**: 测试AI与前端的数据交换
- **用户测试**: 测试用户交互的流畅性
- **错误测试**: 测试各种错误场景的处理

### 7.3 性能优化

- **缓存策略**: 缓存项目上下文信息
- **批量操作**: 支持批量Function Calling
- **异步处理**: 非阻塞的AI交互
- **资源管理**: 合理管理AI请求资源

## 总结

这个AI模型沟通规范文档定义了：

1. **Function Calling**: 完整的函数调用架构，支持项目操作和信息获取
2. **数据结构**: 详细的项目信息结构，确保AI准确理解项目状态
3. **修改反馈**: 清晰的修改信息结构，让用户了解所有变更
4. **内容分类**: 区分描述性内容和修改数据，便于前端处理
5. **用户交互**: 丰富的用户选择机制，支持多种交互方式

通过这个规范，AI能够与AIDatabench项目进行高效、准确的数据交换，为用户提供智能化的数据库设计辅助。
