// src/utils/storage/events.ts
import type { EventType, EventHandler, EventEmitterInterface, Path, DataChangeEvent } from './types';

export class EventEmitter implements EventEmitterInterface {
  private events: Map<EventType, Set<EventHandler>> = new Map();

  /**
   * 订阅事件
   */
  on<T = any>(event: EventType, handler: EventHandler<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * 取消订阅
   */
  off(event: EventType, handler: EventHandler): void {
    if (this.events.has(event)) {
      this.events.get(event)!.delete(handler);
      
      // 如果没有处理器了，删除事件
      if (this.events.get(event)!.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * 触发事件
   */
  emit<T = any>(event: EventType, data: T): void {
    if (this.events.has(event)) {
      this.events.get(event)!.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 清除所有事件订阅
   */
  clear(): void {
    this.events.clear();
  }
}

/**
 * 路径事件发射器 - 支持细粒度订阅
 */
export class PathEventEmitter {
  private emitter = new EventEmitter();
  private pathSeparator = '.';

  /**
   * 将路径转换为字符串
   */
  private pathToString(path: Path): string {
    if (Array.isArray(path)) {
      return path.join(this.pathSeparator);
    }
    return path;
  }

  /**
   * 获取路径的所有父路径
   * 例如: 'projects.list.123.fields.456' 会生成:
   * ['projects', 'projects.list', 'projects.list.123', 'projects.list.123.fields', 'projects.list.123.fields.456']
   */
  private getPathHierarchy(path: string): string[] {
    const parts = path.split(this.pathSeparator);
    const paths: string[] = [];
    
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}${this.pathSeparator}${part}` : part;
      paths.push(currentPath);
    }
    
    return paths;
  }

  /**
   * 订阅特定路径的变更
   */
  on<T = any>(path: Path, handler: EventHandler<DataChangeEvent<T>>): () => void {
    const pathStr = this.pathToString(path);
    return this.emitter.on(pathStr, handler);
  }

  /**
   * 取消订阅
   */
  off(path: Path, handler: EventHandler): void {
    const pathStr = this.pathToString(path);
    this.emitter.off(pathStr, handler);
  }

  /**
   * 触发路径变更事件
   * 会同时触发该路径及其所有父路径的事件
   */
  emit<T = any>(path: Path, value: T, previousValue?: T): void {
    const pathStr = this.pathToString(path);
    const event: DataChangeEvent<T> = {
      path: pathStr,
      value,
      previousValue,
      timestamp: Date.now(),
      source: 'local'
    };

    // 触发精确路径的事件
    this.emitter.emit(pathStr, event);

    // 触发所有父路径的事件
    const pathHierarchy = this.getPathHierarchy(pathStr);
    for (const parentPath of pathHierarchy) {
      if (parentPath !== pathStr) {
        this.emitter.emit(parentPath, {
          ...event,
          path: parentPath
        });
      }
    }

    // 触发全局变更事件
    this.emitter.emit('*', event);
  }

  /**
   * 订阅所有变更
   */
  onAny<T = any>(handler: EventHandler<DataChangeEvent<T>>): () => void {
    return this.emitter.on('*', handler);
  }

  /**
   * 清除所有订阅
   */
  clear(): void {
    this.emitter.clear();
  }
}
