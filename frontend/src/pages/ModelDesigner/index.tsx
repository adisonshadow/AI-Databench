import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Spin, 
  Splitter, 
  Button, 
  Space, 
  Empty, 
  Typography,
  Modal,
  Form,
  Input,
  Select,
  message,
  Table,
  Badge,
  Dropdown,
  Flex
} from 'antd';
import { 
  PlusOutlined, 
  SubnodeOutlined, 
  PartitionOutlined,
  BuildOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  MoreOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  DatabaseOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '@/stores/storage';
import { projectStore, type AIChatContext } from '@/stores/projectStore';
import FieldsManager from '@/components/FieldsManager';
import ADBEnumManager from '@/components/ADBEnumManager';
import AIAddNewEntities from '@/components/AIAssistant/AIAddNewEntitis';
import type { Project, ADBEntity } from '@/types/storage';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'antd/es/table/interface';


const { Text } = Typography;
const { Option } = Select;

// 扩展SchemaTreeItem类型以支持表格显示
interface SchemaTreeItem {
  id?: string;
  name: string;
  code: string;
  description?: string;
  status?: 'enabled' | 'disabled' | 'archived';
  isLocked?: boolean;
  children?: SchemaTreeItem[];
  fields?: ADBEntity['fields'];
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
  const [entityTreeData, setEntityTreeData] = useState<SchemaTreeItem[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEnumModalVisible, setIsEnumModalVisible] = useState(false);
  const [isAICreateModalVisible, setIsAICreateModalVisible] = useState(false);
  const [editingEntity, setEditingEntity] = useState<SchemaTreeItem | null>(null);
  const [createForm] = Form.useForm();
  // const projectStore = useProjectStore();

  // 处理项目更新
  const handleProjectUpdate = (updatedProject: Project) => {
    console.log('🔍 handleProjectUpdate 被调用');
    console.log('🔍 更新后的项目实体数量:', Object.keys(updatedProject.schema.entities).length);
    setProject(updatedProject);
    generateEntityTreeData(updatedProject);
  };

  // 生成实体树形数据（参考旧项目buildSchemaTree）
  const generateEntityTreeData = (project: Project) => {
    const entities = Object.values(project.schema.entities || {});
    const allCodes: string[] = [];
    const codeMap = new Map<string, SchemaTreeItem>();
    const result: SchemaTreeItem[] = [];
    
    // 首先创建所有节点
    entities.forEach(entity => {
      const codes = entity.entityInfo.code.split(':');
      let currentPath = '';
      
      codes.forEach((code, index) => {
        currentPath = currentPath ? `${currentPath}:${code}` : code;
        allCodes.push(currentPath);
        
        if (!codeMap.has(currentPath)) {
          const node: SchemaTreeItem = {
            ...(index === codes.length - 1 ? {
              id: entity.entityInfo.id,
              name: entity.entityInfo.label || code,
              description: entity.entityInfo.description,
              status: entity.entityInfo.status || 'enabled',
              isLocked: entity.entityInfo.isLocked || false,
              fields: entity.fields
            } : {
              name: code,
              status: 'enabled'
            }),
            code: currentPath,
            children: []
          };
          codeMap.set(currentPath, node);
        }
      });
    });

    // 构建树形结构
    codeMap.forEach((node) => {
      const parentPath = node.code.split(':').slice(0, -1).join(':');
      if (parentPath) {
        const parent = codeMap.get(parentPath);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        result.push(node);
      }
    });

    // 清理没有子节点的children数组
    const cleanupEmptyChildren = (nodes: SchemaTreeItem[]) => {
      nodes.forEach(node => {
        if (node.children && node.children.length === 0) {
          delete node.children;
        } else if (node.children) {
          cleanupEmptyChildren(node.children);
        }
      });
    };
    
    cleanupEmptyChildren(result);
    
    // 设置所有节点为展开状态
    setExpandedRowKeys([...new Set(allCodes)]);
    setEntityTreeData(result);
  };

  // 处理实体选择
  const handleEntitySelect = (entity: SchemaTreeItem) => {
    if (!entity.children?.length && entity.id && project) {
      const fullEntity = project.schema.entities[entity.id];
      if (fullEntity) {
        setSelectedEntity(fullEntity);
      }
    }
  };

  // 处理实体锁定/解锁
  const handleEntityLockToggle = async (entity: SchemaTreeItem) => {
    if (!entity.id || !project) return;
    
    try {
      const updatedEntity = {
        ...project.schema.entities[entity.id],
        entityInfo: {
          ...project.schema.entities[entity.id].entityInfo,
          isLocked: !entity.isLocked
        },
        updatedAt: new Date().toISOString()
      };

      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          entities: {
            ...project.schema.entities,
            [entity.id]: updatedEntity
          }
        }
      };

      StorageService.saveProject(updatedProject);
      handleProjectUpdate(updatedProject);
      
      message.success(entity.isLocked ? '实体已解锁' : '实体已锁定');
    } catch (error) {
      console.error('锁定状态更改失败:', error);
      message.error('锁定状态更改失败');
    }
  };

  // 处理实体编辑
  const handleEntityEdit = (entity: SchemaTreeItem) => {
    if (!entity.id) return;
    
    console.log('编辑实体数据:', entity);
    
    setEditingEntity(entity);
    const formValues = {
      code: entity.code,
      label: entity.name,
      description: entity.description,
      status: entity.status
    };
    
    console.log('设置表单值:', formValues);
    createForm.setFieldsValue(formValues);
    setIsCreateModalVisible(true);
    
    // 确保表单数据正确显示
    setTimeout(() => {
      createForm.setFieldsValue(formValues);
    }, 100);
  };

  // 处理实体删除
  const handleEntityDelete = async (entity: SchemaTreeItem) => {
    console.log('🔍 开始删除实体:', entity);
    console.log('🔍 实体ID:', entity.id);
    console.log('🔍 项目:', project);
    
    if (!entity.id || !project) {
      console.log('❌ 缺少必要参数');
      return;
    }
    
    try {
      console.log('🔍 删除前的实体列表:', Object.keys(project.schema.entities));
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [entity.id]: _, ...remainingEntities } = project.schema.entities;
      
      console.log('🔍 删除后的实体列表:', Object.keys(remainingEntities));
      
      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          entities: remainingEntities
        }
      };

      console.log('🔍 保存项目到localStorage');
      StorageService.saveProject(updatedProject);
      
      console.log('🔍 通知项目更新');
      handleProjectUpdate(updatedProject);
      
      console.log('🔍 通知projectStore更新');
      projectStore.notifyUpdate();
      
      // 如果删除的是当前选中的实体，清除选中状态
      if (selectedEntity?.entityInfo.id === entity.id) {
        console.log('🔍 清除选中状态');
        setSelectedEntity(null);
      }
      
      console.log('✅ 实体删除成功');
      message.success('实体删除成功');
    } catch (error) {
      console.error('❌ 删除实体失败:', error);
      message.error('删除实体失败');
    }
  };

  // 定义表格列
  const columns: ColumnsType<SchemaTreeItem> = [
    {
      title: 'Code',
      dataIndex: 'code',
      width: '45%',
      key: 'code',
      render: (text: string, record: SchemaTreeItem) => {
        // 获取当前层级的名称（最后一个冒号后的部分）
        const currentLevelName = text.split(':').pop() || '';
        return (
          <span style={{ color: record.children?.length ? '#999' : undefined }}>
            {!record.children?.length && (
              <BuildOutlined 
                style={{ 
                  fontSize: '12px', 
                  marginRight: '8px', 
                  color: record.status === 'enabled' ? '#1890ff' : '#999' 
                }} 
              />
            )}
            {currentLevelName}
          </span>
        );
      },
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SchemaTreeItem) => {
        // 只有叶子节点显示完整信息
        if (record.children?.length) {
          return null;
        }
        return (
          <div>
            <Space>
              <Badge status={record.status === 'enabled' ? 'success' : 'default'}/>
              <span>{text}</span>
            </Space>
            {record.description && (
              <div style={{ color: '#666', fontSize: '12px' }}>
                {record.description}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 40,
      render: (_: unknown, record: SchemaTreeItem) => {
        // 只有叶子节点显示操作按钮
        if (record.children?.length) return null;
        
        const dropdownItems = [
          {
            key: 'lock',
            label: record.isLocked ? '解锁' : '锁定',
            icon: record.isLocked ? <UnlockOutlined /> : <LockOutlined />,
            onClick: () => handleEntityLockToggle(record)
          },
          {
            key: 'addToChat',
            label: '添加实体到AI Chat',
            icon: <MessageOutlined />,
            onClick: () => handleAddEntityToChat(record)
          },
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            disabled: record.isLocked,
            onClick: () => handleEntityEdit(record)
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            disabled: record.isLocked,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '删除实体',
                content: `确定要删除 "${record.name}" 吗？此操作不可恢复。`,
                okText: '确定',
                cancelText: '取消',
                okType: 'danger',
                onOk: () => handleEntityDelete(record)
              });
            }
          }
        ];
        
        return (
          <Flex justify='end'>
            <Dropdown
              menu={{
                items: dropdownItems.map(item => ({
                  ...item,
                  onClick: () => {
                    item.onClick();
                  }
                }))
              }}
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </Flex>
        );
      },
    },
  ];

  // 处理AI新建实体
  // const handleAICreateEntity = () => {
  //   setIsAICreateModalVisible(true);
  // };

  // 处理AI创建的实体
  const handleAIEntityCreated = (entity: ADBEntity) => {
    if (!project) return;

    try {
      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          entities: {
            ...project.schema.entities,
            [entity.entityInfo.id]: entity
          }
        }
      };

      StorageService.saveProject(updatedProject);
      handleProjectUpdate(updatedProject);
      
      message.success('AI创建的实体已保存');
      setIsAICreateModalVisible(false);
    } catch (error) {
      console.error('保存AI创建的实体失败:', error);
      message.error('保存AI创建的实体失败');
    }
  };

  // 处理手工新建实体
  const handleManualCreateEntity = () => {
    setEditingEntity(null);
    createForm.resetFields();
    setIsCreateModalVisible(true);
  };

  // 处理保存实体（新建或编辑）
  const handleSaveEntity = async (values: EntityFormValues) => {
    if (!project) return;

    try {
      const now = new Date().toISOString();
      const isEditing = editingEntity !== null;
      
      if (isEditing && editingEntity.id) {
        // 编辑现有实体
        const existingEntity = project.schema.entities[editingEntity.id];
        if (!existingEntity) {
          message.error('实体不存在');
          return;
        }

        // 从 code中提取tableName（最后一级）
        const codeParts = values.code.split(':');
        const tableName = codeParts[codeParts.length - 1];

        const updatedEntity: ADBEntity = {
          ...existingEntity,
          entityInfo: {
            ...existingEntity.entityInfo,
            code: values.code,
            label: values.label,
            tableName: tableName,
            comment: values.description,
            status: values.status || 'enabled',
            description: values.description,
            tags: values.tags || []
          },
          updatedAt: now
        };

        // 更新项目
        const updatedProject = {
          ...project,
          schema: {
            ...project.schema,
            entities: {
              ...project.schema.entities,
              [editingEntity.id]: updatedEntity
            }
          }
        };

        // 保存到localStorage
        StorageService.saveProject(updatedProject);
        handleProjectUpdate(updatedProject);

        setIsCreateModalVisible(false);
        setEditingEntity(null);
        createForm.resetFields();
        
        message.success('实体更新成功');
      } else {
        // 新建实体
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
        setEditingEntity(null);
        createForm.resetFields();
        
        message.success('实体创建成功');
      }
    } catch (error) {
      console.error('保存实体失败:', error);
      message.error('保存实体失败');
    }
  };

  // 处理图谱查看
  const handleViewGraph = () => {
    // TODO: 打开图谱视图
    console.log('查看图谱');
  };

  // 处理ADB枚举管理
  const handleEnumManage = () => {
    setIsEnumModalVisible(true);
  };

  // 处理添加实体到AI Chat
  const handleAddEntityToChat = (entity: SchemaTreeItem) => {
    if (!entity.id || !project) return;
    
    const fullEntity = project.schema.entities[entity.id];
    if (!fullEntity) return;

    // 只创建实体上下文，不添加字段
    const entityCodeLast = entity.code.split(':').pop() || entity.code;
    const entityContext: AIChatContext = {
      id: uuidv4(),
      type: 'entity',
      entityCode: entity.code,
      entityName: entity.name || entity.code,
      description: `${entity.name || entityCodeLast}(${entityCodeLast})`
    };

    // 添加到AI聊天上下文
    projectStore.addAIChatContext(entityContext);

    message.success(`已添加实体 "${entity.name}" 到AI聊天上下文`);
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
        projectStore.setCurrentProjectId(projectId);
        
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

  // 监听项目存储更新 - 使用projectStore的订阅机制
  useEffect(() => {
    const unsubscribe = projectStore.subscribe(() => {
      const currentProjectId = projectStore.getCurrentProjectId();
      if (currentProjectId === projectId) {
        // 重新加载项目数据
        const updatedProject = StorageService.getProject(projectId);
        if (updatedProject) {
          setProject(updatedProject);
          generateEntityTreeData(updatedProject);
        }
      }
    });

    return unsubscribe;
  }, [projectId]);

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Splitter style={{ height: '100%' }}>
        {/* 左侧：实体管理 */}
        <Splitter.Panel defaultSize="45%" min="30%" max="60%">
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 实体管理头部 */}
            <Space style={{ 
              height: 40,
              // backgroundColor: '#1f1f1f',
              padding: '0 5px',
            }}>
              {/* <Title level={5} style={{ margin: 0, marginBottom: 12, color: '#ffffff' }}>
                实体管理
              </Title> */}
                {/* <Space.Compact block>
                    <Button 
                    //   type="primary" 
                    // icon={<RobotOutlined />}
                    type="text"
                    onClick={handleAICreateEntity}
                    size="small"
                    >
                      <Lottie filename="AI-assistant" style={{ width: 32, height: 32 }} />
                    AI新建
                    </Button>
                    <Button 
                    // icon={<PlusOutlined />}
                    type="text"
                    onClick={handleManualCreateEntity}
                    size="small"
                    >
                    新建
                    </Button>
                </Space.Compact> */}

                <Button 
                  icon={<SubnodeOutlined />}
                  type="text"
                  onClick={handleManualCreateEntity}
                  size="small"
                  style={{ marginRight: 10 }}
                >
                  实体
                </Button>

                <Button 
                  icon={<PartitionOutlined />}
                  type="text"
                  onClick={handleViewGraph}
                  size="small"
                >
                  关系
                </Button>
                <Button 
                  icon={<DatabaseOutlined />}
                  type="text"
                  onClick={handleEnumManage}
                  size="small"
                >
                  枚举
                </Button>
            </Space>
            
            {/* 实体树形列表 */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '4px',
              backgroundColor: '#141414'
            }}>
              {entityTreeData.length > 0 ? (
                <Table<SchemaTreeItem>
                  columns={columns}
                  dataSource={entityTreeData}
                  rowKey={(record) => record.code}
                  pagination={false}
                  size="small"
                  showHeader={false}
                  expandable={{
                    expandedRowKeys,
                    onExpandedRowsChange: (expandedKeys: readonly Key[]) => {
                      setExpandedRowKeys(expandedKeys as string[]);
                    },
                    expandIcon: ({ expanded, onExpand, record }) => {
                      // 如果是叶子节点（没有子节点），不显示图标
                      if (!record.children?.length) {
                        return null;
                      }
                      return (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            onExpand(record, e);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {expanded ? (
                            <CaretDownOutlined 
                              style={{ 
                                fontSize: '12px', 
                                color: '#666', 
                                marginRight: '6px' 
                              }} 
                            />
                          ) : (
                            <CaretRightOutlined 
                              style={{ 
                                fontSize: '12px', 
                                color: '#999', 
                                marginRight: '6px', 
                                marginTop: '2px' 
                              }} 
                            />
                          )}
                        </span>
                      );
                    },
                  }}
                  onRow={(record) => ({
                    onClick: () => {
                      if (record.children?.length) {
                        // 虚拟节点：点击整行展开/折叠
                        const isExpanded = expandedRowKeys.includes(record.code);
                        if (isExpanded) {
                          setExpandedRowKeys(expandedRowKeys.filter(key => key !== record.code));
                        } else {
                          setExpandedRowKeys([...expandedRowKeys, record.code]);
                        }
                      } else {
                        // 叶子节点：选中实体
                        handleEntitySelect(record);
                      }
                    },
                    className:
                      !record.children?.length && selectedEntity?.entityInfo.id === record.id
                        ? "ant-table-row-selected"
                        : "",
                    style: {
                      cursor: "pointer",
                    },
                  })}
                  style={{ 
                    backgroundColor: 'transparent'
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
          {selectedEntity ? (
            <FieldsManager entity={selectedEntity} project={project!} onEntityUpdate={handleProjectUpdate} onProjectUpdate={handleProjectUpdate} />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 字段管理头部（无选中实体时显示） */}
              {/* <Space style={{ 
                height: 40,
                padding: '0 20px',
                backgroundColor: '#1f1f1f'
              }}>
                <Text type="secondary">请选择一个实体查看字段信息</Text>
              </Space> */}
              
              {/* 字段列表内容区域 */}
              <div style={{ 
                flex: 1, 
                flexDirection: 'column',
                overflow: 'auto', 
                padding: '16px',
                backgroundColor: '#141414',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/toleft.svg" style={{ height: 68, marginBottom: 40 }} />
                <Text type="secondary">请选择一个实体查看字段信息</Text>
              </div>
            </div>
          )}
        </Splitter.Panel>
      </Splitter>
      
      {/* 创建/编辑实体模态框 */}
      <Modal
        title={editingEntity ? "编辑实体" : "手工新建实体"}
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          setEditingEntity(null);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        width={600}
        destroyOnHidden
        maskClosable={false}
      >
        <Form
          form={createForm}
          onFinish={handleSaveEntity}
          layout="vertical"
          preserve={true}
          style={{ paddingTop: 30 }}
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

      {/* ADB枚举管理模态框 */}
      <ADBEnumManager
        visible={isEnumModalVisible}
        onClose={() => setIsEnumModalVisible(false)}
        project={project!}
        onProjectUpdate={handleProjectUpdate}
      />

      {/* AI新建实体模态框 */}
      <AIAddNewEntities
        visible={isAICreateModalVisible}
        onClose={() => setIsAICreateModalVisible(false)}
        project={project!}
        onEntityCreated={handleAIEntityCreated}
      />
    </div>
  );
};

export default ModelDesigner;