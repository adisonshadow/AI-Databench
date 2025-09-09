import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Spin, 
  Splitter, 
  Button, 
  Space, 
  Tree, 
  Empty, 
  Typography, 
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message
} from 'antd';
import { 
  PlusOutlined, 
  RobotOutlined, 
  PartitionOutlined,
  FolderOutlined,
  TableOutlined
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '@/stores/storage';
import FieldManager from '@/components/FieldManager';
import type { Project, ADBEntity } from '@/types/storage';
import type { TreeProps, DataNode } from 'antd/es/tree';

const { Title, Text } = Typography;
const { Option } = Select;

interface EntityTreeNode extends DataNode {
  entityId?: string;
  type: 'folder' | 'entity';
  status?: 'enabled' | 'disabled' | 'archived';
}

interface EntityFormValues {
  code: string;
  label: string;
  description?: string;
  status: 'enabled' | 'disabled' | 'archived';
  tags?: string[];
}

const ModelDesigner: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<ADBEntity | null>(null);
  const [entityTreeData, setEntityTreeData] = useState<EntityTreeNode[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // 处理项目更新
  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
    generateEntityTreeData(updatedProject);
  };

  // 生成实体树形数据
  const generateEntityTreeData = (project: Project) => {
    const entities = Object.values(project.schema.entities || {});
    
    // 按状态分组
    const enabledEntities = entities.filter(entity => entity.entityInfo.status === 'enabled');
    const disabledEntities = entities.filter(entity => entity.entityInfo.status === 'disabled');
    const archivedEntities = entities.filter(entity => entity.entityInfo.status === 'archived');
    
    const treeData: EntityTreeNode[] = [
      {
        title: `启用中 (${enabledEntities.length})`,
        key: 'enabled',
        type: 'folder',
        icon: <FolderOutlined />,
        children: enabledEntities.map(entity => ({
          title: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text strong>{entity.entityInfo.label || entity.entityInfo.code}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>{entity.entityInfo.code}</Text>
              </div>
              <Tag color="green">启用</Tag>
            </div>
          ),
          key: `entity-${entity.entityInfo.id}`,
          entityId: entity.entityInfo.id,
          type: 'entity',
          status: 'enabled',
          icon: <TableOutlined />
        }))
      },
      {
        title: `已禁用 (${disabledEntities.length})`,
        key: 'disabled',
        type: 'folder',
        icon: <FolderOutlined />,
        children: disabledEntities.map(entity => ({
          title: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text>{entity.entityInfo.label || entity.entityInfo.code}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>{entity.entityInfo.code}</Text>
              </div>
              <Tag color="orange">禁用</Tag>
            </div>
          ),
          key: `entity-${entity.entityInfo.id}`,
          entityId: entity.entityInfo.id,
          type: 'entity',
          status: 'disabled',
          icon: <TableOutlined style={{ color: '#d9d9d9' }} />
        }))
      },
      {
        title: `已归档 (${archivedEntities.length})`,
        key: 'archived',
        type: 'folder',
        icon: <FolderOutlined />,
        children: archivedEntities.map(entity => ({
          title: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text delete>{entity.entityInfo.label || entity.entityInfo.code}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>{entity.entityInfo.code}</Text>
              </div>
              <Tag color="red">归档</Tag>
            </div>
          ),
          key: `entity-${entity.entityInfo.id}`,
          entityId: entity.entityInfo.id,
          type: 'entity',
          status: 'archived',
          icon: <TableOutlined style={{ color: '#ff4d4f' }} />
        }))
      }
    ];
    
    setEntityTreeData(treeData);
  };

  // 处理实体选择
  const handleEntitySelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    const node = info.node as unknown as EntityTreeNode;
    if (node.type === 'entity' && node.entityId && project) {
      const entity = project.schema.entities[node.entityId];
      if (entity) {
        setSelectedEntity(entity);
      }
    }
  };

  // 处理AI新建实体
  const handleAICreateEntity = () => {
    // TODO: 打开AI创建实体对话框
    console.log('AI新建实体');
  };

  // 处理手工新建实体
  const handleManualCreateEntity = () => {
    createForm.resetFields();
    setIsCreateModalVisible(true);
  };

  // 处理保存新建实体
  const handleSaveEntity = async (values: EntityFormValues) => {
    if (!project) return;

    try {
      const now = new Date().toISOString();
      const entityId = uuidv4(); // 使用uuid生成唯一ID
      
      // 从 code中提取tableName（最后一级）
      const codeParts = values.code.split(':');
      const tableName = codeParts[codeParts.length - 1];
      
      const newEntity: ADBEntity = {
        entityInfo: {
          id: entityId,
          code: values.code,
          label: values.label,
          tableName: tableName,
          comment: values.description, // description作为comment
          status: values.status || 'enabled',
          description: values.description,
          tags: values.tags || [],
          isLocked: false
        },
        fields: {},
        createdAt: now,
        updatedAt: now
      };

      // 更新项目
      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          entities: {
            ...project.schema.entities,
            [entityId]: newEntity
          }
        }
      };

      // 保存到localStorage
      StorageService.saveProject(updatedProject);
      handleProjectUpdate(updatedProject);

      setIsCreateModalVisible(false);
      createForm.resetFields();
      
      message.success('实体创建成功');
    } catch (error) {
      console.error('创建实体失败:', error);
      message.error('创建实体失败');
    }
  };

  // 处理图谱查看
  const handleViewGraph = () => {
    // TODO: 打开图谱视图
    console.log('查看图谱');
  };

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
        generateEntityTreeData(projectData);
        
        // 设置为活跃项目
        StorageService.setActiveProject(projectId);
        
        // 添加到最近访问列表
        StorageService.addRecentProject(projectId);
      } catch (error) {
        console.error('Failed to load project:', error);
        // 项目不存在，跳转回首页
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Splitter style={{ height: '100%' }}>
        {/* 左侧：实体管理 */}
        <Splitter.Panel defaultSize="30%" min="20%" max="50%">
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 实体管理头部 */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #434343',
              backgroundColor: '#1f1f1f'
            }}>
              <Title level={5} style={{ margin: 0, marginBottom: 12, color: '#ffffff' }}>
                实体管理
              </Title>
              <Space>
                <Button 
                  type="primary" 
                  icon={<RobotOutlined />}
                  onClick={handleAICreateEntity}
                  size="small"
                >
                  AI新建
                </Button>
                <Button 
                  icon={<PlusOutlined />}
                  onClick={handleManualCreateEntity}
                  size="small"
                >
                  手工新建
                </Button>
                <Button 
                  icon={<PartitionOutlined />}
                  onClick={handleViewGraph}
                  size="small"
                >
                  图谱
                </Button>
              </Space>
            </div>
            
            {/* 实体树形列表 */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '16px',
              backgroundColor: '#141414'
            }}>
              {entityTreeData.length > 0 ? (
                <Tree
                  treeData={entityTreeData}
                  onSelect={handleEntitySelect}
                  defaultExpandAll
                  showIcon
                  blockNode
                  style={{ 
                    backgroundColor: 'transparent',
                    color: '#ffffff'
                  }}
                />
              ) : (
                <Empty 
                  description="暂无实体模型" 
                  style={{ marginTop: '20%' }}
                />
              )}
            </div>
          </div>
        </Splitter.Panel>
        
        {/* 右侧：字段管理 */}
        <Splitter.Panel>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 字段管理头部 */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #434343',
              backgroundColor: '#1f1f1f'
            }}>
              <Title level={5} style={{ margin: 0, color: '#ffffff' }}>
                {selectedEntity ? 
                  `字段管理 - ${selectedEntity.entityInfo.label || selectedEntity.entityInfo.code}` : 
                  '字段管理'
                }
              </Title>
              {selectedEntity && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    表名: {selectedEntity.entityInfo.tableName || selectedEntity.entityInfo.code}
                  </Text>
                  {selectedEntity.entityInfo.comment && (
                    <div>
                      <Text type="secondary">
                        说明: {selectedEntity.entityInfo.comment}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 字段列表 */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '16px',
              backgroundColor: '#141414'
            }}>
              {selectedEntity ? (
                <FieldManager entity={selectedEntity} project={project!} onEntityUpdate={handleProjectUpdate} />
              ) : (
                <Empty 
                  description="请选择一个实体查看字段信息" 
                  style={{ marginTop: '20%' }}
                />
              )}
            </div>
          </div>
        </Splitter.Panel>
      </Splitter>
      
      {/* 创建实体模态框 */}
      <Modal
        title="手工新建实体"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        width={600}
        destroyOnClose
        maskClosable={false}
      >
        <Form
          form={createForm}
          onFinish={handleSaveEntity}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="code"
            label="实体标识"
            extra="支持冲号(:)多级结构，最后一级作为表名。示例：user:admin:super"
            rules={[
              { required: true, message: '请输入实体标识' },
              { 
                pattern: /^[a-zA-Z][a-zA-Z0-9_]*(:([a-zA-Z][a-zA-Z0-9_]*))*$/, 
                message: '每一级只能包含字母、数字和下划线，且以字母开头' 
              }
            ]}
          >
            <Input placeholder="例如: user:admin:super" />
          </Form.Item>

          <Form.Item
            name="label"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="例如: 用户" />
          </Form.Item>

          <Form.Item
            name="description"
            label="实体描述"
          >
            <Input.TextArea rows={3} placeholder="描述该实体的作用和用途" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="status"
              label="实体状态"
              initialValue="enabled"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="enabled">启用</Option>
                <Option value="disabled">禁用</Option>
                <Option value="archived">归档</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="输入标签后按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelDesigner;