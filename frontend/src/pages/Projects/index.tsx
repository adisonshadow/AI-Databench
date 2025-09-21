import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Modal, 
  Form, 
  Input, 
  message, 
  Popconfirm,
  Empty,
  Row,
  Col,
  Space,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  FolderOpenOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '@/stores/storage';
import type { Project } from '@/types/storage';

const { Title, Text } = Typography;
const { Meta } = Card;

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  // 加载项目列表
  const loadProjects = () => {
    try {
      const projectList = StorageService.listProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
      message.error('Failed to load projects');
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // 创建或编辑项目
  const handleSubmit = async (values: { name: string; description?: string }) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      if (editingProject) {
        // 编辑项目
        const updatedProject: Project = {
          ...editingProject,
          name: values.name,
          description: values.description,
          updatedAt: now
        };
        StorageService.saveProject(updatedProject);
        message.success('Project updated successfully');
      } else {
        // 创建新项目
        const newProject: Project = {
          id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: values.name,
          description: values.description || '',
          createdAt: now,
          updatedAt: now,
          version: '1.0.0',
          config: {
            database: {
              id: 'default',
              name: 'Default Database',
              type: 'mysql',
              connection: {
                host: 'localhost',
                port: 3306,
                username: 'root',
                password: '',
                database: 'aidatabench'
              },
              status: 'disconnected',
              lastTested: now
            },
            ai: {
              enabled: true,
              defaultModel: 'gpt-3.5-turbo',
              autoSuggestion: true,
              confidenceThreshold: 0.8
            }
          },
          schema: {
            entities: {},
            enums: {},
            relations: []
          },
          layout: {
            nodes: [],
            edges: [],
            viewport: {
              x: 0,
              y: 0,
              zoom: 1
            }
          },
          generated: {
            entities: {},
            enums: {},
            migrations: [],
            apis: {}
          }
        };
        
        StorageService.saveProject(newProject);
        message.success('Project created successfully');
      }
      
      setModalVisible(false);
      setEditingProject(null);
      form.resetFields();
      loadProjects();
    } catch (error) {
      console.error('Failed to save project:', error);
      message.error('Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  // 删除项目
  const handleDelete = async (project: Project) => {
    try {
      StorageService.deleteProject(project.id);
      message.success('Project deleted successfully');
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      message.error('Failed to delete project');
    }
  };

  // 打开项目
  const handleOpenProject = (project: Project) => {
    // 记录最近访问的项目
    StorageService.addRecentProject(project.id);
    // 设置为活跃项目
    StorageService.setActiveProject(project.id);
    // 跳转到ORM设计器
    navigate(`/project/${project.id}`);
  };

  // 打开创建模态框
  const handleCreate = () => {
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑模态框
  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name,
      description: project.description
    });
    setModalVisible(true);
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 计算项目统计信息
  const getProjectStats = (project: Project) => {
    const entityCount = Object.keys(project.schema.entities).length;
    const relationCount = project.schema.relations.length;
    return { entityCount, relationCount };
  };

  return (
    <div>
      {/* 页面头部 */}
      <div style={{ 
          marginBottom: 2, 
          padding: 24,
          backgroundImage: 'url(/wawa3.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
         }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              {/* <img src="/logo.svg" alt="AIDatabench" style={{ height: '32px', marginRight: 20 }} /> */}
              <Title level={2} style={{ margin: 0 }}>
                AI Databench
              </Title>
            </div>
            <Text type="secondary">
              Easy to use AI-driven database design tool
            </Text>
          </div>
          <Button 
            // type="primary" 
            // ghost
            icon={<PlusOutlined />}
            onClick={handleCreate}
            size="large"
          >
            Create New Project
          </Button>
        </div>
      </div>

      {/* 项目列表 */}
      {projects.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No projects yet"
        >
          <Button type="primary" onClick={handleCreate}>
            Start a new project
          </Button>
        </Empty>
      ) : (
        <div style={{ padding: 24 }}>
          <Row gutter={[16, 16]}>
            {projects.map((project) => {
              const stats = getProjectStats(project);
              return (
                <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
                  <Card
                    hoverable
                    style={{ backgroundColor: '#1f1f00' }}
                    actions={[
                      <Button 
                        type="text" 
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleOpenProject(project)}
                      >
                        Open
                      </Button>,
                      <Button 
                        type="text" 
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(project)}
                      >
                        Edit
                      </Button>,
                      <Popconfirm
                        title="Are you sure you want to delete this project?"
                        description="This action cannot be undone, please be careful."
                        onConfirm={() => handleDelete(project)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Button 
                          type="text" 
                          icon={<DeleteOutlined />}
                          // danger
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <Meta
                      title={
                        <div style={{ cursor: 'pointer' }} onClick={() => handleOpenProject(project)}>
                          {project.name}
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Text ellipsis={{ tooltip: project.description }}>
                              {project.description || 'No description'}
                            </Text>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <Space>
                              <Tag color="blue">{stats.entityCount} entities</Tag>
                              <Tag color="green">{stats.relationCount} relations</Tag>
                            </Space>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', color: '#999' }}>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Updated at {formatDate(project.updatedAt)}
                            </Text>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* 创建/编辑项目模态框 */}
      <Modal
        title={editingProject ? 'Edit Project' : 'New Project'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingProject(null);
          form.resetFields();
        }}
        footer={null}
        maskClosable={false}
        destroyOnHidden
        width={600}
        centered
        // style={{ paddingTop: 30 }}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[
              { required: true, message: 'Please enter project name' },
              { max: 50, message: 'Project name cannot exceed 50 characters' }
            ]}
          >
            <Input placeholder="Please enter project name" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Project Description"
            rules={[
              { max: 200, message: 'Description cannot exceed 200 characters' }
            ]}
          >
            <Input.TextArea 
              placeholder="Please enter project description (optional)" 
              rows={4}
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setModalVisible(false);
                  setEditingProject(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
              >
                {editingProject ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Projects;