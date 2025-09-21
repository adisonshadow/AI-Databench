import { renderHook, act } from '@testing-library/react';
import { 
  useStorageData, 
  useProject, 
  useActiveProject 
} from '../hooks';
import { StorageService } from '../index';
import { 
  createTestProject, 
  createTestEntity,
  waitForAsync 
} from './testUtils';

// Mock StorageService
jest.mock('../index', () => ({
  StorageService: {
    getPath: jest.fn(),
    setPath: jest.fn(),
    getProject: jest.fn(),
    getActiveProject: jest.fn(),
    setActiveProject: jest.fn(),
    subscribe: jest.fn(),
  }
}));

const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;

describe('Storage Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useStorageData', () => {
    test('应该能够加载和更新数据', async () => {
      const testData = { value: 'test' };
      mockStorageService.getPath.mockResolvedValue(testData);
      mockStorageService.setPath.mockResolvedValue(undefined);
      
      const mockUnsubscribe = jest.fn();
      mockStorageService.subscribe.mockReturnValue(mockUnsubscribe);
      
      const { result } = renderHook(() => useStorageData('test.path'));
      
      // 等待初始加载
      await act(async () => {
        await waitForAsync(100);
      });
      
      expect(result.current[0]).toEqual(testData);
      expect(result.current[2]).toBe(false); // loading should be false
      
      // 测试更新数据
      await act(async () => {
        await result.current[1]({ value: 'updated' });
      });
      
      expect(mockStorageService.setPath).toHaveBeenCalledWith('test.path', { value: 'updated' });
    });

    test('应该处理加载错误', async () => {
      mockStorageService.getPath.mockRejectedValue(new Error('加载失败'));
      
      const mockUnsubscribe = jest.fn();
      mockStorageService.subscribe.mockReturnValue(mockUnsubscribe);
      
      const { result } = renderHook(() => useStorageData('test.path'));
      
      await act(async () => {
        await waitForAsync(100);
      });
      
      expect(result.current[0]).toBeUndefined();
      expect(result.current[2]).toBe(false); // loading should be false
    });

    test('应该订阅数据变更', async () => {
      const mockUnsubscribe = jest.fn();
      mockStorageService.subscribe.mockReturnValue(mockUnsubscribe);
      
      const { unmount } = renderHook(() => useStorageData('test.path'));
      
      expect(mockStorageService.subscribe).toHaveBeenCalledWith(
        'test.path',
        expect.any(Function)
      );
      
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('useProject', () => {
    test('应该能够加载项目数据', async () => {
      const project = createTestProject();
      mockStorageService.getProject.mockResolvedValue(project);
      
      const mockUnsubscribe = jest.fn();
      mockStorageService.subscribe.mockReturnValue(mockUnsubscribe);
      
      const { result } = renderHook(() => useProject(project.id));
      
      await act(async () => {
        await waitForAsync(100);
      });
      
      expect(result.current.project).toEqual(project);
      expect(result.current.loading).toBe(false);
    });

    test('应该处理空项目ID', () => {
      const { result } = renderHook(() => useProject(null));
      
      expect(result.current.project).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    test('应该能够更新项目', async () => {
      const project = createTestProject();
      mockStorageService.getProject.mockResolvedValue(project);
      mockStorageService.saveProject.mockResolvedValue(undefined);
      
      const mockUnsubscribe = jest.fn();
      mockStorageService.subscribe.mockReturnValue(mockUnsubscribe);
      
      const { result } = renderHook(() => useProject(project.id));
      
      await act(async () => {
        await waitForAsync(100);
      });
      
      const updatedProject = { ...project, name: '更新后的项目' };
      
      await act(async () => {
        await result.current.updateProject(updatedProject);
      });
      
      expect(mockStorageService.saveProject).toHaveBeenCalledWith(updatedProject);
    });
  });

  describe('useActiveProject', () => {
    test('应该能够加载活动项目', async () => {
      const project = createTestProject();
      mockStorageService.getActiveProject.mockResolvedValue(project);
      
      const mockUnsubscribe = jest.fn();
      mockStorageService.subscribe.mockReturnValue(mockUnsubscribe);
      
      const { result } = renderHook(() => useActiveProject());
      
      await act(async () => {
        await waitForAsync(100);
      });
      
      expect(result.current.activeProject).toEqual(project);
      expect(result.current.activeProjectId).toBe(project.id);
      expect(result.current.loading).toBe(false);
    });

    test('应该能够更改活动项目', async () => {
      const project = createTestProject();
      mockStorageService.getActiveProject.mockResolvedValue(null);
      mockStorageService.setActiveProject.mockResolvedValue(undefined);
      
      const mockUnsubscribe = jest.fn();
      mockStorageService.subscribe.mockReturnValue(mockUnsubscribe);
      
      const { result } = renderHook(() => useActiveProject());
      
      await act(async () => {
        await waitForAsync(100);
      });
      
      await act(async () => {
        await result.current.changeActiveProject(project.id);
      });
      
      expect(mockStorageService.setActiveProject).toHaveBeenCalledWith(project.id);
    });

    test('应该处理活动项目变更事件', async () => {
      const project = createTestProject();
      mockStorageService.getActiveProject.mockResolvedValue(null);
      mockStorageService.getProject.mockResolvedValue(project);
      
      let eventHandler: (event: any) => void;
      const mockUnsubscribe = jest.fn();
      mockStorageService.subscribe.mockImplementation((path, handler) => {
        if (path === 'projects.active') {
          eventHandler = handler;
        }
        return mockUnsubscribe;
      });
      
      const { result } = renderHook(() => useActiveProject());
      
      await act(async () => {
        await waitForAsync(100);
      });
      
      // 模拟活动项目变更事件
      await act(async () => {
        eventHandler({ value: project.id });
        await waitForAsync(100);
      });
      
      expect(result.current.activeProjectId).toBe(project.id);
      expect(result.current.activeProject).toEqual(project);
    });
  });
});
