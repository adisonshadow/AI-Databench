# AI 助手功能集成指南

## 概述

本指南介绍如何在 AIDatabench 项目中集成和使用 AI 助手功能，包括上下文提供、响应处理、Badge 显示等核心功能。

## 核心组件

### 1. AIContextProvider
负责向 AI 模型提供完整的项目上下文信息。

```typescript
import { AIContextProvider } from './utils/AIContextProvider';

const contextProvider = new AIContextProvider();
const context = contextProvider.getAIContext();
```

### 2. AIResponseProcessor
处理 AI 返回的 JSON 数据，识别操作类型并生成 Badge。

```typescript
import { AIResponseProcessor } from './utils/AIResponseProcessor';

const processor = new AIResponseProcessor();
const result = await processor.processAIResponse(aiResponse);
```

### 3. AIContextGenerator
生成发送给 AI 的完整上下文提示词。

```typescript
import { AIContextGenerator } from './utils/AIContextGenerator';

const generator = new AIContextGenerator();
const prompt = generator.generateContextPrompt(userInput);
```

### 4. AIAssistantIntegration
提供完整的 AI 助手功能集成。

```typescript
import { AIAssistantIntegration } from './utils/AIAssistantIntegration';

const integration = new AIAssistantIntegration();
const prompt = integration.generateAIPrompt(userInput);
const result = await integration.processAIResponse(aiResponse);
```

## 使用方法

### 1. 基本集成

```typescript
import React, { useState } from 'react';
import { AIAssistantIntegration } from './utils/AIAssistantIntegration';
import AIBadge from './AIBadge';

const AIChatComponent: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [badges, setBadges] = useState<AIBadge[]>([]);
  
  const integration = new AIAssistantIntegration();

  const handleSendMessage = async () => {
    // 生成 AI 提示词
    const prompt = integration.generateAIPrompt(userInput);
    
    // 发送给 AI 模型（这里需要实际的 AI API 调用）
    const response = await sendToAI(prompt);
    
    // 处理 AI 响应
    const result = await integration.processAIResponse(response);
    
    setAiResponse(result.content);
    setBadges(result.badges);
  };

  return (
    <div>
      <div className="ai-badges">
        {badges.map((badge, index) => (
          <AIBadge key={index} {...badge} />
        ))}
      </div>
      <div className="ai-response">
        {aiResponse}
      </div>
    </div>
  );
};
```

### 2. 上下文信息使用

```typescript
// 获取完整上下文
const context = integration.contextGenerator['contextProvider'].getAIContext();

// 获取项目信息
console.log('项目名称:', context.projectInfo.name);
console.log('实体数量:', context.projectInfo.entityCount);

// 获取现有实体
context.entities.forEach(entity => {
  console.log('实体:', entity.label, '代码:', entity.code);
});

// 获取约束信息
console.log('已使用的实体代码:', context.constraints.entity.uniqueCodes);
```

### 3. 响应处理

```typescript
const handleAIResponse = async (response: string) => {
  const result = await integration.processAIResponse(response);
  
  switch (result.type) {
    case 'operation':
      // 显示操作 Badge
      setBadges(result.badges);
      
      // 如果需要确认，显示确认对话框
      if (result.requiresConfirmation) {
        showConfirmationDialog(result.operationData);
      } else {
        // 自动应用操作
        applyOperation(result.operationData);
      }
      break;
      
    case 'text':
      // 普通文本响应
      setAiResponse(result.content);
      break;
      
    case 'error':
      // 错误处理
      console.error('AI 响应处理失败:', result.error);
      break;
  }
};
```

## AI 响应格式

### 标准响应格式

```json
{
  "operationType": "create_entity",
  "data": {
    "entityInfo": {
      "id": "entity-user-001",
      "code": "user:admin:system",
      "label": "系统用户",
      "description": "系统用户信息管理实体",
      "tags": ["user", "admin", "auth"]
    },
    "fields": [
      {
        "columnInfo": {
          "id": "field_username_001",
          "label": "用户名"
        },
        "typeormConfig": {
          "type": "varchar",
          "length": 50,
          "nullable": false,
          "unique": true
        }
      }
    ]
  },
  "description": "创建了一个新的用户实体",
  "impact": {
    "level": "medium",
    "description": "创建新实体将影响数据库结构"
  },
  "requiresConfirmation": true
}
```

### 支持的操作类型

- `create_entity` - 创建实体
- `update_entity` - 修改实体
- `delete_entity` - 删除实体
- `create_field` - 创建字段
- `update_field` - 修改字段
- `delete_field` - 删除字段
- `create_enum` - 创建枚举
- `update_enum` - 修改枚举
- `delete_enum` - 删除枚举
- `create_relation` - 创建关系
- `update_relation` - 修改关系
- `delete_relation` - 删除关系
- `analysis` - 分析建议
- `optimization` - 优化建议

## Badge 显示

### Badge 类型

- `success` - 成功操作（绿色）
- `warning` - 警告操作（黄色）
- `error` - 错误操作（红色）
- `info` - 信息提示（蓝色）

### Badge 组件使用

```typescript
import AIBadge from './AIBadge';

<AIBadge
  type="success"
  text="新建实体"
  color="#52c41a"
  icon="plus-circle"
  onClick={() => handleBadgeClick()}
/>
```

## 错误处理

### 常见错误类型

1. **JSON 解析错误**
   - 原因：AI 返回的不是有效的 JSON 格式
   - 解决：检查 AI 响应格式，确保使用正确的 JSON 结构

2. **操作类型错误**
   - 原因：操作类型不在支持列表中
   - 解决：使用支持的操作类型

3. **数据格式错误**
   - 原因：操作数据不符合 ADB TypeORM 规范
   - 解决：检查数据格式，确保符合规范要求

4. **重复标识错误**
   - 原因：实体代码、表名或字段名重复
   - 解决：使用唯一的标识符

### 错误处理示例

```typescript
const handleError = (error: string) => {
  const suggestions = integration.generateErrorHandlingSuggestions(error);
  
  // 显示错误信息和解决建议
  showErrorMessage(error, suggestions);
};
```

## 最佳实践

### 1. 上下文管理
- 定期更新项目上下文信息
- 确保上下文信息的准确性和完整性
- 在项目结构变化时及时刷新上下文

### 2. 响应处理
- 始终验证 AI 响应的格式
- 对需要确认的操作显示确认对话框
- 提供清晰的操作反馈

### 3. 错误处理
- 提供友好的错误信息
- 给出具体的解决建议
- 记录错误日志便于调试

### 4. 用户体验
- 使用 Badge 清晰显示操作类型
- 提供操作进度反馈
- 支持操作撤销和重做

## 扩展功能

### 1. 自定义操作类型
可以通过扩展 `AIOperationType` 类型来支持新的操作类型。

### 2. 自定义 Badge
可以通过扩展 `AIBadge` 组件来支持新的 Badge 类型。

### 3. 自定义上下文
可以通过扩展 `AIContextProvider` 来提供更多的上下文信息。

## 注意事项

1. **数据安全**：确保敏感信息不会泄露给 AI 模型
2. **性能优化**：避免频繁的上下文更新
3. **错误恢复**：提供完善的错误恢复机制
4. **用户控制**：确保用户对 AI 操作有完全的控制权

## 更新日志

- v1.0.0 - 初始版本，支持基本的 AI 助手功能
- v1.1.0 - 添加 Badge 显示和错误处理
- v1.2.0 - 完善上下文管理和响应处理
