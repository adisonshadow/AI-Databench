import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Button, Space, Divider, Tooltip, Splitter } from 'antd';
import { 
  DesktopOutlined, 
  SettingOutlined,
  ApiOutlined,
  DatabaseOutlined,
  LeftOutlined
} from '@ant-design/icons';
import { StorageService } from '@/stores/storage';
import type { Project } from '@/types/storage';
import AISelector from '@/components/AISelector';
import AIChatInterface from '@/components/AIAssistant/AIChatInterface';
import { eventBus, EVENTS } from '@/utils/eventBus';
// import { ResizableLayout, ResizablePanel, ResizableHandle } from '@/components/ResizableLayout';

const { Content, Header } = AntLayout;

const LayoutContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectUpdateKey, setProjectUpdateKey] = useState(0);
  const [externalMessage, setExternalMessage] = useState<string>('');
  
  // 判断是否在ORM设计器页面
  const isDesignerPage = location.pathname.startsWith('/project/');
  
  useEffect(() => {
    // 初始化localStorage
    StorageService.initialize();
  }, []);

  // 监听发送消息到AI Chat的事件
  useEffect(() => {
    const handleSendMessage = (message: string) => {
      console.log('📨 Layout收到事件总线消息:', message);
      sendMessageToAIChat(message);
    };

    eventBus.on(EVENTS.SEND_MESSAGE_TO_AI_CHAT, handleSendMessage);

    return () => {
      eventBus.off(EVENTS.SEND_MESSAGE_TO_AI_CHAT, handleSendMessage);
    };
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
  }, [location.pathname, isDesignerPage, projectUpdateKey]);
  
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


  // 处理项目更新
  const handleProjectUpdate = (updatedProject: Project) => {
    // 更新当前项目状态
    setCurrentProject(updatedProject);
    // 触发重新渲染，通知子组件项目已更新
    setProjectUpdateKey(prev => prev + 1);
  };

  // 发送外部消息到AI Chat
  const sendMessageToAIChat = (message: string) => {
    console.log('📤 Layout发送消息到AIChatInterface:', message);
    setExternalMessage(message);
  };

  // 处理外部消息发送完成
  const handleExternalMessageSent = () => {
    setExternalMessage(''); // 清空消息
  };
  
  // 如果在项目管理页面，使用简单布局
  if (location.pathname === '/') {
    return (
      <AntLayout style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#141414' }}>
        <Content style={{ padding: '0px', width: '100%' }}>
          <div style={{ 
            background: '#1f1f1f', 
            minHeight: 'calc(100vh - 48px)',
            height: '100%',
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
            <Tooltip title="Back to Projects">
              <Button type="text" icon={<LeftOutlined />} onClick={() => navigate('/')} />
            </Tooltip>
            {/* <img src="/logo.svg" alt="AIDatabench" style={{ height: '32px' }} /> */}
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
                Model Design
              </Button>
              <Button
                type="text"
                icon={<DatabaseOutlined />}
                onClick={() => navigate(`/project/${projectId}/migration`)}
                className={`nav-menu-button ${currentTab === 'migration' ? 'active' : ''}`}
              >
                Migration
              </Button>
              <Button
                type="text"
                icon={<ApiOutlined />}
                onClick={() => navigate(`/project/${projectId}/api`)}
                className={`nav-menu-button ${currentTab === 'api' ? 'active' : ''}`}
              >
                API Generation
              </Button>
              {/* AISelector 组件 */}
              <AISelector 
                style={{ margin: '0 8px', width: '100px' }}
                onChange={(modelId) => {
                  console.log('Selected AI Model:', modelId);
                  // aiModelSelected 会自动处理模型选择
                }}
              />
              {/* <Button
                type={aiChatVisible ? 'primary' : 'text'}
                icon={<MessageOutlined />}
                onClick={handleAiChatClick}
                style={{ color: aiChatVisible ? undefined : '#fff' }}
              /> */}
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={handleSettingsClick}
                style={{ color: '#fff' }}
              />
            </Space>
          </div>
        </Header>
        
        <Splitter style={{ height: 'calc(100vh - 50px)' }}>
          <Splitter.Panel>
            <div style={{ 
              // background: '#1f1f1f', 
              // minHeight: 'calc(100vh - 50px)',
              overflow: 'auto',
              // borderRadius: '8px',
              height: '100%'
            }}>
              <Outlet />
            </div>
          </Splitter.Panel>
          
          {/* AI聊天界面 Sider */}
          <Splitter.Panel 
              // className={`${aiChatVisible?'':'ant-splitter-panel-hidden'}`} 
              defaultSize={320} 
              min="20%" 
              max="70%"
              collapsible
            >
            {/* {aiChatVisible && ( */}
              <AIChatInterface 
                style={{ height: '100%'}}
                onProjectUpdate={handleProjectUpdate}
                externalMessage={externalMessage}
                onExternalMessageSent={handleExternalMessageSent}
              />
            {/* )} */}
          </Splitter.Panel>
        </Splitter>
      </AntLayout>
    );
  }

  // 其他页面使用 ProLayout
};

export default LayoutContent;