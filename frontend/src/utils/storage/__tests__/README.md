# IndexedDB 存储系统测试文档

## 概述

本测试套件为 AIDatabench 的 IndexedDB 存储系统提供全面的测试覆盖，包括单元测试、集成测试和性能测试。

## 测试结构

```
__tests__/
├── setup.ts              # 测试环境设置
├── testUtils.ts          # 测试工具函数
├── db.test.ts            # IndexedDB 管理器测试
├── storage.test.ts       # 存储服务测试
├── events.test.ts        # 事件系统测试
├── hooks.test.tsx        # React Hooks 测试
├── integration.test.ts   # 集成测试
├── package.json          # 测试配置
├── run-tests.sh          # 测试运行脚本
└── README.md             # 本文档
```

## 测试覆盖范围

### 1. IndexedDB 管理器测试 (`db.test.ts`)

- ✅ 数据库连接管理
- ✅ 数据存储和读取
- ✅ 数据更新和删除
- ✅ 批量操作
- ✅ 错误处理
- ✅ 复杂数据结构支持

### 2. 存储服务测试 (`storage.test.ts`)

- ✅ 服务初始化
- ✅ 项目 CRUD 操作
- ✅ 实体 CRUD 操作
- ✅ AI 模型管理
- ✅ 用户偏好设置
- ✅ 路径操作
- ✅ 数据备份和恢复
- ✅ 搜索功能
- ✅ 统计信息

### 3. 事件系统测试 (`events.test.ts`)

- ✅ 基本事件订阅和触发
- ✅ 路径层次结构事件
- ✅ 数组路径支持
- ✅ 错误处理
- ✅ 清理功能

### 4. React Hooks 测试 (`hooks.test.tsx`)

- ✅ `useStorageData` Hook
- ✅ `useProject` Hook
- ✅ `useActiveProject` Hook
- ✅ 错误处理
- ✅ 订阅和取消订阅

### 5. 集成测试 (`integration.test.ts`)

- ✅ 完整工作流程
- ✅ 并发操作
- ✅ 数据一致性
- ✅ 错误恢复
- ✅ 性能测试

## 运行测试

### 安装依赖

```bash
npm install --save-dev @testing-library/react @testing-library/react-hooks @types/jest fake-indexeddb jest jest-environment-jsdom ts-jest
```

### 运行所有测试

```bash
./run-tests.sh
```

### 运行特定测试

```bash
# 数据库测试
./run-tests.sh db

# 存储服务测试
./run-tests.sh storage

# 事件系统测试
./run-tests.sh events

# React Hooks 测试
./run-tests.sh hooks

# 集成测试
./run-tests.sh integration
```

### 其他选项

```bash
# 监视模式
./run-tests.sh watch

# 覆盖率分析
./run-tests.sh coverage
```

## 测试工具

### 测试工具函数 (`testUtils.ts`)

- `createTestProject()` - 创建测试项目
- `createTestEntity()` - 创建测试实体
- `createTestAIModel()` - 创建测试 AI 模型
- `createTestPreferences()` - 创建测试用户偏好
- `waitForAsync()` - 等待异步操作
- `waitForCondition()` - 等待条件满足
- `simulateUserDelay()` - 模拟用户操作延迟

### 测试环境设置 (`setup.ts`)

- IndexedDB 模拟 (`fake-indexeddb`)
- BroadcastChannel API 模拟
- 全局测试工具函数
- 自动清理机制

## 测试数据

所有测试都使用模拟数据，确保测试的独立性和可重复性：

- 每个测试前自动清理数据库
- 使用时间戳确保唯一性
- 模拟真实的数据结构

## 性能基准

集成测试包含性能测试，提供以下基准：

- 保存 100 个项目：< 1000ms
- 搜索操作：< 100ms
- 并发操作：支持 10+ 并发写入

## 错误处理测试

测试覆盖以下错误场景：

- 数据库连接失败
- 数据写入失败
- 网络中断恢复
- 并发冲突处理
- 内存不足情况

## 持续集成

测试套件设计为支持 CI/CD 环境：

- 无外部依赖
- 快速执行（< 30 秒）
- 清晰的错误报告
- 覆盖率报告

## 调试测试

### 启用详细日志

```bash
DEBUG=* npm test
```

### 调试特定测试

```bash
npx jest --testNamePattern="特定测试名称"
```

### 查看覆盖率报告

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 贡献指南

### 添加新测试

1. 在相应的测试文件中添加测试用例
2. 使用 `describe` 和 `test` 组织测试
3. 确保测试的独立性和可重复性
4. 添加适当的断言和错误处理

### 测试命名规范

- 测试文件：`*.test.ts` 或 `*.test.tsx`
- 测试套件：使用 `describe` 描述功能模块
- 测试用例：使用 `test` 或 `it` 描述具体场景
- 使用中文描述，便于理解

### 测试最佳实践

- 每个测试只验证一个功能点
- 使用描述性的测试名称
- 测试正常流程和异常流程
- 清理测试数据
- 使用模拟数据避免外部依赖

## 故障排除

### 常见问题

1. **IndexedDB 不可用**
   - 确保在支持 IndexedDB 的环境中运行
   - 检查浏览器兼容性

2. **测试超时**
   - 增加 `testTimeout` 配置
   - 检查异步操作是否正确等待

3. **内存泄漏**
   - 确保正确清理订阅和事件监听器
   - 使用 `afterEach` 清理资源

### 调试技巧

- 使用 `console.log` 输出调试信息
- 使用 `jest.fn()` 创建 spy 函数
- 使用 `waitFor` 等待异步操作完成
- 使用 `act` 包装 React 状态更新
