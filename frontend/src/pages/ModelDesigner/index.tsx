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
  Tooltip,
  Dropdown,
  Flex
} from 'antd';
import { 
  PlusOutlined, 
  RobotOutlined, 
  PartitionOutlined,
  BuildOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  MoreOutlined,
  CaretDownOutlined,
  CaretRightOutlined
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '@/stores/storage';
import FieldsManager from '@/components/FieldsManager';
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
  const [createForm] = Form.useForm();

  // 处理项目更新
  const handleProjectUpdate = (updatedProject: Project) => {
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
    
    createForm.setFieldsValue({
      code: entity.code,
      label: entity.name,
      description: entity.description,
      status: entity.status
    });
    setIsCreateModalVisible(true);
  };

  // 处理实体删除
  const handleEntityDelete = async (entity: SchemaTreeItem) => {
    if (!entity.id || !project) return;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [entity.id]: _, ...remainingEntities } = project.schema.entities;
      
      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          entities: remainingEntities
        }
      };

      StorageService.saveProject(updatedProject);
      handleProjectUpdate(updatedProject);
      
      // 如果删除的是当前选中的实体，清除选中状态
      if (selectedEntity?.entityInfo.id === entity.id) {
        setSelectedEntity(null);
      }
      
      message.success('实体删除成功');
    } catch (error) {
      console.error('删除实体失败:', error);
      message.error('删除实体失败');
    }
  };

  // 定义表格列
  const columns: ColumnsType<SchemaTreeItem> = [
    {
      title: 'Code',
      dataIndex: 'code',
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
      width: 120,
      render: (_: unknown, record: SchemaTreeItem) => {
        // 只有叶子节点显示操作按钮
        if (record.children?.length) return null;
        
        const dropdownItems = [
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
            <Tooltip title={record.isLocked ? "解锁实体" : "锁定实体"}>
              <Button
                type="link"
                icon={record.isLocked ? <LockOutlined /> : <UnlockOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEntityLockToggle(record);
                }}
              />
            </Tooltip>
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
                type="link"
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
            <Space style={{ 
              height: 40,
              backgroundColor: '#1f1f1f',
              padding: '0 20px',
            }}>
              {/* <Title level={5} style={{ margin: 0, marginBottom: 12, color: '#ffffff' }}>
                实体管理
              </Title> */}
                <Space.Compact block>
                    <Button 
                    //   type="primary" 
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
                </Space.Compact>
                <Button 
                  icon={<PartitionOutlined />}
                  onClick={handleViewGraph}
                  size="small"
                >
                  图谱
                </Button>
            </Space>
            
            {/* 实体树形列表 */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto', 
              padding: '16px',
              backgroundColor: '#141414'
            }}>
              {entityTreeData.length > 0 ? (
                <Table<SchemaTreeItem>
                  columns={columns}
                  dataSource={entityTreeData}
                  rowKey={(record) => record.code}
                  pagination={false}
                  size="small"
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
            <FieldsManager entity={selectedEntity} project={project!} onEntityUpdate={handleProjectUpdate} />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 字段管理头部（无选中实体时显示） */}
              <Space style={{ 
                height: 40,
                padding: '0 20px',
                backgroundColor: '#1f1f1f'
              }}>
                <Text type="secondary">请选择一个实体查看字段信息</Text>
              </Space>
              
              {/* 字段列表内容区域 */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '16px',
                backgroundColor: '#141414',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Empty description="请选择一个实体查看字段信息" />
              </div>
            </div>
          )}
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
        destroyOnHidden
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