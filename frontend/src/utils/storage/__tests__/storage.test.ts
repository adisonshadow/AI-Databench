import { StorageService } from '../index';
import { 
  createTestProject, 
  createTestEntity, 
  createTestAIModel, 
  createTestPreferences,
  waitForAsync,
  waitForCondition
} from './testUtils';

describe('StorageService', () => {
  beforeEach(async () => {
    await StorageService.initialize();
  });

  afterEach(async () => {
    await StorageService.clear();
  });

  describe('初始化', () => {
    test('应该能够初始化存储服务', async () => {
      await StorageService.initialize();
      const data = await StorageService.getData();
      
      expect(data).toBeDefined();
      expect(data.app.version).toBeDefined();
      expect(data.projects).toBeDefined();
      expect(data.aiModels).toBeDefined();
      expect(data.preferences).toBeDefined();
    });

    test('应该创建默认数据结构', async () => {
      const data = await StorageService.getData();
      
      expect(data.app.theme).toBe('dark');
      expect(data.app.language).toBe('zh-CN');
      expect(data.projects.active).toBeNull();
      expect(data.projects.list).toEqual({});
      expect(data.aiModels.active).toBeNull();
      expect(data.aiModels.configs).toEqual({});
    });
  });

  describe('项目操作', () => {
    test('应该能够保存和获取项目', async () => {
      const project = createTestProject();
      
      await StorageService.saveProject(project);
      const savedProject = await StorageService.getProject(project.id);
      
      expect(savedProject).toEqual(project);
    });

    test('应该能够列出所有项目', async () => {
      const project1 = createTestProject({ id: 'project1', name: '项目1' });
      const project2 = createTestProject({ id: 'project2', name: '项目2' });
      
      await StorageService.saveProject(project1);
      await StorageService.saveProject(project2);
      
      const projects = await StorageService.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.id)).toContain('project1');
      expect(projects.map(p => p.id)).toContain('project2');
    });

    test('应该能够设置和获取活动项目', async () => {
      const project = createTestProject();
      await StorageService.saveProject(project);
      
      await StorageService.setActiveProject(project.id);
      const activeProject = await StorageService.getActiveProject();
      
      expect(activeProject?.id).toBe(project.id);
    });

    test('应该能够删除项目', async () => {
      const project = createTestProject();
      await StorageService.saveProject(project);
      
      await StorageService.deleteProject(project.id);
      const deletedProject = await StorageService.getProject(project.id);
      
      expect(deletedProject).toBeNull();
    });

    test('删除活动项目时应该清除活动状态', async () => {
      const project = createTestProject();
      await StorageService.saveProject(project);
      await StorageService.setActiveProject(project.id);
      
      await StorageService.deleteProject(project.id);
      const activeProject = await StorageService.getActiveProject();
      
      expect(activeProject).toBeNull();
    });
  });

  describe('实体操作', () => {
    let project: any;

    beforeEach(async () => {
      project = createTestProject();
      await StorageService.saveProject(project);
    });

    test('应该能够保存和获取实体', async () => {
      const entity = createTestEntity();
      
      await StorageService.saveEntity(project.id, entity);
      const savedEntity = await StorageService.getEntity(project.id, entity.id);
      
      expect(savedEntity).toEqual(entity);
    });

    test('应该能够删除实体', async () => {
      const entity = createTestEntity();
      await StorageService.saveEntity(project.id, entity);
      
      await StorageService.deleteEntity(project.id, entity.id);
      const deletedEntity = await StorageService.getEntity(project.id, entity.id);
      
      expect(deletedEntity).toBeNull();
    });

    test('删除实体时应该删除相关关系', async () => {
      const entity1 = createTestEntity({ id: 'entity1' });
      const entity2 = createTestEntity({ id: 'entity2' });
      
      await StorageService.saveEntity(project.id, entity1);
      await StorageService.saveEntity(project.id, entity2);
      
      // 添加关系
      const relation = {
        id: 'relation1',
        from: { entityId: 'entity1' },
        to: { entityId: 'entity2' },
        type: 'oneToMany'
      };
      
      const projectData = await StorageService.getProject(project.id);
      projectData!.schema.relations.push(relation);
      await StorageService.saveProject(projectData!);
      
      // 删除实体
      await StorageService.deleteEntity(project.id, 'entity1');
      
      const updatedProject = await StorageService.getProject(project.id);
      expect(updatedProject!.schema.relations).toHaveLength(0);
    });
  });

  describe('AI模型操作', () => {
    test('应该能够保存和获取AI模型', async () => {
      const aiModel = createTestAIModel();
      
      await StorageService.saveAIModel(aiModel);
      const savedModel = await StorageService.getAIModel(aiModel.id);
      
      expect(savedModel).toEqual(aiModel);
    });

    test('应该能够列出所有AI模型', async () => {
      const model1 = createTestAIModel({ id: 'model1', name: '模型1' });
      const model2 = createTestAIModel({ id: 'model2', name: '模型2' });
      
      await StorageService.saveAIModel(model1);
      await StorageService.saveAIModel(model2);
      
      const models = await StorageService.listAIModels();
      expect(models).toHaveLength(2);
    });

    test('应该能够设置和获取活动AI模型', async () => {
      const aiModel = createTestAIModel();
      await StorageService.saveAIModel(aiModel);
      
      await StorageService.setActiveAIModel(aiModel.id);
      const activeModel = await StorageService.getActiveAIModel();
      
      expect(activeModel?.id).toBe(aiModel.id);
    });

    test('应该能够删除AI模型', async () => {
      const aiModel = createTestAIModel();
      await StorageService.saveAIModel(aiModel);
      
      await StorageService.deleteAIModel(aiModel.id);
      const deletedModel = await StorageService.getAIModel(aiModel.id);
      
      expect(deletedModel).toBeNull();
    });
  });

  describe('用户偏好设置', () => {
    test('应该能够获取默认偏好设置', async () => {
      const preferences = await StorageService.getPreferences();
      
      expect(preferences.ui.sidebarCollapsed).toBe(false);
      expect(preferences.editor.theme).toBe('vs-dark');
      expect(preferences.graph.layout).toBe('force');
      expect(preferences.codeGen.language).toBe('typescript');
    });

    test('应该能够更新偏好设置', async () => {
      const updates = {
        ui: {
          sidebarCollapsed: true,
          panelSizes: {
            sidebar: 300,
            main: 900,
            properties: 400
          },
          recentProjects: [],
          favoriteEntities: []
        }
      };
      
      await StorageService.updatePreferences(updates);
      const preferences = await StorageService.getPreferences();
      
      expect(preferences.ui.sidebarCollapsed).toBe(true);
      expect(preferences.ui.panelSizes.sidebar).toBe(300);
    });
  });

  describe('路径操作', () => {
    test('应该能够设置和获取路径数据', async () => {
      const testData = { value: 'test' };
      
      await StorageService.setPath('test.path', testData);
      const result = await StorageService.getPath('test.path');
      
      expect(result).toEqual(testData);
    });

    test('应该能够设置嵌套路径', async () => {
      const testData = { nested: { value: 'test' } };
      
      await StorageService.setPath(['test', 'nested', 'path'], testData);
      const result = await StorageService.getPath(['test', 'nested', 'path']);
      
      expect(result).toEqual(testData);
    });
  });

  describe('数据备份和恢复', () => {
    test('应该能够导出数据', async () => {
      const project = createTestProject();
      await StorageService.saveProject(project);
      
      const backup = await StorageService.backup();
      const parsedBackup = JSON.parse(backup);
      
      expect(parsedBackup.projects.list[project.id]).toEqual(project);
    });

    test('应该能够恢复数据', async () => {
      const project = createTestProject();
      const backup = JSON.stringify({
        app: { version: '1.0.0', lastUpdated: new Date().toISOString(), theme: 'dark', language: 'zh-CN' },
        projects: { active: null, list: { [project.id]: project } },
        aiModels: { active: null, configs: {} },
        preferences: createTestPreferences(),
        history: { imports: [], exports: [] }
      });
      
      const success = await StorageService.restore(backup);
      expect(success).toBe(true);
      
      const restoredProject = await StorageService.getProject(project.id);
      expect(restoredProject).toEqual(project);
    });
  });

  describe('搜索功能', () => {
    beforeEach(async () => {
      const project = createTestProject();
      const entity1 = createTestEntity({ 
        id: 'entity1', 
        name: '用户实体',
        tableName: 'users',
        comment: '用户信息表'
      });
      const entity2 = createTestEntity({ 
        id: 'entity2', 
        name: '订单实体',
        tableName: 'orders',
        comment: '订单信息表'
      });
      
      await StorageService.saveProject(project);
      await StorageService.saveEntity(project.id, entity1);
      await StorageService.saveEntity(project.id, entity2);
    });

    test('应该能够搜索实体', async () => {
      const results = await StorageService.searchEntities('用户');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('用户实体');
    });

    test('应该能够按项目搜索实体', async () => {
      const project = createTestProject();
      await StorageService.saveProject(project);
      
      const results = await StorageService.searchEntities('用户', project.id);
      expect(results).toHaveLength(1);
    });
  });

  describe('统计信息', () => {
    test('应该能够获取统计信息', async () => {
      const project = createTestProject();
      const entity = createTestEntity();
      const aiModel = createTestAIModel();
      
      await StorageService.saveProject(project);
      await StorageService.saveEntity(project.id, entity);
      await StorageService.saveAIModel(aiModel);
      
      const stats = await StorageService.getStatistics();
      
      expect(stats.projectCount).toBe(1);
      expect(stats.entityCount).toBe(1);
      expect(stats.aiModelCount).toBe(1);
      expect(stats.storageInfo).toBeDefined();
    });
  });

  describe('强制刷新', () => {
    test('应该能够强制刷新待处理的更改', async () => {
      const project = createTestProject();
      
      // 触发写入但不等待
      StorageService.saveProject(project);
      
      // 强制刷新
      await StorageService.flush();
      
      const savedProject = await StorageService.getProject(project.id);
      expect(savedProject).toEqual(project);
    });
  });
});
