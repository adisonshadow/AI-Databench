// src/utils/storage/index.ts
import { DataStore } from './store';
import type { 
  AIDatabenchStorage, 
  Project, 
  Entity, 
  AIModelConfig,
  UserPreferences,
  DataChangeEvent,
  Path
} from './types';

// 创建单例实例
const dataStore = new DataStore();

/**
 * IndexedDB 存储服务
 * 提供完整的本地数据存储、读取、订阅功能
 */
export class StorageService {
  /**
   * 初始化存储
   */
  static async initialize(): Promise<void> {
    return dataStore.initialize();
  }

  /**
   * 获取完整数据
   */
  static async getData(): Promise<AIDatabenchStorage> {
    return dataStore.getFullData();
  }

  /**
   * 获取特定路径的数据
   */
  static async getPath<T = any>(path: Path): Promise<T | undefined> {
    return dataStore.getPath<T>(path);
  }

  /**
   * 设置特定路径的数据
   */
  static async setPath<T = any>(path: Path, value: T): Promise<void> {
    return dataStore.setPath<T>(path, value);
  }

  /**
   * 保存数据
   */
  static async saveData(data: Partial<AIDatabenchStorage>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await dataStore.set(key as keyof AIDatabenchStorage, value);
    }
  }

  /**
   * 项目相关操作
   */
  static async getProject(id: string): Promise<Project | null> {
    return dataStore.getProject(id);
  }

  static async saveProject(project: Project): Promise<void> {
    return dataStore.saveProject(project);
  }

  static async deleteProject(id: string): Promise<void> {
    return dataStore.deleteProject(id);
  }

  static async listProjects(): Promise<Project[]> {
    return dataStore.listProjects();
  }

  static async setActiveProject(id: string | null): Promise<void> {
    return dataStore.setActiveProject(id);
  }

  static async getActiveProject(): Promise<Project | null> {
    return dataStore.getActiveProject();
  }

  /**
   * 实体相关操作
   */
  static async getEntity(projectId: string, entityId: string): Promise<Entity | null> {
    return dataStore.getEntity(projectId, entityId);
  }

  static async saveEntity(projectId: string, entity: Entity): Promise<void> {
    return dataStore.saveEntity(projectId, entity);
  }

  static async deleteEntity(projectId: string, entityId: string): Promise<void> {
    return dataStore.deleteEntity(projectId, entityId);
  }

  /**
   * AI模型配置相关操作
   */
  static async getAIModel(id: string): Promise<AIModelConfig | null> {
    return dataStore.getAIModel(id);
  }

  static async saveAIModel(config: AIModelConfig): Promise<void> {
    return dataStore.saveAIModel(config);
  }

  static async deleteAIModel(id: string): Promise<void> {
    return dataStore.deleteAIModel(id);
  }

  static async listAIModels(): Promise<AIModelConfig[]> {
    return dataStore.listAIModels();
  }

  static async setActiveAIModel(id: string | null): Promise<void> {
    return dataStore.setActiveAIModel(id);
  }

  static async getActiveAIModel(): Promise<AIModelConfig | null> {
    return dataStore.getActiveAIModel();
  }

  /**
   * 用户偏好设置
   */
  static async getPreferences(): Promise<UserPreferences> {
    return dataStore.getPreferences();
  }

  static async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    return dataStore.updatePreferences(preferences);
  }

  /**
   * 数据备份与恢复
   */
  static async backup(): Promise<string> {
    return dataStore.exportData();
  }

  static async restore(backup: string): Promise<boolean> {
    return dataStore.importData(backup);
  }

  /**
   * 数据清理
   */
  static async clear(): Promise<void> {
    return dataStore.clear();
  }

  static async clearProject(id: string): Promise<void> {
    return dataStore.deleteProject(id);
  }

  /**
   * 存储信息
   */
  static async getStorageInfo() {
    return dataStore.getStorageInfo();
  }

  /**
   * 搜索功能
   */
  static async searchEntities(query: string, projectId?: string): Promise<Entity[]> {
    return dataStore.searchEntities(query, projectId);
  }

  /**
   * 统计信息
   */
  static async getStatistics() {
    return dataStore.getStatistics();
  }

  /**
   * 添加最近访问的项目
   */
  static async addRecentProject(projectId: string): Promise<void> {
    return dataStore.addRecentProject(projectId);
  }

  /**
   * 订阅数据变更
   * @param path 数据路径
   * @param handler 处理函数
   * @returns 取消订阅函数
   */
  static subscribe<T = any>(path: Path, handler: (event: DataChangeEvent<T>) => void): () => void {
    return dataStore.subscribe<T>(path, handler);
  }

  /**
   * 订阅所有数据变更
   * @param handler 处理函数
   * @returns 取消订阅函数
   */
  static subscribeAll<T = any>(handler: (event: DataChangeEvent<T>) => void): () => void {
    return dataStore.subscribeAll<T>(handler);
  }

  /**
   * 强制立即写入所有待处理的更改
   */
  static async flush(): Promise<void> {
    return dataStore.flush();
  }

  /**
   * 性能优化设置
   */
  static setPerformanceOptions(options: {
    compressionEnabled?: boolean;
    maxCacheSize?: number;
    cacheTTL?: number;
    errorRecoveryEnabled?: boolean;
  }): void {
    return dataStore.setPerformanceOptions(options);
  }

  /**
   * 清理缓存
   */
  static clearCache(): void {
    return dataStore.clearCache();
  }

  /**
   * 获取缓存统计
   */
  static getCacheStats() {
    return dataStore.getCacheStats();
  }
}

// 导出类型
export type {
  AIDatabenchStorage,
  Project,
  Entity,
  AIModelConfig,
  UserPreferences,
  DataChangeEvent,
  Path
};
