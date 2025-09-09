import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Empty, Spin } from 'antd';
import { StorageService } from '@/stores/storage';
import type { Project } from '@/types/storage';

const ApiGenerator: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      navigate('/');
      return;
    }

    const loadProject = async () => {
      setLoading(true);
      try {
        const projectData = StorageService.getProject(projectId);
        if (!projectData) {
          throw new Error('项目不存在');
        }
        setProject(projectData);
      } catch (error) {
        console.error('Failed to load project:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载项目中...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="服务生成功能正在开发中"
        >
          <div style={{ color: '#8c8c8c', marginTop: 16 }}>
            <div>已生成的API：{Object.keys(project.generated.apis).length} 个</div>
            <div>迁移脚本：{project.generated.migrations.length} 个</div>
          </div>
        </Empty>
      </Card>
    </div>
  );
};

export default ApiGenerator;