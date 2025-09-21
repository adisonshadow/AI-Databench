// src/utils/storage/db.ts
import type { StorageOptions } from './types';

export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private version: number;
  private storeName: string;
  private connecting: Promise<IDBDatabase> | null = null;
  private connectionTimeout: number = 10000; // 10秒超时

  constructor(options: StorageOptions) {
    this.dbName = options.dbName;
    this.version = options.version;
    this.storeName = options.storeName;
  }

  /**
   * 获取数据库连接
   */
  async getConnection(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = this.openDatabase();
    return this.connecting;
  }

  /**
   * 打开数据库连接
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('数据库连接超时'));
        this.connecting = null;
      }, this.connectionTimeout);

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (event) => {
        clearTimeout(timeout);
        console.error('数据库连接失败:', event);
        reject(new Error('数据库连接失败'));
        this.connecting = null;
      };

      request.onsuccess = (event) => {
        clearTimeout(timeout);
        this.db = (event.target as IDBOpenDBRequest).result;
        
        // 监听数据库关闭事件
        this.db.onclose = () => {
          this.db = null;
          this.connecting = null;
        };
        
        // 监听数据库错误事件
        this.db.onerror = (event) => {
          console.error('数据库错误:', event);
        };
        
        resolve(this.db);
        this.connecting = null;
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          // 检查对象存储是否存在
          if (!db.objectStoreNames.contains(this.storeName)) {
            // 创建对象存储
            db.createObjectStore(this.storeName);
            console.log(`创建对象存储: ${this.storeName}`);
          }
          
          // 可以在这里添加索引
          // const store = transaction.objectStore(this.storeName);
          // store.createIndex('timestamp', 'timestamp', { unique: false });
          
        } catch (error) {
          console.error('数据库升级失败:', error);
          reject(error);
        }
      };

      request.onblocked = () => {
        console.warn('数据库升级被阻塞，请关闭其他标签页');
        // 可以在这里显示用户提示
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.connecting = null;
  }

  /**
   * 检查数据库是否可用
   */
  isAvailable(): boolean {
    return 'indexedDB' in window;
  }

  /**
   * 强制重新连接
   */
  async reconnect(): Promise<IDBDatabase> {
    this.close();
    return this.getConnection();
  }

  /**
   * 获取数据库信息
   */
  async getDatabaseInfo(): Promise<{
    name: string;
    version: number;
    objectStoreNames: string[];
    size?: number;
  }> {
    const db = await this.getConnection();
    return {
      name: db.name,
      version: db.version,
      objectStoreNames: Array.from(db.objectStoreNames)
    };
  }

  /**
   * 获取事务
   */
  async getTransaction(mode: IDBTransactionMode = 'readonly'): Promise<IDBTransaction> {
    const db = await this.getConnection();
    return db.transaction(this.storeName, mode);
  }

  /**
   * 获取对象存储
   */
  async getObjectStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const transaction = await this.getTransaction(mode);
    return transaction.objectStore(this.storeName);
  }

  /**
   * 执行读取操作
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const store = await this.getObjectStore('readonly');
      return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result as T);
        };

        request.onerror = (event) => {
          console.error('读取数据失败:', event);
          reject(new Error('读取数据失败'));
        };
      });
    } catch (error) {
      console.error('获取对象存储失败:', error);
      throw new Error('数据库操作失败');
    }
  }

  /**
   * 执行写入操作
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const store = await this.getObjectStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.put(value, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (event) => {
          console.error('写入数据失败:', event);
          reject(new Error('写入数据失败'));
        };
      });
    } catch (error) {
      console.error('获取对象存储失败:', error);
      throw new Error('数据库操作失败');
    }
  }

  /**
   * 执行删除操作
   */
  async delete(key: string): Promise<void> {
    try {
      const store = await this.getObjectStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (event) => {
          console.error('删除数据失败:', event);
          reject(new Error('删除数据失败'));
        };
      });
    } catch (error) {
      console.error('获取对象存储失败:', error);
      throw new Error('数据库操作失败');
    }
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    try {
      const store = await this.getObjectStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (event) => {
          console.error('清空数据失败:', event);
          reject(new Error('清空数据失败'));
        };
      });
    } catch (error) {
      console.error('获取对象存储失败:', error);
      throw new Error('数据库操作失败');
    }
  }

  /**
   * 获取所有键
   */
  async getAllKeys(): Promise<string[]> {
    const store = await this.getObjectStore('readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = (event) => {
        console.error('获取所有键失败:', event);
        reject(new Error('获取所有键失败'));
      };
    });
  }

  /**
   * 获取所有值
   */
  async getAll<T>(): Promise<T[]> {
    const store = await this.getObjectStore('readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = (event) => {
        console.error('获取所有值失败:', event);
        reject(new Error('获取所有值失败'));
      };
    });
  }
}
