import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  List, 
  Button, 
  Typography, 
  Space 
} from 'antd';
import { 
  ProjectOutlined, 
  DatabaseOutlined, 
  ApiOutlined, 
  RobotOutlined 
} from '@ant-design/icons';
import { StorageService } from '@/stores/storage';
import type { Project } from '@/types/storage';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    projectCount: 0,
    entityCount: 0,
    relationCount: 0,
    aiModelCount: 0
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  useEffect(() => {
    // 加载统计信息
    const statistics = StorageService.getStatistics();
    setStats(statistics);

    // 加载最近的项目
    const preferences = StorageService.getPreferences();
    const recent = preferences.ui.recentProjects
      .map(id => StorageService.getProject(id))
      .filter(Boolean) as Project[];
    setRecentProjects(recent);
  }, []);

  const handleCreateProject = () => {
    window.location.href = '/projects';
  };

  const handleOpenDesigner = () => {
    window.location.href = '/designer';
  };

  return (
    <div>
      <Title level={2}>欢迎使用 AIDatabench</Title>
      <Text type="secondary">
        AI驱动的数据库设计工具，让ORM设计变得更加智能和高效
      </Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 统计卡片 */}
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="项目数量"
              value={stats.projectCount}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="实体数量"
              value={stats.entityCount}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="关系数量"
              value={stats.relationCount}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="AI模型"
              value={stats.aiModelCount}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 快速操作 */}
        <Col xs={24} md={12}>
          <Card title="快速开始" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                size="large" 
                block
                onClick={handleCreateProject}
              >
                创建新项目
              </Button>
              <Button 
                size="large" 
                block
                onClick={handleOpenDesigner}
              >
                打开ORM设计器
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 最近项目 */}
        <Col xs={24} md={12}>
          <Card title="最近项目" bordered={false}>
            {recentProjects.length > 0 ? (
              <List
                dataSource={recentProjects}
                renderItem={(project) => (
                  <List.Item
                    actions={[
                      <a
                        key="open"
                        onClick={() => {
                          StorageService.setActiveProject(project.id);
                          window.location.href = `/designer/${project.id}`;
                        }}
                      >
                        打开
                      </a>
                    ]}
                  >
                    <List.Item.Meta
                      title={project.name}
                      description={project.description || '无描述'}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">暂无最近项目</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;