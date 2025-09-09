import React, { useState, useEffect } from 'react';
import { 
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
  InputNumber,
  message
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  KeyOutlined,
  LinkOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { StorageService } from '@/stores/storage';
import type { ADBEntity, ADBField, Project } from '@/types/storage';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { Option } = Select;

interface FieldManagerProps {
  entity: ADBEntity;
  project: Project;
  onEntityUpdate: (project: Project) => void;
}

// 字段类型选项
const FIELD_TYPES = [
  { value: 'varchar', label: 'VARCHAR - 变长字符串' },
  { value: 'char', label: 'CHAR - 定长字符串' },
  { value: 'text', label: 'TEXT - 长文本' },
  { value: 'int', label: 'INT - 整数' },
  { value: 'bigint', label: 'BIGINT - 长整数' },
  { value: 'smallint', label: 'SMALLINT - 短整数' },
  { value: 'decimal', label: 'DECIMAL - 小数' },
  { value: 'float', label: 'FLOAT - 浮点数' },
  { value: 'double', label: 'DOUBLE - 双精度浮点数' },
  { value: 'boolean', label: 'BOOLEAN - 布尔值' },
  { value: 'date', label: 'DATE - 日期' },
  { value: 'time', label: 'TIME - 时间' },
  { value: 'datetime', label: 'DATETIME - 日期时间' },
  { value: 'timestamp', label: 'TIMESTAMP - 时间戳' },
  { value: 'json', label: 'JSON - JSON数据' },
  { value: 'uuid', label: 'UUID - 唯一标识符' },
  { value: 'enum', label: 'ENUM - 枚举' }
];

const FieldManager: React.FC<FieldManagerProps> = ({ entity, project, onEntityUpdate }) => {
  const [fields, setFields] = useState<ADBField[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<ADBField | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const fieldList = Object.values(entity.fields || {});
    setFields(fieldList);
  }, [entity]);

interface FieldFormValues {
  code: string;
  label: string;
  comment?: string;
  status: 'enabled' | 'disabled' | 'archived';
  orderIndex: number;
  type: string;
  length?: number;
  nullable: boolean;
  unique: boolean;
  default?: string;
  primary: boolean;
  precision?: number;
  scale?: number;
  generated?: boolean | 'increment' | 'uuid' | 'rowid';
}

// 处理新建/编辑字段
  const handleSaveField = async (values: FieldFormValues) => {
    try {
      const now = new Date().toISOString();
      const fieldId = editingField?.columnInfo.id || `field_${Date.now()}`;
      
      const newField: ADBField = {
        columnInfo: {
          id: fieldId,
          label: values.label,
          code: values.code,
          comment: values.comment,
          status: values.status || 'enabled',
          orderIndex: values.orderIndex || 0
        },
        typeormConfig: {
          type: values.type,
          length: values.length,
          nullable: values.nullable !== false,
          unique: values.unique || false,
          default: values.default,
          comment: values.comment,
          primary: values.primary || false,
          precision: values.precision,
          scale: values.scale,
          generated: values.generated
        },
        createdAt: editingField?.createdAt || now,
        updatedAt: now
      };

      // 更新实体
      const updatedEntity = {
        ...entity,
        fields: {
          ...entity.fields,
          [fieldId]: newField
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
            [entity.entityInfo.id]: updatedEntity
          }
        }
      };

      // 保存到localStorage
      StorageService.saveProject(updatedProject);
      onEntityUpdate(updatedProject);

      setIsModalVisible(false);
      setEditingField(null);
      form.resetFields();
      
      message.success(`字段${editingField ? '更新' : '创建'}成功`);
    } catch (error) {
      console.error('保存字段失败:', error);
      message.error('保存字段失败');
    }
  };

  // 处理删除字段
  const handleDeleteField = async (field: ADBField) => {
    try {
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [field.columnInfo.id]: _, ...remainingFields } = entity.fields;
      
      const updatedEntity = {
        ...entity,
        fields: remainingFields,
        updatedAt: now
      };

      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          entities: {
            ...project.schema.entities,
            [entity.entityInfo.id]: updatedEntity
          }
        }
      };

      StorageService.saveProject(updatedProject);
      onEntityUpdate(updatedProject);
      
      message.success('字段删除成功');
    } catch (error) {
      console.error('删除字段失败:', error);
      message.error('删除字段失败');
    }
  };

  // 处理编辑字段
  const handleEditField = (field: ADBField) => {
    setEditingField(field);
    form.setFieldsValue({
      code: field.columnInfo.code,
      label: field.columnInfo.label,
      comment: field.columnInfo.comment,
      status: field.columnInfo.status,
      orderIndex: field.columnInfo.orderIndex,
      type: field.typeormConfig.type,
      length: field.typeormConfig.length,
      nullable: field.typeormConfig.nullable,
      unique: field.typeormConfig.unique,
      default: field.typeormConfig.default,
      primary: field.typeormConfig.primary,
      precision: field.typeormConfig.precision,
      scale: field.typeormConfig.scale,
      generated: field.typeormConfig.generated
    });
    setIsModalVisible(true);
  };

  // 处理新建字段
  const handleCreateField = () => {
    setEditingField(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 表格列定义
  const columns: ColumnsType<ADBField> = [
    {
      title: '字段标识',
      dataIndex: ['columnInfo', 'code'],
      key: 'code',
      width: 120,
      render: (code: string, record: ADBField) => (
        <div>
          <code style={{ color: '#1890ff' }}>{code}</code>
          {record.typeormConfig.primary && (
            <KeyOutlined style={{ color: '#f39c12', marginLeft: 4 }} title="主键" />
          )}
          {record.typeormConfig.unique && (
            <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} title="唯一" />
          )}
        </div>
      )
    },
    {
      title: '显示名称',
      dataIndex: ['columnInfo', 'label'],
      key: 'label',
      width: 120
    },
    {
      title: '数据类型',
      key: 'type',
      width: 120,
      render: (_, record: ADBField) => {
        const { type, length, precision, scale } = record.typeormConfig;
        let typeDisplay = type;
        
        if (length) {
          typeDisplay += `(${length})`;
        } else if (precision !== undefined && scale !== undefined) {
          typeDisplay += `(${precision},${scale})`;
        } else if (precision !== undefined) {
          typeDisplay += `(${precision})`;
        }
        
        return <Tag color="blue">{typeDisplay.toUpperCase()}</Tag>;
      }
    },
    {
      title: '约束',
      key: 'constraints',
      width: 100,
      render: (_, record: ADBField) => (
        <Space size={4}>
          {!record.typeormConfig.nullable && <Tag color="red">NOT NULL</Tag>}
          {record.typeormConfig.unique && <Tag color="green">UNIQUE</Tag>}
          {record.typeormConfig.default !== undefined && (
            <Tag color="orange">DEFAULT</Tag>
          )}
        </Space>
      )
    },
    {
      title: '默认值',
      dataIndex: ['typeormConfig', 'default'],
      key: 'default',
      width: 100,
      render: (defaultValue: string | number | boolean | undefined) => (
        defaultValue !== undefined ? <code>{String(defaultValue)}</code> : <Text type="secondary">-</Text>
      )
    },
    {
      title: '状态',
      dataIndex: ['columnInfo', 'status'],
      key: 'status',
      width: 80,
      render: (status: string) => {
        const colors = { enabled: 'green', disabled: 'orange', archived: 'red' };
        const labels = { enabled: '启用', disabled: '禁用', archived: '归档' };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {labels[status as keyof typeof labels]}
          </Tag>
        );
      }
    },
    {
      title: '说明',
      dataIndex: ['columnInfo', 'comment'],
      key: 'comment',
      ellipsis: true,
      render: (comment: string) => comment || <Text type="secondary">-</Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record: ADBField) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEditField(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此字段？"
            description="删除后将无法恢复，相关关系也会被清除"
            onConfirm={() => handleDeleteField(record)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small"
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* 字段操作工具栏 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreateField}
          >
            新建字段
          </Button>
          <Button icon={<LinkOutlined />}>
            管理关系
          </Button>
        </Space>
      </div>

      {/* 字段列表表格 */}
      {fields.length > 0 ? (
        <Table
          columns={columns}
          dataSource={fields}
          rowKey={(record) => record.columnInfo.id}
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            size: 'small',
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个字段`
          }}
        />
      ) : (
        <Empty 
          description="暂无字段，点击上方按钮新建字段"
          style={{ margin: '40px 0' }}
        />
      )}

      {/* 字段编辑模态框 */}
      <Modal
        title={editingField ? '编辑字段' : '新建字段'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingField(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          onFinish={handleSaveField}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="code"
            label="字段标识"
            rules={[
              { required: true, message: '请输入字段标识' },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '字段标识只能包含字母、数字和下划线，且以字母开头' }
            ]}
          >
            <Input placeholder="例如: user_name" />
          </Form.Item>

          <Form.Item
            name="label"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="例如: 用户姓名" />
          </Form.Item>

          <Form.Item
            name="type"
            label="数据类型"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="选择数据类型">
              {FIELD_TYPES.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              const needsLength = ['varchar', 'char'].includes(type);
              const needsPrecision = ['decimal', 'float', 'double'].includes(type);
              
              return (
                <div style={{ display: 'flex', gap: 16 }}>
                  {needsLength && (
                    <Form.Item
                      name="length"
                      label="长度"
                      style={{ flex: 1 }}
                      rules={[{ required: true, message: '请输入长度' }]}
                    >
                      <InputNumber min={1} max={65535} placeholder="字符长度" />
                    </Form.Item>
                  )}
                  
                  {needsPrecision && (
                    <>
                      <Form.Item
                        name="precision"
                        label="精度"
                        style={{ flex: 1 }}
                        rules={[{ required: true, message: '请输入精度' }]}
                      >
                        <InputNumber min={1} max={65} placeholder="总位数" />
                      </Form.Item>
                      <Form.Item
                        name="scale"
                        label="小数位"
                        style={{ flex: 1 }}
                      >
                        <InputNumber min={0} max={30} placeholder="小数位数" />
                      </Form.Item>
                    </>
                  )}
                </div>
              );
            }}
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="nullable"
              label="可为空"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="unique"
              label="唯一约束"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="primary"
              label="主键"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item
            name="default"
            label="默认值"
          >
            <Input placeholder="字段默认值（可选）" />
          </Form.Item>

          <Form.Item
            name="comment"
            label="字段说明"
          >
            <Input.TextArea rows={3} placeholder="字段用途和说明" />
          </Form.Item>

          <Form.Item
            name="status"
            label="字段状态"
            initialValue="enabled"
          >
            <Select>
              <Option value="enabled">启用</Option>
              <Option value="disabled">禁用</Option>
              <Option value="archived">归档</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="orderIndex"
            label="排序权重"
            initialValue={0}
          >
            <InputNumber placeholder="数字越大排序越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FieldManager;