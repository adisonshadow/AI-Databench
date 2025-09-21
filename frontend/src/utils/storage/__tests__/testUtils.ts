// 测试工具函数
import type { Project, Entity, AIModelConfig, UserPreferences } from '../types';

/**
 * 创建测试项目
 */
export function createTestProject(overrides: Partial<Project> = {}): Project {
  const id = overrides.id || `test-project-${Date.now()}`;
  return {
    id,
    name: '测试项目',
    description: '这是一个测试项目',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schema: {
      entities: {},
      relations: []
    },
    ...overrides
  };
}

/**
 * 创建测试实体
 */
export function createTestEntity(overrides: Partial<Entity> = {}): Entity {
  const id = overrides.id || `test-entity-${Date.now()}`;
  return {
    id,
    name: '测试实体',
    tableName: 'test_entity',
    comment: '这是一个测试实体',
    status: 'active',
    isLocked: false,
    fields: {},
    indexes: [],
    settings: {
      timestamps: true,
      softDelete: false,
      validation: true
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      tags: []
    },
    ...overrides
  };
}

/**
 * 创建测试 AI 模型配置
 */
export function createTestAIModel(overrides: Partial<AIModelConfig> = {}): AIModelConfig {
  const id = overrides.id || `test-ai-model-${Date.now()}`;
  return {
    id,
    name: '测试 AI 模型',
    provider: 'openai',
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo'
    },
    ...overrides
  };
}

/**
 * 创建测试用户偏好设置
 */
export function createTestPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    ui: {
      sidebarCollapsed: false,
      panelSizes: {
        sidebar: 250,
        main: 800,
        properties: 300
      },
      recentProjects: [],
      favoriteEntities: []
    },
    editor: {
      theme: 'vs-dark',
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      autoSave: true
    },
    graph: {
      layout: 'force',
      showMinimap: true,
      autoLayout: true,
      nodeStyle: 'detailed'
    },
    codeGen: {
      language: 'typescript',
      framework: 'typeorm',
      naming: 'camelCase',
      includeComments: true,
      includeValidation: true
    },
    ...overrides
  };
}

/**
 * 等待异步操作完成
 */
export async function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待条件满足
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await waitForAsync(interval);
  }
  
  throw new Error(`条件在 ${timeout}ms 内未满足`);
}

/**
 * 模拟用户操作延迟
 */
export async function simulateUserDelay(): Promise<void> {
  await waitForAsync(Math.random() * 100 + 50);
}
