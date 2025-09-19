import { useState, useEffect } from 'react';
import { StorageService } from './storage';
import type { Project } from '@/types/storage';

// AI聊天上下文类型
export interface AIChatContext {
  id: string;
  type: 'entity' | 'field' | 'index' | 'relation';
  entityCode: string;
  entityName: string;
  fieldCode?: string;
  fieldName?: string;
  description: string;
}

// 全局项目状态管理
class ProjectStore {
  private listeners: Set<() => void> = new Set();
  private currentProjectId: string | null = null;
  private aiChatContexts: AIChatContext[] = [];
  private isPaused: boolean = false; // 添加暂停状态

  // 订阅项目更新
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 通知所有监听者项目已更新
  notifyUpdate() {
    if (this.isPaused) {
      console.log('🔍 projectStore通知被暂停，跳过');
      return;
    }
    this.listeners.forEach(listener => listener());
  }

  // 暂停通知
  pauseNotifications() {
    console.log('🔍 暂停projectStore通知');
    this.isPaused = true;
  }

  // 恢复通知
  resumeNotifications() {
    console.log('🔍 恢复projectStore通知');
    this.isPaused = false;
  }

  // 设置当前项目ID
  setCurrentProjectId(projectId: string | null) {
    this.currentProjectId = projectId;
  }

  // 获取当前项目ID
  getCurrentProjectId() {
    return this.currentProjectId;
  }

  // 获取当前项目
  getCurrentProject(): Project | null {
    if (!this.currentProjectId) return null;
    return StorageService.getProject(this.currentProjectId);
  }

  // AI聊天上下文管理
  addAIChatContext(context: AIChatContext) {
    // 检查是否已存在相同的上下文
    const exists = this.aiChatContexts.some(c => 
      c.type === context.type && 
      c.entityCode === context.entityCode && 
      c.fieldCode === context.fieldCode
    );
    
    if (!exists) {
      this.aiChatContexts.push(context);
      this.notifyUpdate();
    }
  }

  removeAIChatContext(contextId: string) {
    this.aiChatContexts = this.aiChatContexts.filter(c => c.id !== contextId);
    this.notifyUpdate();
  }

  getAIChatContexts(): AIChatContext[] {
    return [...this.aiChatContexts];
  }

  clearAIChatContexts() {
    this.aiChatContexts = [];
    this.notifyUpdate();
  }
}

export const projectStore = new ProjectStore();

// React Hook for using project store
export const useProjectStore = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = projectStore.subscribe(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  return {
    getCurrentProject: () => projectStore.getCurrentProject(),
    getCurrentProjectId: () => projectStore.getCurrentProjectId(),
    notifyUpdate: () => projectStore.notifyUpdate(),
    setCurrentProjectId: (id: string | null) => projectStore.setCurrentProjectId(id),
    pauseNotifications: () => projectStore.pauseNotifications(),
    resumeNotifications: () => projectStore.resumeNotifications()
  };
};

// 简化的Hook，只用于获取项目数据，不订阅更新
export const useProjectData = (projectId: string | null) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }

    setLoading(true);
    try {
      const projectData = StorageService.getProject(projectId);
      setProject(projectData);
    } catch (error) {
      console.error('Failed to load project:', error);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { project, loading };
};
