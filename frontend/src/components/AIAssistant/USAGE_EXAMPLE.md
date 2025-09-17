# AI 助手使用示例

## 功能概述

现在 AI 助手已经集成了完整的 ADB TypeORM 上下文和自动应用功能。当您发送消息时，AI 会：

1. **自动获取项目上下文**：包括现有实体、枚举、关系等信息
2. **遵循 ADB TypeORM 规范**：生成符合规范的实体代码
3. **返回结构化数据**：JSON 格式的操作数据
4. **自动应用操作**：创建实体并保存到项目
5. **显示操作 Badge**：在对话中高亮显示操作类型

## 使用示例

### 示例 1：创建订单相关实体

**用户输入：**
```
新建订单相关实体
```

**AI 响应：**
```json
{
  "operationType": "create_entity",
  "data": {
    "entityInfo": {
      "id": "entity-order-001",
      "code": "sales:order",
      "label": "订单",
      "description": "销售订单信息管理实体",
      "tags": ["order", "sales", "business"]
    },
    "fields": [
      {
        "columnInfo": {
          "id": "field_order_id_001",
          "label": "订单ID"
        },
        "typeormConfig": {
          "type": "varchar",
          "length": 50,
          "nullable": false,
          "unique": true,
          "primary": true
        }
      },
      {
        "columnInfo": {
          "id": "field_customer_name_001",
          "label": "客户名称"
        },
        "typeormConfig": {
          "type": "varchar",
          "length": 100,
          "nullable": false
        }
      },
      {
        "columnInfo": {
          "id": "field_order_amount_001",
          "label": "订单金额"
        },
        "typeormConfig": {
          "type": "decimal",
          "precision": 10,
          "scale": 2,
          "nullable": false
        }
      }
    ]
  },
  "description": "创建了一个新的订单实体",
  "impact": {
    "level": "medium",
    "description": "创建新实体将影响数据库结构"
  },
  "requiresConfirmation": false
}
```

**前端处理：**
1. 检测到 JSON 格式的 AI 响应
2. 解析操作类型为 `create_entity`
3. 显示 Badge：`新建实体` (绿色)
4. 自动创建实体并保存到项目
5. 显示成功消息：`✅ 已成功创建实体 "订单" (sales:order)`

### 示例 2：创建用户实体

**用户输入：**
```
创建一个用户实体，包含用户名、邮箱、密码等字段
```

**AI 响应：**
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
      },
      {
        "columnInfo": {
          "id": "field_email_001",
          "label": "邮箱地址"
        },
        "typeormConfig": {
          "type": "varchar",
          "length": 100,
          "nullable": false,
          "unique": true
        }
      },
      {
        "columnInfo": {
          "id": "field_password_001",
          "label": "密码"
        },
        "typeormConfig": {
          "type": "varchar",
          "length": 255,
          "nullable": false
        }
      }
    ]
  },
  "description": "创建了一个新的用户实体",
  "impact": {
    "level": "medium",
    "description": "创建新实体将影响数据库结构"
  },
  "requiresConfirmation": false
}
```

**前端处理：**
1. 显示 Badge：`新建实体` (绿色)
2. 自动创建用户实体
3. 显示成功消息：`✅ 已成功创建实体 "系统用户" (user:admin:system)`

## Badge 类型说明

### 操作类型 Badge
- **新建实体** (绿色) - `create_entity`
- **修改实体** (黄色) - `update_entity`
- **删除实体** (红色) - `delete_entity`
- **新建字段** (绿色) - `create_field`
- **修改字段** (黄色) - `update_field`
- **删除字段** (红色) - `delete_field`
- **新建枚举** (绿色) - `create_enum`
- **新建关系** (绿色) - `create_relation`

### 状态 Badge
- **需要确认** (黄色) - 操作需要用户确认
- **高影响** (红色) - 操作对项目影响较大
- **中等影响** (黄色) - 操作对项目影响中等

## 代码块显示

当 AI 返回实体代码时，会以代码块的形式显示：

```typescript
// ADB TypeORM 实体代码
@Entity("sales_order")
@EntityInfo({
  id: "entity-order-001",
  code: "sales:order",
  label: "订单",
  description: "销售订单信息管理实体",
  tags: ["order", "sales", "business"]
})
export class Order {
  @PrimaryColumn({ type: "varchar", length: 50 })
  @ColumnInfo({
    id: "field_order_id_001",
    label: "订单ID"
  })
  id!: string;

  @Column({ type: "varchar", length: 100 })
  @ColumnInfo({
    id: "field_customer_name_001",
    label: "客户名称"
  })
  customerName!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  @ColumnInfo({
    id: "field_order_amount_001",
    label: "订单金额"
  })
  orderAmount!: number;
}
```

## 上下文信息

AI 会自动获取以下项目上下文：

1. **项目基本信息**：名称、描述、数据库类型
2. **现有实体**：所有实体的代码、标签、字段信息
3. **现有枚举**：所有枚举的代码和值
4. **现有关系**：实体间的关系信息
5. **约束规则**：唯一性约束、命名规范等

## 错误处理

如果 AI 响应处理失败，会显示错误 Badge：

- **解析失败** (红色) - JSON 解析错误
- **创建失败** (红色) - 实体创建失败
- **操作失败** (红色) - 其他操作失败

## 注意事项

1. **实体代码唯一性**：AI 会检查现有实体代码，避免重复
2. **表名唯一性**：AI 会检查现有表名，避免重复
3. **字段代码唯一性**：在同一实体内，字段代码必须唯一
4. **自动保存**：创建的实体会自动保存到当前项目
5. **实时更新**：实体创建后，项目数据会实时更新

## 扩展功能

未来可以扩展的功能：

1. **批量操作**：支持一次创建多个实体
2. **关系创建**：自动创建实体间的关系
3. **枚举创建**：创建 ADB 增强枚举
4. **代码生成**：生成完整的 TypeScript 代码
5. **迁移脚本**：生成数据库迁移脚本
