// 简单的事件总线，用于组件间通信
class EventBus {
  private events: { [key: string]: Function[] } = {};

  // 订阅事件
  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  // 取消订阅
  off(event: string, callback: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  // 触发事件
  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }
}

// 创建全局事件总线实例
export const eventBus = new EventBus();

// 定义事件类型
export const EVENTS = {
  SEND_MESSAGE_TO_AI_CHAT: 'sendMessageToAIChat'
} as const;
