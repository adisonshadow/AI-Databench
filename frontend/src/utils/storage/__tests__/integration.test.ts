import { StorageService } from '../index';
import { 
  createTestProject, 
  createTestEntity, 
  createTestAIModel,
  waitForAsync,
  simulateUserDelay
} from './testUtils';

describe('StorageService 集成测试', () => {
  beforeEach(async () => {
    await StorageService.initialize();
  });

  afterEach(async () => {
    await StorageService.clear();
  });

  describe('完整工作流程', () => {
    test('应该支持完整的项目创建和管理流程', async () => {
      // 1. 创建项目
      const project = createTestProject({
        name: '测试项目',
        description: '这是一个完整的测试项目'
      });
      
      await StorageService.saveProject(project);
      
      // 2. 设置为活动项目
      await StorageService.setActiveProject(project.id);
      const activeProject = await StorageService.getActiveProject();
      expect(activeProject?.id).toBe(project.id);
      
      // 3. 添加实体
      const entity1 = createTestEntity({
        id: 'user',
        name: '用户实体',
        tableName: 'users',
        comment: '用户信息表'
      });
      
      const entity2 = createTestEntity({
        id: 'order',
        name: '订单实体',
        tableName: 'orders',
        comment: '订单信息表'
      });
      
      await StorageService.saveEntity(project.id, entity1);
      await StorageService.saveEntity(project.id, entity2);
      
      // 4. 验证实体保存
      const savedEntity1 = await StorageService.getEntity(project.id, entity1.id);
      const savedEntity2 = await StorageService.getEntity(project.id, entity2.id);
      
      expect(savedEntity1).toEqual(entity1);
      expect(savedEntity2).toEqual(entity2);
      
      // 5. 添加AI模型
      const aiModel = createTestAIModel({
        name: 'GPT-4',
        provider: 'openai',
        config: {
          apiKey: 'sk-test-key',
          model: 'gpt-4'
        }
      });
      
      await StorageService.saveAIModel(aiModel);
      await StorageService.setActiveAIModel(aiModel.id);
      
      // 6. 验证AI模型
      const activeModel = await StorageService.getActiveAIModel();
      expect(activeModel?.id).toBe(aiModel.id);
      
      // 7. 更新用户偏好
      await StorageService.updatePreferences({
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
      });
      
      const preferences = await StorageService.getPreferences();
      expect(preferences.ui.sidebarCollapsed).toBe(true);
      
      // 8. 搜索功能测试
      const searchResults = await StorageService.searchEntities('用户');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('用户实体');
      
      // 9. 获取统计信息
      const stats = await StorageService.getStatistics();
      expect(stats.projectCount).toBe(1);
      expect(stats.entityCount).toBe(2);
      expect(stats.aiModelCount).toBe(1);
      
      // 10. 数据备份
      const backup = await StorageService.backup();
      const parsedBackup = JSON.parse(backup);
      expect(parsedBackup.projects.list[project.id]).toBeDefined();
      expect(parsedBackup.aiModels.configs[aiModel.id]).toBeDefined();
    });
  });

  describe('并发操作', () => {
    test('应该处理并发写入操作', async () => {
      const project = createTestProject();
      
      // 并发保存多个项目
      const promises = Array.from({ length: 5 }, (_, i) => 
        StorageService.saveProject(createTestProject({ 
          id: `project-${i}`, 
          name: `项目 ${i}` 
        }))
      );
      
      await Promise.all(promises);
      
      const projects = await StorageService.listProjects();
      expect(projects).toHaveLength(5);
    });

    test('应该处理并发实体操作', async () => {
      const project = createTestProject();
      await StorageService.saveProject(project);
      
      // 并发保存多个实体
      const promises = Array.from({ length: 10 }, (_, i) => 
        StorageService.saveEntity(project.id, createTestEntity({ 
          id: `entity-${i}`, 
          name: `实体 ${i}` 
        }))
      );
      
      await Promise.all(promises);
      
      const projectData = await StorageService.getProject(project.id);
      expect(Object.keys(projectData!.schema.entities)).toHaveLength(10);
    });
  });

  describe('数据一致性', () => {
    test('应该保持数据一致性', async () => {
      const project = createTestProject();
      await StorageService.saveProject(project);
      
      // 模拟快速连续更新
      for (let i = 0; i < 10; i++) {
        const updatedProject = {
          ...project,
          name: `项目 ${i}`,
          updatedAt: new Date().toISOString()
        };
        await StorageService.saveProject(updatedProject);
        await simulateUserDelay();
      }
      
      const finalProject = await StorageService.getProject(project.id);
      expect(finalProject?.name).toBe('项目 9');
    });

    test('应该处理路径操作的一致性', async () => {
      // 设置嵌套路径数据
      await StorageService.setPath('test.nested.data', { value: 'test' });
      await StorageService.setPath('test.nested.count', 42);
      
      // 验证数据
      const data = await StorageService.getPath('test.nested.data');
      const count = await StorageService.getPath('test.nested.count');
      
      expect(data).toEqual({ value: 'test' });
      expect(count).toBe(42);
      
      // 更新数据
      await StorageService.setPath('test.nested.data.value', 'updated');
      
      const updatedData = await StorageService.getPath('test.nested.data');
      expect(updatedData).toEqual({ value: 'updated' });
    });
  });

  describe('错误恢复', () => {
    test('应该能够从错误中恢复', async () => {
      const project = createTestProject();
      
      // 正常保存
      await StorageService.saveProject(project);
      
      // 强制刷新以确保数据写入
      await StorageService.flush();
      
      // 验证数据存在
      const savedProject = await StorageService.getProject(project.id);
      expect(savedProject).toEqual(project);
      
      // 清空并重新初始化
      await StorageService.clear();
      await StorageService.initialize();
      
      // 重新保存数据
      await StorageService.saveProject(project);
      
      const recoveredProject = await StorageService.getProject(project.id);
      expect(recoveredProject).toEqual(project);
    });
  });

  describe('性能测试', () => {
    test('应该能够处理大量数据', async () => {
      const startTime = Date.now();
      
      // 创建大量项目
      const projects = Array.from({ length: 100 }, (_, i) => 
        createTestProject({ 
          id: `project-${i}`, 
          name: `项目 ${i}` 
        })
      );
      
      // 批量保存
      for (const project of projects) {
        await StorageService.saveProject(project);
      }
      
      const saveTime = Date.now() - startTime;
      console.log(`保存100个项目耗时: ${saveTime}ms`);
      
      // 验证数据
      const allProjects = await StorageService.listProjects();
      expect(allProjects).toHaveLength(100);
      
      // 测试搜索性能
      const searchStartTime = Date.now();
      const searchResults = await StorageService.searchEntities('项目');
      const searchTime = Date.now() - searchStartTime;
      console.log(`搜索耗时: ${searchTime}ms`);
      
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });
});
