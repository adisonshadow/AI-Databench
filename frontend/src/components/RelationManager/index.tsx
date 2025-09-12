import React, { useState, useEffect } from 'react';
import { 
  // Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Popconfirm, 
  Typography, 
  Empty,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Row,
  Col,
  Divider,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  // LinkOutlined,
  ExclamationCircleOutlined,
  // InfoCircleOutlined
} from '@ant-design/icons';
import type { 
  Relation, 
  Project, 
  ADBEntity,
  RelationCreateConfig,
  RelationValidationResult,
  RelationConflict
} from '@/types/storage';
import { RelationType, CascadeType } from '@/types/storage';
import { RelationUtils } from '@/utils/relationUtils';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;
const { Option } = Select;

interface RelationManagerProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

interface RelationFormValues {
  type: RelationType;
  fromEntityId: string;
  toEntityId: string;
  name: string;
  inverseName?: string;
  cascade: boolean;
  onDelete: CascadeType;
  onUpdate: CascadeType;
  nullable: boolean;
  eager: boolean;
  lazy: boolean;
  joinTableName?: string;
  joinColumn?: string;
  inverseJoinColumn?: string;
  description?: string;
  tags?: string[];
}

const RelationManager: React.FC<RelationManagerProps> = ({ project, onProjectUpdate }) => {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [entities, setEntities] = useState<ADBEntity[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
  const [validationResult, setValidationResult] = useState<RelationValidationResult | null>(null);
  const [conflicts, setConflicts] = useState<RelationConflict[]>([]);
  const [form] = Form.useForm();

  // 获取实体列表
  useEffect(() => {
    const entityList = Object.values(project.schema.entities || {});
    setEntities(entityList);
  }, [project.schema.entities]);

  // 获取关系列表
  useEffect(() => {
    setRelations(project.schema.relations || []);
  }, [project.schema.relations]);

  // 表格列定义
  const columns: ColumnsType<Relation> = [
    {
      title: '关系类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: RelationType) => (
        <Tag color={getRelationTypeColor(type)}>
          {RelationUtils.getRelationTypeDisplayName(type)}
        </Tag>
      ),
    },
    {
      title: '源实体',
      dataIndex: ['from', 'entityName'],
      key: 'from',
      width: 120,
    },
    {
      title: '目标实体',
      dataIndex: ['to', 'entityName'],
      key: 'to',
      width: 120,
    },
    {
      title: '关系名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '反向名称',
      dataIndex: 'inverseName',
      key: 'inverseName',
      width: 120,
      render: (inverseName: string) => inverseName || '-',
    },
    {
      title: '级联操作',
      dataIndex: ['config', 'cascade'],
      key: 'cascade',
      width: 80,
      render: (cascade: boolean) => (
        <Tag color={cascade ? 'green' : 'default'}>
          {cascade ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '删除策略',
      dataIndex: ['config', 'onDelete'],
      key: 'onDelete',
      width: 100,
      render: (onDelete: CascadeType) => (
        <Tag color={getCascadeTypeColor(onDelete)}>
          {RelationUtils.getCascadeTypeDisplayName(onDelete)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditRelation(record)}
          />
          <Popconfirm
            title="确定删除此关系？"
            description="删除关系可能会影响数据完整性，请谨慎操作。"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleDeleteRelation(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 获取关系类型颜色
  const getRelationTypeColor = (type: RelationType): string => {
    const colors = {
      [RelationType.ONE_TO_ONE]: 'blue',
      [RelationType.ONE_TO_MANY]: 'green',
      [RelationType.MANY_TO_ONE]: 'orange',
      [RelationType.MANY_TO_MANY]: 'purple',
    };
    return colors[type];
  };

  // 获取级联类型颜色
  const getCascadeTypeColor = (type: CascadeType): string => {
    const colors = {
      [CascadeType.CASCADE]: 'red',
      [CascadeType.SET_NULL]: 'orange',
      [CascadeType.RESTRICT]: 'blue',
      [CascadeType.NO_ACTION]: 'default',
    };
    return colors[type];
  };

  // 处理创建关系
  const handleCreateRelation = () => {
    setEditingRelation(null);
    form.resetFields();
    setValidationResult(null);
    setConflicts([]);
    setIsModalVisible(true);
  };

  // 处理编辑关系
  const handleEditRelation = (relation: Relation) => {
    setEditingRelation(relation);
    form.setFieldsValue({
      type: relation.type,
      fromEntityId: relation.from.entityId,
      toEntityId: relation.to.entityId,
      name: relation.name,
      inverseName: relation.inverseName,
      cascade: relation.config.cascade,
      onDelete: relation.config.onDelete,
      onUpdate: relation.config.onUpdate,
      nullable: relation.config.nullable,
      eager: relation.config.eager,
      lazy: relation.config.lazy,
      joinTableName: relation.joinTable?.name,
      joinColumn: relation.joinTable?.joinColumn,
      inverseJoinColumn: relation.joinTable?.inverseJoinColumn,
      description: relation.metadata.description,
      tags: relation.metadata.tags,
    });
    setValidationResult(null);
    setConflicts([]);
    setIsModalVisible(true);
  };

  // 处理删除关系
  const handleDeleteRelation = (relationId: string) => {
    const updatedRelations = relations.filter(r => r.id !== relationId);
    const updatedProject = {
      ...project,
      schema: {
        ...project.schema,
        relations: updatedRelations,
      },
    };
    onProjectUpdate(updatedProject);
    message.success('关系删除成功');
  };

  // 处理保存关系
  const handleSaveRelation = async () => {
    try {
      const values = await form.validateFields();
      
      const config: RelationCreateConfig = {
        type: values.type,
        fromEntityId: values.fromEntityId,
        toEntityId: values.toEntityId,
        name: values.name,
        inverseName: values.inverseName,
        config: {
          cascade: values.cascade,
          onDelete: values.onDelete,
          onUpdate: values.onUpdate,
          nullable: values.nullable,
          eager: values.eager,
          lazy: values.lazy,
        },
        joinTable: values.type === RelationType.MANY_TO_MANY ? {
          name: values.joinTableName,
          joinColumn: values.joinColumn,
          inverseJoinColumn: values.inverseJoinColumn,
        } : undefined,
        description: values.description,
        tags: values.tags,
      };

      // 创建新关系
      const newRelation = RelationUtils.createRelation(config, project);
      
      // 验证关系
      const validation = RelationUtils.validateRelation(newRelation, project);
      setValidationResult(validation);

      if (!validation.isValid) {
        message.error('关系验证失败，请检查配置');
        return;
      }

      // 检查冲突
      const relationConflicts = RelationUtils.checkConflicts(newRelation, relations);
      setConflicts(relationConflicts);

      if (relationConflicts.length > 0) {
        message.warning('检测到关系冲突，请检查配置');
        return;
      }

      // 更新项目
      const updatedRelations = editingRelation 
        ? relations.map(r => r.id === editingRelation.id ? newRelation : r)
        : [...relations, newRelation];

      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          relations: updatedRelations,
        },
      };

      onProjectUpdate(updatedProject);
      setIsModalVisible(false);
      message.success(editingRelation ? '关系更新成功' : '关系创建成功');
      
    } catch (error) {
      console.error('保存关系失败:', error);
      message.error('保存关系失败');
    }
  };

  // 处理取消
  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRelation(null);
    setValidationResult(null);
    setConflicts([]);
    form.resetFields();
  };

  // 表单值变化处理
  const handleFormValuesChange = (changedValues: any, allValues: RelationFormValues) => {
    
    // console.log('changedValues:', changedValues);
    
    // 实时验证
    if (allValues.type && allValues.fromEntityId && allValues.toEntityId && allValues.name) {
      const config: RelationCreateConfig = {
        type: allValues.type,
        fromEntityId: allValues.fromEntityId,
        toEntityId: allValues.toEntityId,
        name: allValues.name,
        inverseName: allValues.inverseName,
        config: {
          cascade: allValues.cascade,
          onDelete: allValues.onDelete,
          nullable: allValues.nullable,
          eager: allValues.eager,
          lazy: allValues.lazy,
        },
      };

      try {
        const newRelation = RelationUtils.createRelation(config, project);
        const validation = RelationUtils.validateRelation(newRelation, project);
        setValidationResult(validation);
      } catch (error) {
        setValidationResult(null);
        console.error('创建关系失败:', error);
      }
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 关系管理头部 */}
      <Space style={{ 
        height: 40,
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            关系管理
          </Title>
          <Text type="secondary">
            管理实体之间的关系映射
          </Text>
        </div>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreateRelation}
          >
            新建关系
          </Button>
        </Space>
      </Space>
      
      {/* 关系列表内容区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '16px',
        backgroundColor: '#141414'
      }}>
        {/* 关系列表表格 */}
        {relations.length > 0 ? (
          <Table
            columns={columns}
            dataSource={relations}
            rowKey="id"
            size="small"
            scroll={{ x: 1000 }}
            pagination={false}
          />
        ) : (
          <Empty 
            description="暂无关系，点击上方按钮新建关系"
            style={{ margin: '40px 0' }}
          />
        )}
      </div>

      {/* 关系编辑模态框 */}
      <Modal
        title={editingRelation ? '编辑关系' : '新建关系'}
        open={isModalVisible}
        onOk={handleSaveRelation}
        onCancel={handleCancel}
        width={800}
        okText="保存"
        cancelText="取消"
        maskClosable={false}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormValuesChange}
          initialValues={{
            cascade: false,
            onDelete: CascadeType.RESTRICT,
            onUpdate: CascadeType.RESTRICT,
            nullable: true,
            eager: false,
            lazy: true,
          }}
          style={{ paddingTop: 30 }}
        >
          {/* 基本信息 */}
          <Title level={5}>基本信息</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="关系类型"
                rules={[{ required: true, message: '请选择关系类型' }]}
              >
                <Select placeholder="选择关系类型">
                  <Option value={RelationType.ONE_TO_ONE}>一对一 (OneToOne)</Option>
                  <Option value={RelationType.ONE_TO_MANY}>一对多 (OneToMany)</Option>
                  <Option value={RelationType.MANY_TO_ONE}>多对一 (ManyToOne)</Option>
                  <Option value={RelationType.MANY_TO_MANY}>多对多 (ManyToMany)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="关系名称"
                rules={[{ required: true, message: '请输入关系名称' }]}
              >
                <Input placeholder="关系名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fromEntityId"
                label="源实体"
                rules={[{ required: true, message: '请选择源实体' }]}
              >
                <Select placeholder="选择源实体">
                  {entities.map(entity => (
                    <Option key={entity.entityInfo.id} value={entity.entityInfo.id}>
                      {entity.entityInfo.label || entity.entityInfo.code}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="toEntityId"
                label="目标实体"
                rules={[{ required: true, message: '请选择目标实体' }]}
              >
                <Select placeholder="选择目标实体">
                  {entities.map(entity => (
                    <Option key={entity.entityInfo.id} value={entity.entityInfo.id}>
                      {entity.entityInfo.label || entity.entityInfo.code}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="inverseName"
            label="反向关系名称"
          >
            <Input placeholder="反向关系名称（可选）" />
          </Form.Item>

          <Form.Item
            name="description"
            label="关系描述"
          >
            <Input.TextArea placeholder="关系描述（可选）" rows={3} />
          </Form.Item>

          {/* 关系配置 */}
          <Divider />
          <Title level={5}>关系配置</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="cascade"
                label="级联操作"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="nullable"
                label="可为空"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="eager"
                label="立即加载"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="onDelete"
                label="删除策略"
              >
                <Select>
                  <Option value={CascadeType.CASCADE}>级联 (CASCADE)</Option>
                  <Option value={CascadeType.SET_NULL}>设为空 (SET NULL)</Option>
                  <Option value={CascadeType.RESTRICT}>限制 (RESTRICT)</Option>
                  <Option value={CascadeType.NO_ACTION}>无操作 (NO ACTION)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="onUpdate"
                label="更新策略"
              >
                <Select>
                  <Option value={CascadeType.CASCADE}>级联 (CASCADE)</Option>
                  <Option value={CascadeType.SET_NULL}>设为空 (SET NULL)</Option>
                  <Option value={CascadeType.RESTRICT}>限制 (RESTRICT)</Option>
                  <Option value={CascadeType.NO_ACTION}>无操作 (NO ACTION)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 多对多关系配置 */}
          {form.getFieldValue('type') === RelationType.MANY_TO_MANY && (
            <>
              <Divider />
              <Title level={5}>中间表配置</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="joinTableName"
                    label="中间表名称"
                    rules={[{ required: true, message: '请输入中间表名称' }]}
                  >
                    <Input placeholder="中间表名称" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="joinColumn"
                    label="连接列名称"
                    rules={[{ required: true, message: '请输入连接列名称' }]}
                  >
                    <Input placeholder="连接列名称" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="inverseJoinColumn"
                    label="反向连接列名称"
                    rules={[{ required: true, message: '请输入反向连接列名称' }]}
                  >
                    <Input placeholder="反向连接列名称" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* 验证结果 */}
          {validationResult && (
            <>
              <Divider />
              <Title level={5}>验证结果</Title>
              {validationResult.errors.length > 0 && (
                <Alert
                  message="验证错误"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>{error.message}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              {validationResult.warnings.length > 0 && (
                <Alert
                  message="验证警告"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning.message}</li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              {validationResult.isValid && validationResult.errors.length === 0 && (
                <Alert
                  message="验证通过"
                  description="关系配置验证通过，可以保存。"
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
            </>
          )}

          {/* 冲突检测 */}
          {conflicts.length > 0 && (
            <>
              <Divider />
              <Title level={5}>冲突检测</Title>
              <Alert
                message="检测到关系冲突"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {conflicts.map((conflict, index) => (
                      <li key={index}>
                        {conflict.message}
                        {conflict.suggestion && (
                          <div style={{ color: '#666', fontSize: '12px' }}>
                            建议：{conflict.suggestion}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                }
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default RelationManager;
