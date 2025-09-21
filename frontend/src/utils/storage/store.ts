// src/utils/storage/store.ts
import { IndexedDBManager } from './db';
import { PathEventEmitter } from './events';
import type { 
  StorageInterface, 
  AIDatabenchStorage, 
  StorageOptions,
  Path,
  DataChangeEvent,
  Project,
  Entity,
  AIModelConfig,
  UserPreferences
} from './types';

// 默认存储选项
const DEFAULT_OPTIONS: StorageOptions = {
  dbName: 'aidatabench',
  version: 1,
  storeName: 'app_data'
};

/**
 * 数据存储服务
 */
export class DataStore implements StorageInterface<AIDatabenchStorage> {
  private db: IndexedDBManager;
  private events: PathEventEmitter;
  private cache: Map<string, unknown> = new Map();
  private pendingWrites: Map<string, unknown> = new Map();
  private writeDebounceTimeout: number | null = null;
  private readonly DEBOUNCE_TIME = 300; // 写入防抖时间 (ms)
  private readonly VERSION = '1.0.0';
  private readonly ROOT_KEY = 'root';
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private syncEnabled = true;
  
  // 性能优化相关
  private MAX_CACHE_SIZE = 100; // 最大缓存条目数
  private CACHE_TTL = 5 * 60 * 1000; // 缓存过期时间 (5分钟)
  private cacheTimestamps: Map<string, number> = new Map();
  private compressionEnabled = true;
  
  // 错误恢复相关
  private retryCount = 0;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 1000; // 重试延迟 (ms)
  private errorRecoveryEnabled = true;

  constructor(options: Partial<StorageOptions> = {}) {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    this.db = new IndexedDBManager(mergedOptions);
    this.events = new PathEventEmitter();

    // 设置跨标签页同步
    this.setupCrossTabSync();
  }

  /**
   * 初始化存储
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = (async () => {
      try {
        // 尝试加载根数据
        const rootData = await this.db.get<AIDatabenchStorage>(this.ROOT_KEY);
        
        if (!rootData) {
          // 如果没有数据，创建默认数据
          const defaultData = this.createDefaultData();
          await this.db.set(this.ROOT_KEY, defaultData);
          this.cache.set(this.ROOT_KEY, defaultData);
        } else {
          // 缓存加载的数据
          this.cache.set(this.ROOT_KEY, rootData);
        }
        
        this.initialized = true;
      } catch (error) {
        console.error('初始化存储失败:', error);
        throw error;
      } finally {
        this.initializing = null;
      }
    })();

    return this.initializing;
  }

  /**
   * 创建默认数据
   */
  private createDefaultData(): AIDatabenchStorage {
    return {
      app: {
        version: this.VERSION,
        lastUpdated: new Date().toISOString(),
        theme: 'dark',
        language: 'zh-CN'
      },
      projects: {
        active: null,
        list: {}
      },
      aiModels: {
        active: null,
        configs: {}
      },
      preferences: this.getDefaultPreferences(),
      history: {
        imports: [],
        exports: []
      }
    };
  }

  /**
   * 获取默认用户偏好设置
   */
  private getDefaultPreferences(): UserPreferences {
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
      }
    };
  }

  /**
   * 设置跨标签页同步
   */
  private setupCrossTabSync(): void {
    // 使用 BroadcastChannel API 进行跨标签页通信
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('aidatabench_sync');
      
      // 监听其他标签页的变更
      channel.onmessage = (event) => {
        const changeEvent = event.data as DataChangeEvent;
        
        // 忽略自己发出的事件（通过 source 标记）
        if (changeEvent.source === 'local') {
          return;
        }
        
        // 更新本地缓存
        if (changeEvent.path === this.ROOT_KEY) {
          this.cache.set(this.ROOT_KEY, changeEvent.value);
        } else {
          // 更新路径对应的数据
          const pathStr = typeof changeEvent.path === 'string' ? changeEvent.path : changeEvent.path.join('.');
          this.updateCacheAtPath(pathStr, changeEvent.value);
        }
        
        // 触发本地事件，但标记为远程源
        this.events.emit(changeEvent.path, changeEvent.value, changeEvent.previousValue);
      };
      
      // 在页面卸载时关闭通道
      window.addEventListener('beforeunload', () => {
        channel.close();
      });
    } else {
      console.warn('当前浏览器不支持 BroadcastChannel API，跨标签页同步将不可用');
    }
  }

  /**
   * 广播变更到其他标签页
   */
  private broadcastChange<T>(path: Path, value: T, previousValue?: T): void {
    if (!this.syncEnabled || !('BroadcastChannel' in window)) {
      return;
    }
    
    const channel = new BroadcastChannel('aidatabench_sync');
    const event: DataChangeEvent<T> = {
      path,
      value,
      previousValue,
      timestamp: Date.now(),
      source: 'local' // 标记为本地源，让其他标签页知道这是本地发出的
    };
    
    channel.postMessage(event);
    channel.close();
  }

  /**
   /**
    * 根据路径更新缓存中的数据
    * @param path 路径字符串（如 'a.b.c'）
    * @param value 要设置的新值
    * @param targetObj 可选，目标对象，默认为根缓存对象
    */
   private updateCacheAtPath(path: string, value: unknown, targetObj?: Record<string, unknown>): void {
     const target = targetObj ?? this.cache.get(this.ROOT_KEY);
     if (!target || typeof target !== 'object') {
       return;
     }
    
    if (path === this.ROOT_KEY) {
      if (targetObj) {
        Object.assign(targetObj, value);
      } else {
        this.cache.set(this.ROOT_KEY, value);
      }
      return;
    }
    
    const pathParts = path.split('.');
    let current: unknown = target;
    
    // 遍历路径直到倒数第二部分
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const currentObj = current as Record<string, unknown>;
      if (currentObj[part] === undefined) {
        currentObj[part] = {};
      }
      current = currentObj[part];
    }
    
    // 设置最后一部分的值
    const lastPart = pathParts[pathParts.length - 1];
    (current as Record<string, unknown>)[lastPart] = value;
    
    // 如果不是目标对象，更新根缓存
    if (!targetObj) {
      this.cache.set(this.ROOT_KEY, target);
    }
  }

  /**
   * 获取路径对应的值
   */
  private getValueAtPath(obj: unknown, path: string): unknown {
    const pathParts = path.split('.');
    let current = obj;
    
    for (const part of pathParts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    
    return current;
  }

  /**
   * 执行防抖写入
   */
  private scheduleWrite(): void {
    if (this.writeDebounceTimeout !== null) {
      clearTimeout(this.writeDebounceTimeout);
    }
    
    this.writeDebounceTimeout = window.setTimeout(async () => {
      await this.flushPendingWrites();
    }, this.DEBOUNCE_TIME);
  }

  /**
   * 刷新待处理的写入
   */
  private async flushPendingWrites(): Promise<void> {
    if (this.pendingWrites.size === 0) {
      return;
    }

    const pendingWrites = new Map(this.pendingWrites);
    this.pendingWrites.clear();

    try {
      // 获取当前根数据
      const rootData = this.cache.get(this.ROOT_KEY);
      if (!rootData) {
        // 如果缓存中没有数据，重新加载
        await this.initialize();
        return;
      }
      
      // 创建数据副本以避免修改缓存
      const dataToWrite = JSON.parse(JSON.stringify(rootData));
      
      // 应用所有待处理的写入
      for (const [path, value] of pendingWrites.entries()) {
        if (path === this.ROOT_KEY) {
          continue; // 根数据单独处理
        }
        
        this.updateCacheAtPath(path, value, dataToWrite);
      }
      
      // 更新最后修改时间
      dataToWrite.app.lastUpdated = new Date().toISOString();
      
      // 压缩数据
      const compressedData = this.compressData(dataToWrite);
      
      // 写入数据库（带重试）
      await this.executeWithRetry(
        () => this.db.set(this.ROOT_KEY, compressedData),
        '批量写入数据'
      );
      
      // 更新缓存
      this.setCacheEntry(this.ROOT_KEY, compressedData);
      
    } catch (error) {
      console.error('批量写入失败:', error);
      
      // 将失败的写入重新加入待处理队列
      for (const [path, value] of pendingWrites.entries()) {
        this.pendingWrites.set(path, value);
      }
      
      // 尝试重新连接数据库
      try {
        await this.db.reconnect();
      } catch (reconnectError) {
        console.error('数据库重连失败:', reconnectError);
      }
    } finally {
      this.writeDebounceTimeout = null;
    }
  }

  /**
   * 获取完整数据
   */
  async getFullData(): Promise<AIDatabenchStorage> {
    await this.initialize();
    
    return this.executeWithRetry(async () => {
      let rootData = this.getCacheEntry(this.ROOT_KEY);
      
      if (!rootData) {
        rootData = await this.db.get<AIDatabenchStorage>(this.ROOT_KEY);
        if (!rootData) {
          throw new Error('无法获取存储数据');
        }
        this.setCacheEntry(this.ROOT_KEY, rootData);
      }
      
      return { ...(rootData as AIDatabenchStorage) };
    }, '获取完整数据');
  }

  /**
   * 获取特定路径的数据
   */
  async get<K extends keyof AIDatabenchStorage>(key: K): Promise<AIDatabenchStorage[K] | undefined> {
    await this.initialize();
    
    const rootData = this.cache.get(this.ROOT_KEY);
    if (!rootData) {
      return undefined;
    }
    
    return (rootData as AIDatabenchStorage)[key];
  }

  /**
   /**
    * 获取嵌套路径的数据
    * @param path 嵌套路径，可以为字符串或字符串数组
    * @returns 指定路径的数据，类型为 T，若不存在则返回 undefined
    */
  async getPath<T = unknown>(path: Path): Promise<T | undefined> {
    await this.initialize();

    const rootData = this.cache.get(this.ROOT_KEY);
    if (!rootData) {
      return undefined;
    }
    
    const pathStr = typeof path === 'string' ? path : path.join('.');
    return this.getValueAtPath(rootData, pathStr) as T | undefined;
  }

  /**
   * 设置特定路径的数据
   */
  async set<K extends keyof AIDatabenchStorage>(key: K, value: AIDatabenchStorage[K]): Promise<void> {
    await this.initialize();
    
    const rootData = this.cache.get(this.ROOT_KEY);
    if (!rootData) {
      throw new Error('无法获取存储数据');
    }
    
    const rootDataTyped = rootData as AIDatabenchStorage;
    const previousValue = rootDataTyped[key];
    rootDataTyped[key] = value;
    
    // 更新缓存
    this.cache.set(this.ROOT_KEY, rootData);
    
    // 添加到待处理写入
    this.pendingWrites.set(key as string, value);
    
    // 触发事件
    this.events.emit(key as string, value, previousValue);
    
    // 广播变更
    this.broadcastChange(key as string, value, previousValue);
    
    // 安排写入
    this.scheduleWrite();
  }

  /**
   /**
    * 设置嵌套路径的数据
    * @param path 嵌套路径，可以为字符串或字符串数组
    * @param value 要设置的数据
    * @template T 数据类型
    * @returns Promise<void>
    */
  async setPath<T = unknown>(path: Path, value: T): Promise<void> {
    await this.initialize();

    const pathStr = typeof path === 'string' ? path : path.join('.');
    // 获取当前值
    const previousValue = await this.getPath<T>(pathStr);
    
    // 添加到待处理写入
    this.pendingWrites.set(pathStr, value);
    
    // 更新缓存
    this.updateCacheAtPath(pathStr, value);
    
    // 触发事件
    this.events.emit(pathStr, value, previousValue);
    
    // 广播变更
    this.broadcastChange(pathStr, value, previousValue);
    
    // 安排写入
    this.scheduleWrite();
  }

  /**
   * 删除特定路径的数据
   */
  async delete<K extends keyof AIDatabenchStorage>(key: K): Promise<void> {
    await this.initialize();
    
    const rootData = this.cache.get(this.ROOT_KEY);
    if (!rootData) {
      return;
    }
    
    const rootDataTyped = rootData as AIDatabenchStorage;
    const previousValue = rootDataTyped[key];
    delete rootDataTyped[key];
    
    // 更新缓存
    this.cache.set(this.ROOT_KEY, rootData);
    
    // 添加到待处理写入
    this.pendingWrites.set(key as string, undefined);
    
    // 触发事件
    this.events.emit(key as string, undefined, previousValue);
    
    // 广播变更
    this.broadcastChange(key as string, undefined, previousValue);
    
    // 安排写入
    this.scheduleWrite();
  }

  /**
   * 删除嵌套路径的数据
   */
  async deletePath(path: Path): Promise<void> {
    await this.initialize();
    
    const pathStr = typeof path === 'string' ? path : path.join('.');
    const pathParts = pathStr.split('.');
    
    if (pathParts.length === 0) {
      return;
    }
    
    const rootData = this.cache.get(this.ROOT_KEY);
    if (!rootData) {
      return;
    }
    
    // 获取当前值
    const previousValue = await this.getPath(pathStr);
    
    // 找到父对象
    let current: unknown = rootData;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const currentObj = current as Record<string, unknown>;
      if (currentObj[part] === undefined) {
        return; // 路径不存在
      }
      current = currentObj[part];
    }
    
    // 删除属性
    const lastPart = pathParts[pathParts.length - 1];
    delete (current as Record<string, unknown>)[lastPart];
    
    // 更新缓存
    this.cache.set(this.ROOT_KEY, rootData);
    
    // 添加到待处理写入
    this.pendingWrites.set(pathStr, undefined);
    
    // 触发事件
    this.events.emit(pathStr, undefined, previousValue);
    
    // 广播变更
    this.broadcastChange(pathStr, undefined, previousValue);
    
    // 安排写入
    this.scheduleWrite();
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    await this.initialize();
    
    const previousData = this.cache.get(this.ROOT_KEY);
    
    // 创建新的默认数据
    const defaultData = this.createDefaultData();
    
    // 更新缓存
    this.cache.set(this.ROOT_KEY, defaultData);
    
    // 清空待处理写入
    this.pendingWrites.clear();
    
    // 写入数据库
    await this.db.set(this.ROOT_KEY, defaultData);
    
    // 触发事件
    this.events.emit(this.ROOT_KEY, defaultData, previousData);
    
    // 广播变更
    this.broadcastChange(this.ROOT_KEY, defaultData, previousData);
  }

  /**
   * 订阅特定路径的变更
   */
  subscribe<T = unknown>(path: Path, handler: (event: DataChangeEvent<T>) => void): () => void {
    return this.events.on<T>(path, handler);
  }

  /**
   * 订阅所有变更
   */
  subscribeAll<T = unknown>(handler: (event: DataChangeEvent<T>) => void): () => void {
    return this.events.onAny<T>(handler);
  }

  /**
   * 暂停跨标签页同步
   */
  pauseSync(): void {
    this.syncEnabled = false;
  }

  /**
   * 恢复跨标签页同步
   */
  resumeSync(): void {
    this.syncEnabled = true;
  }

  /**
   * 强制立即写入所有待处理的更改
   */
  async flush(): Promise<void> {
    if (this.writeDebounceTimeout !== null) {
      clearTimeout(this.writeDebounceTimeout);
      this.writeDebounceTimeout = null;
    }
    
    await this.flushPendingWrites();
  }

  /**
   * 缓存管理
   */
  private manageCache(): void {
    // 清理过期缓存
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
    
    // 如果缓存过大，清理最旧的条目
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cacheTimestamps.entries())
        .sort(([, a], [, b]) => a - b);
      
      const toDelete = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
      for (const [key] of toDelete) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  /**
   * 设置缓存条目
   */
  private setCacheEntry(key: string, value: unknown): void {
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
    this.manageCache();
  }

  /**
   * 获取缓存条目
   */
  private getCacheEntry(key: string): unknown {
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return undefined;
    }
    return this.cache.get(key);
  }

  /**
   * 数据压缩
   */
  private compressData(data: unknown): unknown {
    if (!this.compressionEnabled) {
      return data;
    }
    
    try {
      // 简单的数据压缩：移除空值和默认值
      return JSON.parse(JSON.stringify(data, (_key, value) => {
        if (value === null || value === undefined || value === '') {
          return undefined;
        }
        return value;
      }));
    } catch (error) {
      console.warn('数据压缩失败:', error);
      return data;
    }
  }

  /**
   * 带重试的操作执行
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.MAX_RETRY_COUNT; attempt++) {
      try {
        const result = await operation();
        this.retryCount = 0; // 重置重试计数
        return result;
      } catch (error) {
        lastError = error as Error;
        this.retryCount = attempt + 1;
        
        if (attempt < this.MAX_RETRY_COUNT && this.errorRecoveryEnabled) {
          console.warn(`${operationName} 失败，第 ${attempt + 1} 次重试:`, error);
          
          // 指数退避延迟
          const delay = this.RETRY_DELAY * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 尝试重新连接数据库
          try {
            await this.db.reconnect();
          } catch (reconnectError) {
            console.warn('数据库重连失败:', reconnectError);
          }
        } else {
          console.error(`${operationName} 最终失败:`, error);
          break;
        }
      }
    }
    
    throw lastError || new Error(`${operationName} 操作失败`);
  }

  /**
   * 导出所有数据
   */
  async exportData(): Promise<string> {
    const data = await this.getFullData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入数据
   */
  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData) as AIDatabenchStorage;
      
      // 基本数据结构验证
      if (!data.app || !data.projects || !data.aiModels) {
        throw new Error('无效的数据结构');
      }
      
      // 保留当前版本信息
      const currentVersion = this.VERSION;
      data.app.version = currentVersion;
      
      // 更新缓存
      this.cache.set(this.ROOT_KEY, data);
      
      // 写入数据库
      await this.db.set(this.ROOT_KEY, data);
      
      // 触发事件
      this.events.emit(this.ROOT_KEY, data);
      
      // 广播变更
      this.broadcastChange(this.ROOT_KEY, data);
      
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  /**
   * 获取存储信息
   */
  async getStorageInfo(): Promise<{
    totalSize: number;
    totalSizeMB: number;
    projectCount: number;
    aiModelCount: number;
    lastUpdated: string;
  }> {
    const data = await this.getFullData();
    const dataStr = JSON.stringify(data);
    const sizeInBytes = new Blob([dataStr]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    return {
      totalSize: sizeInBytes,
      totalSizeMB: sizeInMB,
      projectCount: Object.keys(data.projects.list).length,
      aiModelCount: Object.keys(data.aiModels.configs).length,
      lastUpdated: data.app.lastUpdated
    };
  }

  /**
   * 项目相关操作
   */
  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getPath<{ list: Record<string, Project> }>('projects');
    return projects?.list[id] || null;
  }

  async saveProject(project: Project): Promise<void> {
    // 确保更新时间戳
    project.updatedAt = new Date().toISOString();
    
    await this.setPath(`projects.list.${project.id}`, project);
    
    // 添加到最近访问的项目
    await this.addRecentProject(project.id);
  }

  async deleteProject(id: string): Promise<void> {
    // 检查是否是当前激活的项目
    const activeProject = await this.getPath<string | null>('projects.active');
    
    // 删除项目
    await this.deletePath(`projects.list.${id}`);
    
    // 如果删除的是当前激活项目，清除激活状态
    if (activeProject === id) {
      await this.setPath('projects.active', null);
    }
    
    // 从最近项目中移除
    const preferences = await this.getPath<UserPreferences>('preferences');
    if (preferences?.ui.recentProjects) {
      const recentProjects = preferences.ui.recentProjects.filter(pid => pid !== id);
      await this.setPath('preferences.ui.recentProjects', recentProjects);
    }
  }

  async listProjects(): Promise<Project[]> {
    const projects = await this.getPath<{ list: Record<string, Project> }>('projects');
    return projects ? Object.values(projects.list) : [];
  }

  async setActiveProject(id: string | null): Promise<void> {
    await this.setPath('projects.active', id);
    
    if (id) {
      await this.addRecentProject(id);
    }
  }

  async getActiveProject(): Promise<Project | null> {
    const activeId = await this.getPath<string | null>('projects.active');
    if (!activeId) {
      return null;
    }
    
    return this.getProject(activeId);
  }

  /**
   * 实体相关操作
   */
  async getEntity(projectId: string, entityId: string): Promise<Entity | null> {
    const project = await this.getProject(projectId);
    if (!project) {
      return null;
    }
    
    return project.schema.entities[entityId] || null;
  }

  async saveEntity(projectId: string, entity: Entity): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`项目 ${projectId} 不存在`);
    }
    
    // 确保更新时间戳
    entity.metadata.updatedAt = new Date().toISOString();
    
    // 更新实体
    await this.setPath(`projects.list.${projectId}.schema.entities.${entity.id}`, entity);
  }

  async deleteEntity(projectId: string, entityId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      return;
    }
    
    // 删除实体
    await this.deletePath(`projects.list.${projectId}.schema.entities.${entityId}`);
    
    // 删除相关的关系
    const relations = project.schema.relations.filter(
      relation => 
        relation.from.entityId !== entityId && 
        relation.to.entityId !== entityId
    );
    
    await this.setPath(`projects.list.${projectId}.schema.relations`, relations);
  }

  /**
   * AI模型配置相关操作
   */
  async getAIModel(id: string): Promise<AIModelConfig | null> {
    const aiModels = await this.getPath<{ configs: Record<string, AIModelConfig> }>('aiModels');
    return aiModels?.configs[id] || null;
  }

  async saveAIModel(config: AIModelConfig): Promise<void> {
    await this.setPath(`aiModels.configs.${config.id}`, config);
  }

  async deleteAIModel(id: string): Promise<void> {
    // 检查是否是当前激活的模型
    const activeModel = await this.getPath<string | null>('aiModels.active');
    
    // 删除模型
    await this.deletePath(`aiModels.configs.${id}`);
    
    // 如果删除的是当前激活模型，清除激活状态
    if (activeModel === id) {
      await this.setPath('aiModels.active', null);
    }
  }

  async listAIModels(): Promise<AIModelConfig[]> {
    const aiModels = await this.getPath<{ configs: Record<string, AIModelConfig> }>('aiModels');
    return aiModels ? Object.values(aiModels.configs) : [];
  }

  async setActiveAIModel(id: string | null): Promise<void> {
    await this.setPath('aiModels.active', id);
  }

  async getActiveAIModel(): Promise<AIModelConfig | null> {
    const activeId = await this.getPath<string | null>('aiModels.active');
    if (!activeId) {
      return null;
    }
    
    return this.getAIModel(activeId);
  }

  /**
   * 用户偏好设置
   */
  async getPreferences(): Promise<UserPreferences> {
    const preferences = await this.getPath<UserPreferences>('preferences');
    return preferences || this.getDefaultPreferences();
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const currentPreferences = await this.getPreferences();
    
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      ui: {
        ...currentPreferences.ui,
        ...(preferences.ui || {})
      },
      editor: {
        ...currentPreferences.editor,
        ...(preferences.editor || {})
      },
      graph: {
        ...currentPreferences.graph,
        ...(preferences.graph || {})
      },
      codeGen: {
        ...currentPreferences.codeGen,
        ...(preferences.codeGen || {})
      }
    };
    
    await this.setPath('preferences', updatedPreferences);
  }

  /**
   * 添加最近访问的项目
   */
  async addRecentProject(projectId: string): Promise<void> {
    const preferences = await this.getPreferences();
    
    // 从当前列表中移除该项目（如果存在）
    const recentProjects = preferences.ui.recentProjects.filter(id => id !== projectId);
    
    // 添加到列表开头
    recentProjects.unshift(projectId);
    
    // 只保留最近10个
    if (recentProjects.length > 10) {
      recentProjects.splice(10);
    }
    
    await this.setPath('preferences.ui.recentProjects', recentProjects);
  }

  /**
   * 搜索功能
   */
  async searchEntities(query: string, projectId?: string): Promise<Entity[]> {
    const projects = projectId 
      ? [await this.getProject(projectId)].filter(Boolean) as Project[]
      : await this.listProjects();
    
    const results: Entity[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const project of projects) {
      Object.values(project.schema.entities).forEach(entity => {
        if (
          entity.name?.toLowerCase().includes(lowerQuery) ||
          entity.tableName?.toLowerCase().includes(lowerQuery) ||
          entity.comment?.toLowerCase().includes(lowerQuery) ||
          entity.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        ) {
          results.push(entity);
        }
      });
    }
    
    return results;
  }

  /**
   * 统计信息
   */
  async getStatistics(): Promise<{
    projectCount: number;
    entityCount: number;
    relationCount: number;
    aiModelCount: number;
    storageInfo: {
      totalSize: number;
      totalSizeMB: number;
      projectCount: number;
      aiModelCount: number;
      lastUpdated: string;
    };
    performanceInfo: {
      cacheSize: number;
      cacheHitRate: number;
      retryCount: number;
      compressionEnabled: boolean;
    };
  }> {
    const projects = await this.listProjects();
    const totalEntities = projects.reduce((sum, project) => 
      sum + Object.keys(project.schema.entities).length, 0
    );
    const totalRelations = projects.reduce((sum, project) => 
      sum + project.schema.relations.length, 0
    );
    
    return {
      projectCount: projects.length,
      entityCount: totalEntities,
      relationCount: totalRelations,
      aiModelCount: (await this.listAIModels()).length,
      storageInfo: await this.getStorageInfo(),
      performanceInfo: {
        cacheSize: this.cache.size,
        cacheHitRate: this.calculateCacheHitRate(),
        retryCount: this.retryCount,
        compressionEnabled: this.compressionEnabled
      }
    };
  }

  /**
   * 计算缓存命中率
   */
  private calculateCacheHitRate(): number {
    // 简单的缓存命中率计算
    const totalRequests = this.cacheTimestamps.size + this.retryCount;
    if (totalRequests === 0) return 0;
    
    const cacheHits = this.cacheTimestamps.size;
    return Math.round((cacheHits / totalRequests) * 100);
  }

  /**
   * 性能优化设置
   */
  setPerformanceOptions(options: {
    compressionEnabled?: boolean;
    maxCacheSize?: number;
    cacheTTL?: number;
    errorRecoveryEnabled?: boolean;
  }): void {
    if (options.compressionEnabled !== undefined) {
      this.compressionEnabled = options.compressionEnabled;
    }
    if (options.maxCacheSize !== undefined) {
      this.MAX_CACHE_SIZE = options.maxCacheSize;
    }
    if (options.cacheTTL !== undefined) {
      this.CACHE_TTL = options.cacheTTL;
    }
    if (options.errorRecoveryEnabled !== undefined) {
      this.errorRecoveryEnabled = options.errorRecoveryEnabled;
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number;
    entries: string[];
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    const entries = Array.from(this.cacheTimestamps.entries())
      .sort(([, a], [, b]) => a - b);
    
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      oldestEntry: entries[0]?.[0] || null,
      newestEntry: entries[entries.length - 1]?.[0] || null
    };
  }
}

