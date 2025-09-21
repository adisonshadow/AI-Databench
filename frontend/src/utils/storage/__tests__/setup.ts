// 测试环境设置
import 'fake-indexeddb/auto';

// 添加 structuredClone polyfill
if (!('structuredClone' in globalThis)) {
  (globalThis as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// 模拟 BroadcastChannel API
if (!('BroadcastChannel' in window)) {
  (window as any).BroadcastChannel = class MockBroadcastChannel {
    private listeners: Array<(event: any) => void> = [];
    
    constructor(public name: string) {}
    
    postMessage(data: any) {
      // 模拟异步消息传递
      setTimeout(() => {
        this.listeners.forEach(listener => {
          listener({ data });
        });
      }, 0);
    }
    
    addEventListener(type: string, listener: (event: any) => void) {
      if (type === 'message') {
        this.listeners.push(listener);
      }
    }
    
    removeEventListener(type: string, listener: (event: any) => void) {
      if (type === 'message') {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      }
    }
    
    close() {
      this.listeners = [];
    }
  };
}

// 全局测试工具函数
declare global {
  interface Window {
    testUtils: {
      clearIndexedDB: () => Promise<void>;
      waitFor: (ms: number) => Promise<void>;
    };
  }
}

// 清理 IndexedDB 的工具函数
window.testUtils = {
  clearIndexedDB: async () => {
    return new Promise((resolve) => {
      const deleteReq = indexedDB.deleteDatabase('aidatabench');
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => resolve(); // 即使失败也继续
    });
  },
  
  waitFor: (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// 在每个测试前清理数据库
beforeEach(async () => {
  await window.testUtils.clearIndexedDB();
});
