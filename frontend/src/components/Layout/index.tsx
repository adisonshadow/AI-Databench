import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Button, Space, Typography } from 'antd';
import { 
  DesktopOutlined, 
  SettingOutlined,
  ApiOutlined,
  DatabaseOutlined 
} from '@ant-design/icons';
import { StorageService } from '@/stores/storage';
import type { Project } from '@/types/storage';

const { Content, Header } = AntLayout;
const { Title } = Typography;

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  useEffect(() => {
    // 初始化localStorage
    StorageService.initialize();
  }, []);

  useEffect(() => {
    // 当路径改变时，检查是否在设计器页面并加载项目信息
    if (isDesignerPage) {
      const pathParts = location.pathname.split('/');
      const projectId = pathParts[2];
      if (projectId) {
        const project = StorageService.getProject(projectId);
        setCurrentProject(project);
      }
    } else {
      setCurrentProject(null);
    }
  }, [location.pathname]);

  // 判断是否在ORM设计器页面
  const isDesignerPage = location.pathname.startsWith('/project/');
  
  // 获取当前激活的tab
  const getCurrentTab = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts.length >= 4) {
      return pathParts[3]; // migration 或 api
    }
    return 'model'; // 默认是模型设计
  };

  // 处理设置按钮点击
  const handleSettingsClick = () => {
    // 暂时不实现具体功能，按用户要求
    console.log('设置按钮被点击');
  };
  
  // 如果在项目管理页面，使用简单布局
  if (location.pathname === '/') {
    return (
      <AntLayout style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#141414' }}>
        <Content style={{ padding: '0px', width: '100%' }}>
          <div style={{ 
            background: '#1f1f1f', 
            minHeight: 'calc(100vh - 48px)',
            borderRadius: '8px',
            padding: '0px',
            width: '100%'
          }}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    );
  }

  // 如果在设计器页面，显示自定义顶部导航
  if (isDesignerPage) {
    const pathParts = location.pathname.split('/');
    const projectId = pathParts[2];
    const currentTab = getCurrentTab();

    return (
      <AntLayout style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#141414' }}>
        <Header style={{ 
          backgroundColor: '#1f1f1f', 
          borderBottom: '1px solid #303030',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px'
        }}>
          {/* 左侧 Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.svg" alt="AIDatabench" style={{ height: '32px', marginRight: '16px' }} />
            <span style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>AIDatabench</span>
          </div>

          {/* 中间项目名称 */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
              {currentProject?.name || '项目名称'}
            </Title>
          </div>

          {/* 右侧导航和设置 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Space size={2}>
              <Button
                type={currentTab === 'model' ? 'primary' : 'text'}
                icon={<DesktopOutlined />}
                onClick={() => navigate(`/project/${projectId}`)}
                style={{ color: currentTab === 'model' ? undefined : '#fff' }}
              >
                模型
              </Button>
              <Button
                type={currentTab === 'migration' ? 'primary' : 'text'}
                icon={<DatabaseOutlined />}
                onClick={() => navigate(`/project/${projectId}/migration`)}
                style={{ color: currentTab === 'migration' ? undefined : '#fff' }}
              >
                物化
              </Button>
              <Button
                type={currentTab === 'api' ? 'primary' : 'text'}
                icon={<ApiOutlined />}
                onClick={() => navigate(`/project/${projectId}/api`)}
                style={{ color: currentTab === 'api' ? undefined : '#fff' }}
              >
                服务
              </Button>
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={handleSettingsClick}
                style={{ color: '#fff' }}
              >
                设置
              </Button>
            </Space>
          </div>
        </Header>
        
        <Content style={{ margin: '10px', overflow: 'initial' }}>
          <div style={{ 
            background: '#1f1f1f', 
            minHeight: 'calc(100vh - 75px)',
            borderRadius: '8px'
          }}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    );
  }

  // 其他页面使用 ProLayout
};

export default Layout;