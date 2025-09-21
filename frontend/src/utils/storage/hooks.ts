// src/utils/storage/hooks.ts
import { useState, useEffect, useCallback } from 'react';
import { StorageService } from './index';
import type { Path, DataChangeEvent } from './types';
import type { Project } from './index';

/**
 * 使用存储数据的 Hook
 * @param path 数据路径
 * @returns [数据, 设置数据函数, 加载状态]
 */
export function useStorageData<T>(path: Path): [T | undefined, (value: T) => Promise<void>, boolean] {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await StorageService.getPath<T>(path);
        if (isMounted) {
          setData(result);
        }
      } catch (error) {
        console.error(`加载数据失败 (${path}):`, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    // 订阅数据变更
    const unsubscribe = StorageService.subscribe<T>(path, (event: DataChangeEvent<T>) => {
      if (isMounted) {
        setData(event.value);
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [path]);

  const updateData = useCallback(async (value: T) => {
    await StorageService.setPath(path, value);
  }, [path]);

  return [data, updateData, loading];
}

/**
 * 使用项目数据的 Hook
 * @param projectId 项目ID
 * @returns [项目数据, 设置项目数据函数, 加载状态]
 */
export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    if (!projectId) {
      setProject(null);
      return;
    }

    setLoading(true);
    
    StorageService.getProject(projectId)
      .then((data: Project | null) => {
        if (isMounted) {
          setProject(data);
          setLoading(false);
        }
      })
      .catch((error: Error) => {
        console.error('加载项目失败:', error);
        if (isMounted) {
          setProject(null);
          setLoading(false);
        }
      });

    // 订阅项目变更
    const unsubscribe = StorageService.subscribe(`projects.list.${projectId}`, (event: DataChangeEvent<Project>) => {
      if (isMounted) {
        setProject(event.value);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [projectId]);

  const updateProject = useCallback(async (updatedProject: Project) => {
    if (!updatedProject || !updatedProject.id) {
      return;
    }
    
    await StorageService.saveProject(updatedProject);
  }, []);

  return { project, updateProject, loading };
}

/**
 * 使用活动项目的 Hook
 * @returns [活动项目, 设置活动项目函数, 加载状态]
 */
export function useActiveProject() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadActiveProject = async () => {
      setLoading(true);
      try {
        const project = await StorageService.getActiveProject();
        if (isMounted) {
          setActiveProject(project);
          setActiveProjectId(project?.id || null);
        }
      } catch (error) {
        console.error('加载活动项目失败:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadActiveProject();
    
    // 订阅活动项目变更
    const unsubscribe = StorageService.subscribe('projects.active', async (event: DataChangeEvent<string | null>) => {
      if (!isMounted) return;
      
      const projectId = event.value;
      setActiveProjectId(projectId);
      
      if (projectId) {
        const project = await StorageService.getProject(projectId);
        setActiveProject(project);
      } else {
        setActiveProject(null);
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const changeActiveProject = useCallback(async (projectId: string | null) => {
    await StorageService.setActiveProject(projectId);
  }, []);

  return { activeProject, activeProjectId, changeActiveProject, loading };
}
