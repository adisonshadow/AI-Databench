import { PathEventEmitter } from '../events';
import { waitForAsync } from './testUtils';

describe('PathEventEmitter', () => {
  let emitter: PathEventEmitter;

  beforeEach(() => {
    emitter = new PathEventEmitter();
  });

  afterEach(() => {
    emitter.clear();
  });

  describe('基本事件功能', () => {
    test('应该能够订阅和触发事件', async () => {
      const handler = jest.fn();
      const unsubscribe = emitter.on('test.path', handler);
      
      emitter.emit('test.path', 'test-value');
      await waitForAsync(10);
      
      expect(handler).toHaveBeenCalledWith({
        path: 'test.path',
        value: 'test-value',
        previousValue: undefined,
        timestamp: expect.any(Number),
        source: 'local'
      });
      
      unsubscribe();
    });

    test('应该能够取消订阅', async () => {
      const handler = jest.fn();
      const unsubscribe = emitter.on('test.path', handler);
      
      unsubscribe();
      emitter.emit('test.path', 'test-value');
      await waitForAsync(10);
      
      expect(handler).not.toHaveBeenCalled();
    });

    test('应该能够触发多个处理器', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on('test.path', handler1);
      emitter.on('test.path', handler2);
      
      emitter.emit('test.path', 'test-value');
      await waitForAsync(10);
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('路径层次结构', () => {
    test('应该触发父路径事件', async () => {
      const parentHandler = jest.fn();
      const childHandler = jest.fn();
      
      emitter.on('projects', parentHandler);
      emitter.on('projects.list', childHandler);
      
      emitter.emit('projects.list.project1', 'project-data');
      await waitForAsync(10);
      
      expect(parentHandler).toHaveBeenCalledTimes(1);
      expect(childHandler).toHaveBeenCalledTimes(1);
    });

    test('应该触发全局事件', async () => {
      const globalHandler = jest.fn();
      emitter.onAny(globalHandler);
      
      emitter.emit('projects.list.project1', 'project-data');
      await waitForAsync(10);
      
      expect(globalHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('数组路径支持', () => {
    test('应该支持数组路径', async () => {
      const handler = jest.fn();
      emitter.on(['projects', 'list', 'project1'], handler);
      
      emitter.emit(['projects', 'list', 'project1'], 'project-data');
      await waitForAsync(10);
      
      expect(handler).toHaveBeenCalledWith({
        path: 'projects.list.project1',
        value: 'project-data',
        previousValue: undefined,
        timestamp: expect.any(Number),
        source: 'local'
      });
    });
  });

  describe('错误处理', () => {
    test('应该处理处理器错误', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('处理器错误');
      });
      const normalHandler = jest.fn();
      
      emitter.on('test.path', errorHandler);
      emitter.on('test.path', normalHandler);
      
      // 不应该抛出错误
      expect(() => {
        emitter.emit('test.path', 'test-value');
      }).not.toThrow();
      
      await waitForAsync(10);
      
      expect(normalHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('清理功能', () => {
    test('应该能够清除所有订阅', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on('path1', handler1);
      emitter.on('path2', handler2);
      
      emitter.clear();
      
      emitter.emit('path1', 'value1');
      emitter.emit('path2', 'value2');
      await waitForAsync(10);
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});
