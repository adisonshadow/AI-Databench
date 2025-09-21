import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Table,
  Button,
  Input,
  Space,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Segmented,
  Popover,
  List,
  Form,
  Select,
  Divider,
  Empty
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  HolderOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Project, ADBEnumDefinition } from '@/types/storage';
import { StorageService } from '@/stores/storage';

// 定义树节点类型
interface TreeNode {
  value: string;
  label: string;
  children?: TreeNode[];
  parentPath?: string;
  enumInfo?: {
    id: string;
    code: string;
    label: string;
    description?: string;
    items?: Record<string, { label: string; description?: string; sort?: number }>;
  };
  createdAt?: string;
  updatedAt?: string;
}

// 定义表格记录类型
interface TableRecord {
  id?: string;
  enumInfo?: {
    id: string;
    code: string;
    label: string;
    description?: string;
    items?: Record<string, { label: string; description?: string; sort?: number }>;
  };
  value?: string;
  label?: string;
  children?: TreeNode[];
  createdAt?: string;
  updatedAt?: string;
}

// 可拖拽的枚举选项组件
interface SortableEnumOptionProps {
  id: string;
  index: number;
  children: React.ReactNode;
}

const SortableEnumOption: React.FC<SortableEnumOptionProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            marginRight: 8,
            color: '#999',
            fontSize: 14,
          }}
        >
          <HolderOutlined />
        </div>
        {children}
      </div>
    </div>
  );
};

interface ADBEnumManagerProps {
  visible: boolean;
  onClose: () => void;
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

interface EnumFormValues {
  code: string;
  label: string;
  description?: string;
  status: 'enabled' | 'disabled' | 'archived';
  options: Array<{
    value: string | number;
    label: string;
    description?: string;
    order?: number;
  }>;
}

const ADBEnumManager: React.FC<ADBEnumManagerProps> = ({ 
  visible, 
  onClose, 
  project, 
  onProjectUpdate 
}) => {
  const [enums, setEnums] = useState<ADBEnumDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingEnum, setEditingEnum] = useState<ADBEnumDefinition | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 计算Modal尺寸
  const modalWidth = windowSize.width - 40; // 左右各留20px边距
  const modalHeight = windowSize.height - 40; // 上下各留20px边距

  // 获取枚举列表
  const fetchEnums = useCallback(() => {
    setLoading(true);
    try {
      const enumList = Object.values(project.schema.enums || {});
      setEnums(enumList);
    } catch (error) {
      console.error('获取枚举列表失败:', error);
      message.error('获取枚举列表失败');
    } finally {
      setLoading(false);
    }
  }, [project.schema.enums]);

  // 过滤枚举列表
  const filteredEnums = useMemo(() => enums.filter(enumItem =>
    enumItem.enumInfo.code.toLowerCase().includes(searchText.toLowerCase()) ||
    enumItem.enumInfo.label.toLowerCase().includes(searchText.toLowerCase()) ||
    enumItem.enumInfo.description?.toLowerCase().includes(searchText.toLowerCase())
  ), [enums, searchText]);

  // 构建树形数据
  const treeData = useMemo(() => {
    // 按照枚举代码的冒号分割构建层级结构
    const codeMap = new Map<string, TreeNode>();
    const result: TreeNode[] = [];
    const allCodes: string[] = []; // 收集所有节点的 code

    // 首先创建所有节点
    filteredEnums.forEach(enumItem => {
      const codes = enumItem.enumInfo.code.split(':');
      let currentPath = '';
      
      codes.forEach((code: string, index: number) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}:${code}` : code;
        allCodes.push(currentPath); // 添加到所有 codes 列表
        
        if (!codeMap.has(currentPath)) {
          const node: TreeNode = {
            value: currentPath,
            label: index === codes.length - 1 ? enumItem.enumInfo.label : code,
            children: [],
            parentPath: parentPath || undefined,
            enumInfo: index === codes.length - 1 ? enumItem.enumInfo : undefined,
            createdAt: index === codes.length - 1 ? enumItem.createdAt : undefined,
            updatedAt: index === codes.length - 1 ? enumItem.updatedAt : undefined
          };
          codeMap.set(currentPath, node);
        }
      });
    });

    // 构建树形结构
    codeMap.forEach((node) => {
      if (node.parentPath) {
        const parent = codeMap.get(node.parentPath);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        result.push(node);
      }
    });

    // 设置所有节点为展开状态
    setExpandedRowKeys(allCodes);

    return result;
  }, [filteredEnums]);

  // 收集所有树节点的key
  const collectAllKeys = useCallback((nodes: TreeNode[]): string[] => {
    const keys: string[] = [];
    const collect = (nodeList: TreeNode[]) => {
      nodeList.forEach(node => {
        keys.push(node.value);
        if (node.children && node.children.length > 0) {
          collect(node.children);
        }
      });
    };
    collect(nodes);
    return keys;
  }, []);

  // 当切换到树形视图时，展开所有节点
  useEffect(() => {
    if (viewMode === 'tree' && treeData.length > 0) {
      const keys = collectAllKeys(treeData);
      setExpandedRowKeys(keys);
    }
  }, [viewMode, filteredEnums.length, treeData, collectAllKeys]);

  // 处理删除枚举
  const handleDelete = useCallback(async (id: string) => {
    try {
      const updatedEnums = { ...project.schema.enums };
      delete updatedEnums[id];
      
      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          enums: updatedEnums
        }
      };
      
      // 保存到localStorage
      StorageService.saveProject(updatedProject);
      onProjectUpdate(updatedProject);
      message.success('枚举删除成功');
    } catch (error: unknown) {
      console.error('删除枚举失败:', error);
      message.error('删除枚举失败');
    }
  }, [project, onProjectUpdate]);

  // 处理编辑枚举
  const handleEdit = useCallback((record: ADBEnumDefinition) => {
    setEditingEnum(record);
    setFormVisible(true);
  }, []);

  // 处理添加枚举
  const handleAdd = useCallback(() => {
    setEditingEnum(null);
    setFormVisible(true);
  }, []);

  // 处理表单成功
  const handleFormSuccess = useCallback(() => {
    fetchEnums();
  }, [fetchEnums]);

  // 处理表单关闭
  const handleFormClose = useCallback(() => {
    setFormVisible(false);
    setEditingEnum(null);
  }, []);

  // 统一的列定义
  const columns = useMemo(() => [
    {
      title: '代码',
      dataIndex: viewMode === 'tree' ? 'value' : 'enumInfo.code',
      key: 'code',
      width: viewMode === 'tree' ? 300 : undefined,
      render: (text: string, record: TableRecord) => {
        // 树形视图：虚拟节点显示节点名称，叶子节点显示代码标签
        if (viewMode === 'tree') {
          if (record.children && record.children.length > 0) {
            return <span style={{ fontWeight: 'bold' }}>{record.label}</span>;
          }
          return <Tag color="blue">{record.enumInfo?.code || record.value}</Tag>;
        }
        // 列表视图：显示代码标签
        return <Tag color="blue">{record.enumInfo?.code || text}</Tag>;
      }
    },
    {
      title: '显示名称',
      dataIndex: 'enumInfo.label',
      key: 'label',
      width: viewMode === 'tree' ? 200 : undefined,
      ellipsis: true,
      render: (text: string, record: TableRecord) => {
        // 树形视图：只有叶子节点才显示名称
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        
        // 树形视图时，从 enumInfo 中获取名称
        const label = viewMode === 'tree' ? (record.enumInfo?.label || text) : (record.enumInfo?.label || text);
        return label;
      }
    },
    {
      title: '描述',
      dataIndex: 'enumInfo.description',
      key: 'description',
      width: viewMode === 'tree' ? 200 : undefined,
      ellipsis: true,
      render: (text: string, record: TableRecord) => {
        // 树形视图：只有叶子节点才显示描述
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        
        // 树形视图时，从 enumInfo 中获取描述
        const description = viewMode === 'tree' ? (record.enumInfo?.description || text) : (record.enumInfo?.description || text);
        return description || '-';
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (_status: string, record: TableRecord) => {
        // 树形视图：只有叶子节点才显示状态
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        
        // ADBEnumDefinition没有status字段，默认显示为启用
        const enumStatus = 'enabled';
        const statusColors = {
          enabled: 'success',
          disabled: 'default',
          archived: 'red'
        };
        const statusLabels = {
          enabled: '启用',
          disabled: '禁用',
          archived: '归档'
        };
        
        return (
          <Tag color={statusColors[enumStatus as keyof typeof statusColors]}>
            {statusLabels[enumStatus as keyof typeof statusLabels]}
          </Tag>
        );
      }
    },
    {
      title: '选项数量',
      key: 'optionsCount',
      width: 80,
      render: (record: TableRecord) => {
        // 树形视图：只有叶子节点才显示选项数量
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        
        const enumData = viewMode === 'tree' ? record : record;
        const options = Object.entries(enumData.enumInfo?.items || {});
        const optionsContent = (
          <div style={{ maxWidth: 300, maxHeight: 280, overflow: 'auto' }}>
            {options.length > 0 ? (
              <List
                size="small"
                dataSource={options as [string, { label: string; description?: string; sort?: number }][]}
                renderItem={([value, item]: [string, { label: string; description?: string; sort?: number }], index: number) => (
                  <List.Item
                    key={index}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: 4,
                      marginBottom: 4
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{value}</div>
                        {item.sort !== undefined && (
                          <div style={{ color: '#999', fontSize: '12px' }}>排序: {item.sort}</div>
                        )}
                      </div>
                      <div style={{ color: '#666', marginBottom: 2 }}>{item.label}</div>
                      {item.description && (
                        <div style={{ color: '#999', fontSize: '12px' }}>{item.description}</div>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="暂无选项"
                style={{ margin: '40px 0' }}
              />
            )}
          </div>
        );

        return (
          <Popover
            content={optionsContent}
            title="枚举选项详情"
            trigger="hover"
            placement="right"
            overlayStyle={{ maxWidth: 400 }}
          >
            <Tag color="green" style={{ cursor: 'pointer' }}>{options.length}</Tag>
          </Popover>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string, record: TableRecord) => {
        // 树形视图：只有叶子节点才显示创建时间
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        
        // 树形视图时，从 record 中获取创建时间
        const createdAt = viewMode === 'tree' ? (record.createdAt || text) : (record.createdAt || text);
        return createdAt ? new Date(createdAt).toLocaleString() : '-';
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (record: TableRecord) => {
        // 树形视图：只有叶子节点才显示操作按钮
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        
        const enumData = viewMode === 'tree' ? record : record;
        return (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(enumData as ADBEnumDefinition)}
              />
            </Tooltip>
            <Popconfirm
              title="确定要删除这个枚举吗？"
              description="删除后无法恢复，请谨慎操作"
              onConfirm={() => handleDelete(enumData.enumInfo?.id || enumData.id || '')}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      }
    }
  ], [viewMode, handleEdit, handleDelete]);

  useEffect(() => {
    if (visible) {
      fetchEnums();
    }
  }, [visible, fetchEnums]);

  return (
    <>
      <Modal
        title="ADB枚举管理"
        open={visible}
        onCancel={onClose}
        width={modalWidth}
        style={{ 
          top: 20,
          paddingBottom: 20,
          maxWidth: 'none',
        }}
        styles={{
          "body": {
            height: modalHeight - 70, // 减去标题栏高度
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
        footer={null}
        destroyOnHidden
        maskClosable={false}
      >
        {/* 搜索和操作区域 */}
        <div style={{ 
          marginBottom: 16,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Segmented
                options={[
                  { label: '列表', value: 'list' },
                  { label: '树形', value: 'tree' }
                ]}
                value={viewMode}
                onChange={(value) => setViewMode(value as 'list' | 'tree')}
              />
              <Input
                placeholder="搜索枚举代码、名称或描述"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
              />
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加枚举
            </Button>
          </div>
        </div>

        {/* 表格区域 */}
        <div style={{ 
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          height: modalHeight - 180
        }}>
          <Table
            columns={columns}
            dataSource={viewMode === 'list' ? filteredEnums : treeData}
            loading={loading}
            pagination={false}
            rowKey={viewMode === 'list' ? (record) => record.enumInfo?.id || record.enumInfo?.code || 'unknown' : "value"}
            size="small"
            style={{ flex: 1 }}
            expandable={viewMode === 'tree' ? {
              expandedRowKeys,
              onExpandedRowsChange: (expandedRows) => {
                setExpandedRowKeys(expandedRows as string[]);
              },
              childrenColumnName: "children",
              indentSize: 20
            } : undefined}
          />
        </div>
      </Modal>

      {/* 枚举表单模态框 */}
      <EnumForm
        visible={formVisible}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingEnum={editingEnum}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    </>
  );
};

// 枚举表单组件
interface EnumFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingEnum?: ADBEnumDefinition | null;
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const EnumForm: React.FC<EnumFormProps> = ({
  visible,
  onClose,
  onSuccess,
  editingEnum,
  project,
  onProjectUpdate
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Array<{
    value: string | number;
    label: string;
    description?: string;
    order?: number;
  }>>([]);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 当编辑枚举或模态框打开时，设置表单初始值
  useEffect(() => {
    if (visible) {
      if (editingEnum) {
        // 编辑模式：设置现有数据
        const initialOptions = Object.entries(editingEnum.enumInfo.items || {}).map(([value, item]) => ({
          value,
          label: (item as { label: string }).label,
          description: (item as { description?: string }).description,
          order: (item as { sort?: number }).sort
        }));
        
        const initialData = {
          code: editingEnum.enumInfo.code,
          label: editingEnum.enumInfo.label,
          description: editingEnum.enumInfo.description,
          status: 'enabled', // ADBEnumDefinition没有status字段，默认为enabled
          options: initialOptions
        };
        form.setFieldsValue(initialData);
        setOptions(initialOptions);
      } else {
        // 新增模式：重置表单
        const initialData = {
          status: 'enabled',
          options: []
        };
        form.resetFields();
        form.setFieldsValue(initialData);
        setOptions([]);
      }
    }
  }, [visible, editingEnum, form]);

  // 处理表单提交
  const handleSubmit = async (values: EnumFormValues) => {
    console.log('表单提交数据:', values);
    setLoading(true);
    try {
      // 创建符合ADBEnumDefinition接口的枚举数据
      const enumData: ADBEnumDefinition = {
        enumInfo: {
          id: editingEnum?.enumInfo?.id || crypto.randomUUID(),
          code: values.code,
          label: values.label,
          description: values.description,
          items: values.options.reduce((acc, option) => {
            acc[option.value.toString()] = {
              label: option.label,
              description: option.description,
              sort: option.order
            };
            return acc;
          }, {} as Record<string, { label: string; description?: string; sort?: number }>)
        },
        values: values.options.reduce((acc, option) => {
          acc[option.value.toString()] = option.label;
          return acc;
        }, {} as Record<string, string>),
        createdAt: editingEnum?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedEnums = {
        ...project.schema.enums,
        [enumData.enumInfo.id]: enumData
      };

      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          enums: updatedEnums
        }
      };

      // 保存到localStorage
      console.log('保存枚举到localStorage:', enumData);
      console.log('更新后的项目数据:', updatedProject);
      console.log('枚举ID:', enumData.enumInfo.id);
      console.log('枚举代码:', enumData.enumInfo.code);
      
      StorageService.saveProject(updatedProject);
      onProjectUpdate(updatedProject);
      message.success(editingEnum ? '枚举更新成功' : '枚举创建成功');

      onClose();
      form.resetFields();
      onSuccess();
    } catch (error: unknown) {
      console.error('保存枚举失败:', error);
      message.error('保存枚举失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理拖拽排序
  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex((item, index) => 
        item.value === active.id || (item.value === '' && active.id === `temp_${index}`)
      );
      const newIndex = options.findIndex((item, index) => 
        item.value === over.id || (item.value === '' && over.id === `temp_${index}`)
      );
      
      const newOptions = arrayMove(options, oldIndex, newIndex);
      
      // 更新排序值（自动设置）
      const updatedOptions = newOptions.map((option, index) => ({
        ...option,
        order: index + 1
      }));
      
      setOptions(updatedOptions);
      form.setFieldsValue({ options: updatedOptions });
    }
  };

  // 处理模态框关闭
  const handleClose = () => {
    form.resetFields();
    setOptions([]);
    onClose();
  };

  return (
    <Modal
      title={editingEnum ? '编辑枚举' : '添加枚举'}
      open={visible}
      onCancel={handleClose}
      onOk={() => form.submit()}
      width={600}
      destroyOnHidden
      confirmLoading={loading}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ paddingTop: 30 }}
      >
        <Form.Item
          name="code"
          label="枚举代码"
          rules={[
            { required: true, message: '请输入枚举代码' },
            { pattern: /^[a-zA-Z][a-zA-Z0-9_:]*$/, message: '代码格式不正确' }
          ]}
        >
          <Input placeholder="如：system:gender" />
        </Form.Item>

        <Form.Item
          name="label"
          label="枚举名称"
          rules={[
            { required: true, message: '请输入枚举名称' },
            { pattern: /^[a-z][a-z0-9_]*$/, message: '名称格式不正确' }
          ]}
        >
          <Input placeholder="如：gender" />
        </Form.Item>

        <Form.Item
          name="description"
          label="枚举描述"
        >
          <Input placeholder="请输入枚举描述" />
        </Form.Item>

        <Form.Item
          name="status"
          label="状态"
        >
          <Select>
            <Select.Option value="enabled">启用</Select.Option>
            <Select.Option value="disabled">禁用</Select.Option>
            <Select.Option value="archived">归档</Select.Option>
          </Select>
        </Form.Item>

        <Divider>枚举选项</Divider>

        <Form.List name="options">
          {(fields, { add, remove }) => (
            <>
              <div>
                <Button
                  type="dashed"
                  onClick={() => {
                    const newOption = {
                      value: '',
                      label: '',
                      description: '',
                      order: options.length + 1
                    };
                    add(newOption);
                    setOptions([...options, newOption]);
                  }}
                  icon={<PlusOutlined />}
                  style={{ marginBottom: 16 }}
                >
                  添加选项
                </Button>
              </div>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={options.map((option, index) => option.value?.toString() || `temp_${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {fields.map(({ key, name, ...restField }) => {
                    const currentOption = options[name] || {};
                    const optionId = currentOption.value?.toString() || `temp_${name}`;
                    return (
                      <SortableEnumOption
                        key={key}
                        id={optionId}
                        index={name}
                      >
                        <div
                          style={{
                            marginBottom: 8,
                            padding: '8px 20px 8px 8px',
                            backgroundColor: '#f5f5f511',
                            borderRadius: 6,
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <Form.Item
                            {...restField}
                            name={[name, 'value']}
                            style={{ margin: 0, flex: 1 }}
                            rules={[
                              { required: true, message: '请输入选项值' },
                            ]}
                          >
                            <Input 
                              placeholder="值" 
                              onChange={(e) => {
                                const newOptions = [...options];
                                newOptions[name] = { ...newOptions[name], value: e.target.value };
                                setOptions(newOptions);
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'label']}
                            style={{ margin: 0, flex: 1 }}
                            rules={[{ required: true, message: '请输入选项标签' }]}
                          >
                            <Input 
                              placeholder="标签" 
                              onChange={(e) => {
                                const newOptions = [...options];
                                newOptions[name] = { ...newOptions[name], label: e.target.value };
                                setOptions(newOptions);
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'description']}
                            style={{ margin: 0, flex: 1 }}
                          >
                            <Input 
                              placeholder="描述" 
                              onChange={(e) => {
                                const newOptions = [...options];
                                newOptions[name] = { ...newOptions[name], description: e.target.value };
                                setOptions(newOptions);
                              }}
                            />
                          </Form.Item>
                          <MinusCircleOutlined 
                            onClick={() => {
                              remove(name);
                              const newOptions = options.filter((_, index) => index !== name);
                              setOptions(newOptions);
                            }}
                            style={{ cursor: 'pointer', marginLeft: 8, color: '#ff4d4f' }}
                          />
                        </div>
                      </SortableEnumOption>
                    );
                  })}
                </SortableContext>
              </DndContext>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default ADBEnumManager;
