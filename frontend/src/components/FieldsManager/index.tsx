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
import type { ADBEntity, ADBField, Project, ExtendedColumnInfo } from '@/types/storage';
import type { ColumnsType } from 'antd/es/table';
import { 
  FieldType, 
  getFieldTypeConfig, 
  shouldShowConfig, 
  getDefaultValueOptions,
  getFieldTypeHint,
  isIDType,
  requiresLengthConfig,
  requiresPrecisionConfig,
  requiresScaleConfig,
  getTypeORMNativeTypes,
  getADBExtendTypes
} from '@/utils/fieldTypeConfig';




const { Text } = Typography;
const { Option } = Select;

interface FieldsManagerProps {
  entity: ADBEntity;
  project: Project;
  onEntityUpdate: (project: Project) => void;
}


const FieldsManager: React.FC<FieldsManagerProps> = ({ entity, project, onEntityUpdate }) => {
  const [fields, setFields] = useState<ADBField[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<ADBField | null>(null);
  const [formValues, setFormValues] = useState<FieldFormValues>({
    code: '',
    label: '',
    type: '',
    nullable: false,
    unique: false,
    primary: false,
  });
  const [form] = Form.useForm();
  
  // 获取所有支持的类型
  const typeormNativeTypes = getTypeORMNativeTypes();
  const adbExtendTypes = getADBExtendTypes();

  useEffect(() => {
    const fieldList = Object.values(entity.fields || {});
    setFields(fieldList);
  }, [entity.fields]);

interface FieldFormValues {
  code?: string;
  label?: string;
  type?: string;
  length?: number;
  nullable?: boolean;
  unique?: boolean;
  default?: string;
  primary?: boolean;
  precision?: number;
  scale?: number;
  generated?: boolean | 'increment' | 'uuid' | 'rowid';
  comment?: string;
  status?: 'enabled' | 'disabled' | 'archived';
  orderIndex?: number;
  
  // ADB 扩展类型配置
  extendType?: string;
  mediaConfig?: {
    mediaType: 'image' | 'video' | 'audio' | 'document' | 'file';
    formats: string[];
    maxSize?: number;
    isMultiple?: boolean;
    storagePath?: string;
  };
  enumConfig?: {
    enum: Record<string, string | number>;
    isMultiple?: boolean;
    default?: string | number;
  };
  autoIncrementIdConfig?: {
    startValue?: number;
    increment?: number;
    sequenceName?: string;
    isPrimaryKey?: boolean;
    description?: string;
  };
  guidIdConfig?: {
    version?: 'v1' | 'v4' | 'v5';
    format?: 'default' | 'braced' | 'binary' | 'urn';
    isPrimaryKey?: boolean;
    description?: string;
    generateOnInsert?: boolean;
  };
  snowflakeIdConfig?: {
    machineId?: number;
    datacenterId?: number;
    epoch?: number;
    isPrimaryKey?: boolean;
    description?: string;
    generateOnInsert?: boolean;
    format?: 'number' | 'string';
  };
}

// 处理新建/编辑字段
  const handleSaveField = async (values: FieldFormValues) => {
    try {
      const now = new Date().toISOString();
      const fieldId = editingField?.columnInfo.id || `field_${Date.now()}`;
      
      // 判断是否为 ADB 扩展类型
      const isADBType = values.type?.startsWith('adb-') || false;
      const extendType = isADBType ? values.type : undefined;
      
      // 根据扩展类型设置对应的配置
      const extendConfig: Partial<ExtendedColumnInfo> = {};
      if (extendType === 'adb-media' && values.mediaConfig) {
        extendConfig.mediaConfig = values.mediaConfig;
      } else if (extendType === 'adb-enum' && values.enumConfig) {
        extendConfig.enumConfig = values.enumConfig;
      } else if (extendType === 'adb-auto-increment-id' && values.autoIncrementIdConfig) {
        extendConfig.autoIncrementIdConfig = values.autoIncrementIdConfig;
      } else if (extendType === 'adb-guid-id' && values.guidIdConfig) {
        extendConfig.guidIdConfig = values.guidIdConfig;
      } else if (extendType === 'adb-snowflake-id' && values.snowflakeIdConfig) {
        extendConfig.snowflakeIdConfig = values.snowflakeIdConfig;
      }

      const newField: ADBField = {
        columnInfo: {
          id: fieldId,
          label: values.label || '',
          code: values.code || '',
          comment: values.code || '', // 使用code作为comment的默认值
          status: 'enabled', // 默认启用
          orderIndex: 0, // 默认排序
          extendType,
          ...extendConfig
        },
        typeormConfig: {
          type: values.type || 'varchar', // 直接使用选择的类型，ADB-TypeORM 会处理类型映射
          length: values.length,
          nullable: values.nullable !== false,
          unique: values.unique || false,
          default: values.default,
          comment: values.code || '', // 使用code作为comment的默认值
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
    const fieldValues = {
      code: field.columnInfo.code,
      label: field.columnInfo.label,
      comment: field.columnInfo.comment,
      status: field.columnInfo.status,
      orderIndex: field.columnInfo.orderIndex,
      type: field.columnInfo.extendType || field.typeormConfig.type,
      length: field.typeormConfig.length,
      nullable: field.typeormConfig.nullable,
      unique: field.typeormConfig.unique,
      default: field.typeormConfig.default,
      primary: field.typeormConfig.primary,
      precision: field.typeormConfig.precision,
      scale: field.typeormConfig.scale,
      generated: field.typeormConfig.generated,
      // 扩展类型配置
      extendType: field.columnInfo.extendType,
      mediaConfig: field.columnInfo.mediaConfig,
      enumConfig: field.columnInfo.enumConfig,
      autoIncrementIdConfig: field.columnInfo.autoIncrementIdConfig,
      guidIdConfig: field.columnInfo.guidIdConfig,
      snowflakeIdConfig: field.columnInfo.snowflakeIdConfig
    };
    form.setFieldsValue(fieldValues);
    setFormValues(fieldValues);
    setIsModalVisible(true);
  };

  // 处理新建字段
  const handleCreateField = () => {
    setEditingField(null);
    form.resetFields();
    setFormValues({
      code: '',
      label: '',
      type: '',
      nullable: false,
      unique: false,
      primary: false,
    });
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
        const { extendType } = record.columnInfo;
        
        // 如果有扩展类型，优先显示扩展类型
        const displayType = extendType || type;
        let typeDisplay = displayType;
        
        if (length) {
          typeDisplay += `(${length})`;
        } else if (precision !== undefined && scale !== undefined) {
          typeDisplay += `(${precision},${scale})`;
        } else if (precision !== undefined) {
          typeDisplay += `(${precision})`;
        }
        
        // 根据类型设置不同的颜色
        const getTagColor = (type: string): string => {
          if (type.startsWith('adb-')) {
            return 'purple'; // ADB 扩展类型使用紫色
          }
          return 'blue'; // TypeORM 原生类型使用蓝色
        };
        
        return <Tag color={getTagColor(displayType)}>{typeDisplay.toUpperCase()}</Tag>;
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
          />
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
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 字段管理头部 */}
      <Space style={{ 
        height: 40,
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <Text type="secondary">
            表名: {entity.entityInfo.tableName || entity.entityInfo.code}
          </Text>
        </div>
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
      </Space>
      
      {/* 字段列表内容区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '16px',
        backgroundColor: '#141414'
      }}>
        {/* 字段列表表格 */}
        {fields.length > 0 ? (
          <Table
            columns={columns}
            dataSource={fields}
            rowKey={(record) => record.columnInfo.id}
            size="small"
            scroll={{ x: 800 }}
            pagination={false}
          />
        ) : (
          <Empty 
            description="暂无字段，点击上方按钮新建字段"
            style={{ margin: '40px 0' }}
          />
        )}
      </div>

      {/* 字段编辑模态框 */}
      <Modal
        title={editingField ? '编辑字段' : '新建字段'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingField(null);
          form.resetFields();
          setFormValues({
            code: '',
            label: '',
            type: '',
            nullable: false,
            unique: false,
            primary: false,
          });
        }}
        onOk={() => form.submit()}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          onFinish={handleSaveField}
          onValuesChange={(_, allValues) => {
            setFormValues(prev => ({ ...prev, ...allValues }));
          }}
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 15 }}
          // labelWrap
          layout="horizontal"
          preserve={false}
        >
          <Form.Item
            name="code"
            label="字段标识"
            hasFeedback
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
            <Select 
              placeholder="选择数据类型"
              onChange={(value) => {
                // 当类型改变时，重置相关字段
                const config = getFieldTypeConfig(value as FieldType);
                
                // 重置不适用的字段
                const resetFields: Record<string, unknown> = {};
                if (!config.length) resetFields.length = undefined;
                if (!config.precision) resetFields.precision = undefined;
                if (!config.scale) resetFields.scale = undefined;
                if (!config.default) resetFields.default = undefined;
                if (!config.unique) resetFields.unique = false;
                if (!config.primary) resetFields.primary = false;
                
                // ID类型特殊处理
                if (isIDType(value as FieldType)) {
                  resetFields.nullable = false;
                  resetFields.unique = false;
                  resetFields.primary = false;
                  resetFields.default = undefined;
                }
                
                form.setFieldsValue(resetFields);
              }}
            >
              <Select.OptGroup label="TypeORM 原生类型">
                {typeormNativeTypes.map(type => (
                  <Option key={type.type} value={type.type}>
                    {type.label}
                  </Option>
                ))}
              </Select.OptGroup>
              <Select.OptGroup label="ADB 扩展类型">
                {adbExtendTypes.map(type => (
                  <Option key={type.type} value={type.type}>
                    {type.label}
                  </Option>
                ))}
              </Select.OptGroup>
            </Select>
          </Form.Item>

          {/* 智能提示 */}
          {formValues.type && getFieldTypeHint(formValues.type as FieldType) && (
            <div style={{ 
              marginBottom: 16, 
              padding: '8px 12px', 
              backgroundColor: '#f6ffed22', 
              border: '1px solid #b7eb8f33', 
              borderRadius: 6,
              textAlign: 'center',
              fontSize: '12px',
              color: '#52c41a'
            }}>
              💡 {getFieldTypeHint(formValues.type as FieldType)}
            </div>
          )}

          {/* 长度和精度配置 - 使用条件渲染，避免空白 Form.Item */}
          {formValues.type && requiresLengthConfig(formValues.type as FieldType) && (
            <Form.Item
              name="length"
              label="长度"
              rules={[{ required: true, message: '请输入长度' }]}
            >
              <InputNumber min={1} max={65535} placeholder="字符长度" style={{ width: '100%' }} />
            </Form.Item>
          )}
          
          {formValues.type && requiresPrecisionConfig(formValues.type as FieldType) && (
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item
                name="precision"
                label="精度"
                style={{ flex: 1 }}
                rules={[{ required: true, message: '请输入精度' }]}
              >
                <InputNumber min={1} max={65} placeholder="总位数" style={{ width: '100%' }} />
              </Form.Item>
              {requiresScaleConfig(formValues.type as FieldType) && (
                <Form.Item
                  name="scale"
                  label="小数位"
                  style={{ flex: 1 }}
                >
                  <InputNumber min={0} max={30} placeholder="小数位数" style={{ width: '100%' }} />
                </Form.Item>
              )}
            </div>
          )}

          {/* 基础配置项 - 智能显示 */}
          <div style={{ display: 'flex', gap: 16 }}>
            {/* 可为空 - 所有类型都显示，但ID类型强制为false */}
            <Form.Item
              name="nullable"
              label="可为空"
              valuePropName="checked"
              labelCol={{ span: 12 }}
              wrapperCol={{ span: 12 }}
              style={{ flex: 1 }}
            >
              <Switch 
                disabled={formValues.type ? isIDType(formValues.type as FieldType) : false}
              />
            </Form.Item>

            {/* 唯一约束 - 根据类型智能显示 */}
            {formValues.type && shouldShowConfig(formValues.type as FieldType, 'unique') && (
              <Form.Item
                name="unique"
                label="唯一约束"
                valuePropName="checked"
                labelCol={{ span: 12 }}
                wrapperCol={{ span: 12 }}
                style={{ flex: 1 }}
              >
                <Switch />
              </Form.Item>
            )}

            {/* 主键 - 根据类型智能显示 */}
            {formValues.type && shouldShowConfig(formValues.type as FieldType, 'primary') && (
              <Form.Item
                name="primary"
                label="主键"
                valuePropName="checked"
                labelCol={{ span: 12 }}
                wrapperCol={{ span: 12 }}
                style={{ flex: 1 }}
              >
                <Switch />
              </Form.Item>
            )}
          </div>         

          {/* ADB 扩展类型配置 - 使用条件渲染，避免空白 Form.Item */}
          
          {/* ADB Media 配置 */}
          {formValues.type && shouldShowConfig(formValues.type as FieldType, 'mediaConfig') && (
            <div>
              <Form.Item
                name={['mediaConfig', 'mediaType']}
                label="媒体类型"
                rules={[{ required: true, message: '请选择媒体类型' }]}
              >
                <Select placeholder="选择媒体类型">
                  <Option value="image">图片</Option>
                  <Option value="video">视频</Option>
                  <Option value="audio">音频</Option>
                  <Option value="document">文档</Option>
                  <Option value="file">文件</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name={['mediaConfig', 'formats']}
                label="支持格式"
                rules={[{ required: true, message: '请输入支持的文件格式' }]}
              >
                <Select mode="tags" placeholder="输入文件格式，如: jpg, png, gif">
                  <Option value="jpg">JPG</Option>
                  <Option value="png">PNG</Option>
                  <Option value="gif">GIF</Option>
                  <Option value="webp">WEBP</Option>
                  <Option value="mp4">MP4</Option>
                  <Option value="pdf">PDF</Option>
                </Select>
              </Form.Item>
              
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                  name={['mediaConfig', 'maxSize']}
                  label="最大限制(MB)"
                  style={{ flex: 1 }}
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                >
                  <InputNumber min={1} placeholder="文件大小限制" style={{ width: '100%' }} />
                </Form.Item>
                
                <Form.Item
                  name={['mediaConfig', 'isMultiple']}
                  label="允许多文件"
                  valuePropName="checked"
                  style={{ flex: 1 }}
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                >
                  <Switch />
                </Form.Item>
              </div>
              
              <Form.Item
                name={['mediaConfig', 'storagePath']}
                label="存储路径"
              >
                <Input placeholder="例如: uploads/avatars" />
              </Form.Item>
            </div>
          )}
          
          {/* ADB Enum 配置 */}
          {formValues.type && shouldShowConfig(formValues.type as FieldType, 'enumConfig') && (
            <div>
              <Form.Item
                name={['enumConfig', 'isMultiple']}
                label="多选模式"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              
              <Form.Item
                name={['enumConfig', 'default']}
                label="默认值"
              >
                <Input placeholder="枚举默认值" />
              </Form.Item>
            </div>
          )}
          
          {/* Auto Increment ID 配置 */}
          {formValues.type && shouldShowConfig(formValues.type as FieldType, 'autoIncrementIdConfig') && (
            <div>
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                  name={['autoIncrementIdConfig', 'startValue']}
                  label="起始值"
                  style={{ flex: 1 }}
                >
                  <InputNumber min={1} placeholder="起始值" style={{ width: '100%' }} />
                </Form.Item>
                
                <Form.Item
                  name={['autoIncrementIdConfig', 'increment']}
                  label="增量"
                  style={{ flex: 1 }}
                >
                  <InputNumber min={1} placeholder="增量" style={{ width: '100%' }} />
                </Form.Item>
              </div>
              
              <Form.Item
                name={['autoIncrementIdConfig', 'sequenceName']}
                label="序列名称"
              >
                <Input placeholder="PostgreSQL序列名称" />
              </Form.Item>
              
              <Form.Item
                name={['autoIncrementIdConfig', 'isPrimaryKey']}
                label="是否主键"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>
          )}
          
          {/* GUID ID 配置 */}
          {formValues.type && shouldShowConfig(formValues.type as FieldType, 'guidIdConfig') && (
            <div>
              <Space style={{ width: '100%' }}>
                <Form.Item
                  name={['guidIdConfig', 'version']}
                  label="GUID版本"
                  style={{ flex: 1 }}
                >
                  <Select placeholder="选择版本">
                    <Option value="v1">V1 - 基于时间戳</Option>
                    <Option value="v4">V4 - 随机（推荐）</Option>
                    <Option value="v5">V5 - 基于命名空间</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item
                  name={['guidIdConfig', 'format']}
                  label="格式"
                  style={{ flex: 1 }}
                >
                  <Select placeholder="选择格式">
                    <Option value="default">标准格式</Option>
                    <Option value="braced">大括号格式</Option>
                    <Option value="binary">二进制格式</Option>
                    <Option value="urn">URN格式</Option>
                  </Select>
                </Form.Item>
              </Space>
              
              <Form.Item
                name={['guidIdConfig', 'isPrimaryKey']}
                label="是否主键"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              
              <Form.Item
                name={['guidIdConfig', 'generateOnInsert']}
                label="插入时自动生成"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>
          )}
          
          {/* Snowflake ID 配置 */}
          {formValues.type && shouldShowConfig(formValues.type as FieldType, 'snowflakeIdConfig') && (
            <div>
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                  name={['snowflakeIdConfig', 'machineId']}
                  label="机器ID"
                  style={{ flex: 1 }}
                >
                  <InputNumber min={0} max={1023} placeholder="0-1023" style={{ width: '100%' }} />
                </Form.Item>
                
                <Form.Item
                  name={['snowflakeIdConfig', 'datacenterId']}
                  label="数据中心ID"
                  style={{ flex: 1 }}
                >
                  <InputNumber min={0} max={31} placeholder="0-31" style={{ width: '100%' }} />
                </Form.Item>
              </div>
              
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                  name={['snowflakeIdConfig', 'format']}
                  label="输出格式"
                  style={{ flex: 1 }}
                >
                  <Select placeholder="选择格式">
                    <Option value="number">数字格式（推荐）</Option>
                    <Option value="string">字符串格式</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item
                  name={['snowflakeIdConfig', 'isPrimaryKey']}
                  label="是否主键"
                  valuePropName="checked"
                  style={{ flex: 1 }}
                >
                  <Switch />
                </Form.Item>
              </div>
              
              <Form.Item
                name={['snowflakeIdConfig', 'generateOnInsert']}
                label="插入时自动生成"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>
          )}

          {/* 默认值 - 根据类型智能显示 */}
          {formValues.type && shouldShowConfig(formValues.type as FieldType, 'default') && (
            <Form.Item
              name="default"
              label="默认值"
            >
              {(() => {
                const defaultValueOptions = getDefaultValueOptions(formValues.type as FieldType);
                if (defaultValueOptions) {
                  return (
                    <Select 
                      placeholder="选择或输入默认值" 
                      allowClear
                      showSearch
                      filterOption={(input, option) => {
                        // 允许搜索选项
                        return option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false;
                      }}
                      dropdownRender={(menu) => (
                        <div>
                          {menu}
                          <div style={{ padding: '8px 12px', fontSize: '12px', color: '#666' }}>
                            💡 您可以直接输入自定义值
                          </div>
                        </div>
                      )}
                    >
                      {defaultValueOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  );
                }
                return <Input placeholder="字段默认值（可选）" />;
              })()}
            </Form.Item>
          )}
          
        </Form>
      </Modal>
    </div>
  );
};

export default FieldsManager;