import type { 
  AIDatabenchStorage, 
  Project, 
  Entity, 
  AIModelConfig,
  UserPreferences 
} from '../types/storage';

/**
 * AIDatabench LocalStorage 存储引擎
 * 提供完整的本地数据存储、读取、备份功能
 */
export class StorageService {
  private static readonly STORAGE_KEY = 'aidatabench_data';
  private static readonly VERSION = '1.0.0';
  private static cache: AIDatabenchStorage | null = null;

  /**
   * 初始化存储，如果不存在则创建默认数据
   */
  static initialize(): void {
    const existingData = localStorage.getItem(this.STORAGE_KEY);
    
    if (!existingData) {
      const defaultData: AIDatabenchStorage = this.createDefaultData();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultData));
      this.cache = defaultData;
    }
  }

  /**
   * 创建默认数据结构
   */
  private static createDefaultData(): AIDatabenchStorage {
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
  private static getDefaultPreferences(): UserPreferences {
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
   * 获取完整数据
   */
  static getData(): AIDatabenchStorage {
    // 如果有缓存直接返回
    if (this.cache) {
      return this.cache;
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        throw new Error('No data found in localStorage');
      }
      
      const parsed = JSON.parse(data) as AIDatabenchStorage;
      
      // 数据版本兼容性检查
      if (parsed.app.version !== this.VERSION) {
        console.warn(`Data version mismatch: ${parsed.app.version} vs ${this.VERSION}`);
        // 这里可以添加数据迁移逻辑
      }
      
      this.cache = parsed;
      return parsed;
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      // 创建默认数据但不调用 saveData 避免递归
      const defaultData: AIDatabenchStorage = this.createDefaultData();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultData));
      this.cache = defaultData;
      return defaultData;
    }
  }

  /**
   * 保存数据
   */
  static saveData(data: Partial<AIDatabenchStorage>): void {
    try {
      // 确保有基础数据，如果没有则初始化
      if (!this.cache && !localStorage.getItem(this.STORAGE_KEY)) {
        this.initialize();
      }
      
      const currentData = this.cache || this.getData();
      const updatedData = {
        ...currentData,
        ...data,
        app: {
          ...currentData.app,
          ...data.app,
          lastUpdated: new Date().toISOString()
        }
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
      this.cache = updatedData;
      
      // 检查存储空间
      this.checkStorageSize();
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
      throw error;
    }
  }

  /**
   * 项目相关操作
   */
  static getProject(id: string): Project | null {
    const data = this.getData();
    return data.projects.list[id] || null;
  }

  static saveProject(project: Project): void {
    const data = this.getData();
    data.projects.list[project.id] = {
      ...project,
      updatedAt: new Date().toISOString()
    };
    this.saveData(data);
  }

  static deleteProject(id: string): void {
    const data = this.getData();
    delete data.projects.list[id];
    
    // 如果删除的是当前激活项目，清除激活状态
    if (data.projects.active === id) {
      data.projects.active = null;
    }
    
    this.saveData(data);
  }

  static listProjects(): Project[] {
    const data = this.getData();
    return Object.values(data.projects.list);
  }

  static setActiveProject(id: string | null): void {
    const data = this.getData();
    data.projects.active = id;
    this.saveData(data);
  }

  static getActiveProject(): Project | null {
    const data = this.getData();
    if (!data.projects.active) return null;
    return this.getProject(data.projects.active);
  }

  /**
   * 实体相关操作
   */
  static getEntity(projectId: string, entityId: string): Entity | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    return project.schema.entities[entityId] || null;
  }

  static saveEntity(projectId: string, entity: Entity): void {
    const project = this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.schema.entities[entity.id] = {
      ...entity,
      metadata: {
        ...entity.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.saveProject(project);
  }

  static deleteEntity(projectId: string, entityId: string): void {
    const project = this.getProject(projectId);
    if (!project) return;
    
    delete project.schema.entities[entityId];
    
    // 删除相关的关系
    project.schema.relations = project.schema.relations.filter(
      relation => 
        relation.from.entityId !== entityId && 
        relation.to.entityId !== entityId
    );
    
    this.saveProject(project);
  }

  /**
   * AI模型配置相关操作
   */
  static getAIModel(id: string): AIModelConfig | null {
    const data = this.getData();
    return data.aiModels.configs[id] || null;
  }

  static saveAIModel(config: AIModelConfig): void {
    const data = this.getData();
    data.aiModels.configs[config.id] = config;
    this.saveData(data);
  }

  static deleteAIModel(id: string): void {
    const data = this.getData();
    delete data.aiModels.configs[id];
    
    // 如果删除的是当前激活模型，清除激活状态
    if (data.aiModels.active === id) {
      data.aiModels.active = null;
    }
    
    this.saveData(data);
  }

  static listAIModels(): AIModelConfig[] {
    const data = this.getData();
    return Object.values(data.aiModels.configs);
  }

  static setActiveAIModel(id: string | null): void {
    const data = this.getData();
    data.aiModels.active = id;
    this.saveData(data);
  }

  static getActiveAIModel(): AIModelConfig | null {
    const data = this.getData();
    if (!data.aiModels.active) return null;
    return this.getAIModel(data.aiModels.active);
  }

  /**
   * 用户偏好设置
   */
  static getPreferences(): UserPreferences {
    const data = this.getData();
    return data.preferences;
  }

  static updatePreferences(preferences: Partial<UserPreferences>): void {
    const data = this.getData();
    data.preferences = {
      ...data.preferences,
      ...preferences
    };
    this.saveData(data);
  }

  /**
   * 数据备份与恢复
   */
  static backup(): string {
    const data = this.getData();
    return JSON.stringify(data, null, 2);
  }

  static restore(backup: string): boolean {
    try {
      const data = JSON.parse(backup) as AIDatabenchStorage;
      
      // 基本数据结构验证
      if (!data.app || !data.projects || !data.aiModels) {
        throw new Error('Invalid backup data structure');
      }
      
      localStorage.setItem(this.STORAGE_KEY, backup);
      this.cache = data;
      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return false;
    }
  }

  /**
   * 数据清理
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.cache = null;
  }

  static clearProject(id: string): void {
    this.deleteProject(id);
  }

  /**
   * 存储信息
   */
  static getStorageInfo() {
    const data = JSON.stringify(this.getData());
    const sizeInBytes = new Blob([data]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    return {
      totalSize: sizeInBytes,
      totalSizeMB: sizeInMB,
      projectCount: this.listProjects().length,
      aiModelCount: this.listAIModels().length,
      lastUpdated: this.getData().app.lastUpdated
    };
  }

  /**
   * 检查存储空间
   */
  private static checkStorageSize(): void {
    const info = this.getStorageInfo();
    
    // 如果存储大小超过5MB，发出警告
    if (info.totalSizeMB > 5) {
      console.warn(`Storage size is getting large: ${info.totalSizeMB.toFixed(2)}MB`);
    }
    
    // 如果存储大小超过8MB，建议清理
    if (info.totalSizeMB > 8) {
      console.warn('Storage size is too large, consider cleaning up old data');
    }
  }

  /**
   * 搜索功能
   */
  static searchEntities(query: string, projectId?: string): Entity[] {
    const projects = projectId ? [this.getProject(projectId)] : this.listProjects();
    const results: Entity[] = [];
    
    projects.forEach(project => {
      if (!project) return;
      
      Object.values(project.schema.entities).forEach(entity => {
        if (
          entity.name.toLowerCase().includes(query.toLowerCase()) ||
          entity.tableName.toLowerCase().includes(query.toLowerCase()) ||
          entity.comment?.toLowerCase().includes(query.toLowerCase())
        ) {
          results.push(entity);
        }
      });
    });
    
    return results;
  }

  /**
   * 统计信息
   */
  static getStatistics() {
    const projects = this.listProjects();
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
      aiModelCount: this.listAIModels().length,
      storageInfo: this.getStorageInfo()
    };
  }

  /**
   * 添加最近访问的项目
   */
  static addRecentProject(projectId: string): void {
    const preferences = this.getPreferences();
    const recent = preferences.ui.recentProjects.filter(id => id !== projectId);
    recent.unshift(projectId);
    
    // 只保留最近10个
    if (recent.length > 10) {
      recent.splice(10);
    }
    
    this.updatePreferences({
      ui: {
        ...preferences.ui,
        recentProjects: recent
      }
    });
  }
}