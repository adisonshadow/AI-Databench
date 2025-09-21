import { IndexedDBManager } from '../db';
import type { StorageOptions } from '../types';
import { waitForAsync } from './testUtils';

describe('IndexedDBManager', () => {
  let dbManager: IndexedDBManager;
  const testOptions: StorageOptions = {
    dbName: 'test-db',
    version: 1,
    storeName: 'test-store'
  };

  beforeEach(() => {
    dbManager = new IndexedDBManager(testOptions);
  });

  afterEach(async () => {
    dbManager.close();
    await waitForAsync(100);
  });

  describe('连接管理', () => {
    test('应该能够成功连接数据库', async () => {
      const db = await dbManager.getConnection();
      expect(db).toBeDefined();
      expect(db.name).toBe('test-db');
      expect(db.version).toBe(1);
    });

    test('应该能够检查数据库可用性', () => {
      expect(dbManager.isAvailable()).toBe(true);
    });

    test('应该能够获取数据库信息', async () => {
      await dbManager.getConnection();
      const info = await dbManager.getDatabaseInfo();
      
      expect(info.name).toBe('test-db');
      expect(info.version).toBe(1);
      expect(info.objectStoreNames).toContain('test-store');
    });

    test('应该能够重新连接', async () => {
      const db1 = await dbManager.getConnection();
      dbManager.close();
      
      const db2 = await dbManager.reconnect();
      expect(db2).toBeDefined();
      expect(db2.name).toBe('test-db');
    });
  });

  describe('数据操作', () => {
    beforeEach(async () => {
      await dbManager.getConnection();
    });

    test('应该能够存储和读取数据', async () => {
      const testData = { name: '测试数据', value: 123 };
      
      await dbManager.set('test-key', testData);
      const result = await dbManager.get('test-key');
      
      expect(result).toEqual(testData);
    });

    test('应该能够更新数据', async () => {
      const initialData = { name: '初始数据' };
      const updatedData = { name: '更新数据', value: 456 };
      
      await dbManager.set('test-key', initialData);
      await dbManager.set('test-key', updatedData);
      
      const result = await dbManager.get('test-key');
      expect(result).toEqual(updatedData);
    });

    test('应该能够删除数据', async () => {
      const testData = { name: '测试数据' };
      
      await dbManager.set('test-key', testData);
      let result = await dbManager.get('test-key');
      expect(result).toEqual(testData);
      
      await dbManager.delete('test-key');
      result = await dbManager.get('test-key');
      expect(result).toBeUndefined();
    });

    test('应该能够清空所有数据', async () => {
      await dbManager.set('key1', { data: 1 });
      await dbManager.set('key2', { data: 2 });
      
      await dbManager.clear();
      
      const result1 = await dbManager.get('key1');
      const result2 = await dbManager.get('key2');
      
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    test('应该能够获取所有键', async () => {
      await dbManager.set('key1', { data: 1 });
      await dbManager.set('key2', { data: 2 });
      
      const keys = await dbManager.getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    test('应该能够获取所有值', async () => {
      const data1 = { data: 1 };
      const data2 = { data: 2 };
      
      await dbManager.set('key1', data1);
      await dbManager.set('key2', data2);
      
      const values = await dbManager.getAll();
      expect(values).toHaveLength(2);
      expect(values).toContainEqual(data1);
      expect(values).toContainEqual(data2);
    });
  });

  describe('错误处理', () => {
    test('应该处理不存在的键', async () => {
      const result = await dbManager.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    test('应该处理复杂数据结构', async () => {
      const complexData = {
        string: 'test',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
        null: null,
        undefined: undefined
      };
      
      await dbManager.set('complex', complexData);
      const result = await dbManager.get('complex');
      
      expect(result).toEqual(complexData);
    });
  });
});
