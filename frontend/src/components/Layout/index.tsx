import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Button, Space, Divider, Tooltip } from 'antd';
import { 
  DesktopOutlined, 
  SettingOutlined,
  ApiOutlined,
  DatabaseOutlined,
  LeftOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { StorageService } from '@/stores/storage';
import type { Project } from '@/types/storage';
import AISelector from '@/components/AISelector';
import AIChatInterface from '@/components/AIAssistant/AIChatInterface';
import { ResizableLayout, ResizablePanel, ResizableHandle } from '@/components/ResizableLayout';

const { Content, Header } = AntLayout;

const LayoutContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [aiChatVisible, setAiChatVisible] = useState(true);
  
  // 判断是否在ORM设计器页面
  const isDesignerPage = location.pathname.startsWith('/project/');
  
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
  }, [location.pathname, isDesignerPage]);
  
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

  // 处理AI聊天按钮点击
  const handleAiChatClick = () => {
    setAiChatVisible(!aiChatVisible);
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
          backgroundColor: '#262626', 
          // borderBottom: '1px solid #303030',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px'
        }}>
          {/* 左侧 Logo */}
          <Space align="center" style={{ justifyContent: 'center' }}>
            <Tooltip title="返回首页">
              <Button type="text" icon={<LeftOutlined />} onClick={() => navigate('/')} />
            </Tooltip>
            <img src="/logo.svg" alt="AIDatabench" style={{ height: '32px' }} />
            <Divider type="vertical" />
            <span style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{currentProject?.name || '项目名称'}</span>
          </Space>

          {/* 中间项目名称 */}
          {/* <div style={{ flex: 1, textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
              {currentProject?.name || '项目名称'}
            </Title>
          </div> */}

          {/* 右侧导航和设置 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Space size={2}>
              <Button
                type="text"
                icon={<DesktopOutlined />}
                onClick={() => navigate(`/project/${projectId}`)}
                className={`nav-menu-button ${currentTab === 'model' ? 'active' : ''}`}
              >
                模型
              </Button>
              <Button
                type="text"
                icon={<DatabaseOutlined />}
                onClick={() => navigate(`/project/${projectId}/migration`)}
                className={`nav-menu-button ${currentTab === 'migration' ? 'active' : ''}`}
              >
                物化
              </Button>
              <Button
                type="text"
                icon={<ApiOutlined />}
                onClick={() => navigate(`/project/${projectId}/api`)}
                className={`nav-menu-button ${currentTab === 'api' ? 'active' : ''}`}
              >
                服务
              </Button>
              {/* AISelector 组件 */}
              <AISelector 
                style={{ margin: '0 8px', width: '100px' }}
                onChange={(modelId) => {
                  console.log('Selected AI Model:', modelId);
                  // aiModelSelected 会自动处理模型选择
                }}
              />
              <Button
                type={aiChatVisible ? 'primary' : 'text'}
                icon={<MessageOutlined />}
                onClick={handleAiChatClick}
                style={{ color: aiChatVisible ? undefined : '#fff' }}
              />
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={handleSettingsClick}
                style={{ color: '#fff' }}
              />
            </Space>
          </div>
        </Header>
        
        <ResizableLayout style={{ height: 'calc(100vh - 50px)' }}>
          <Content style={{ margin: '0px', overflow: 'auto', flex: 1 }}>
            <div style={{ 
              background: '#1f1f1f', 
              minHeight: 'calc(100vh - 75px)',
              // borderRadius: '8px',
              height: '100%'
            }}>
              <Outlet />
            </div>
          </Content>
          
          {/* AI聊天界面 Sider */}
          {aiChatVisible && (
            <>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={320}
                minSize={280}
                maxSize={500}
                style={{
                  backgroundColor: '#1f1f1f',
                  borderLeft: '1px solid #303030'
                }}
              >
                <AIChatInterface 
                  visible={aiChatVisible}
                  onClose={() => setAiChatVisible(false)}
                  style={{ height: '100%' }}
                />
              </ResizablePanel>
            </>
          )}
        </ResizableLayout>
      </AntLayout>
    );
  }

  // 其他页面使用 ProLayout
};

export default LayoutContent;