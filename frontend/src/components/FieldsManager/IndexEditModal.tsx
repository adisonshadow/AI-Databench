import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message } from 'antd';
import type { Index } from '@/types/storage';

const { Option } = Select;

interface IndexEditModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: Index) => void;
  editingIndex: Index | null;
  availableFields: string[];
  currentIndexes: Index[]; // 添加当前索引列表属性
}

const IndexEditModal: React.FC<IndexEditModalProps> = ({ 
  visible, 
  onCancel, 
  onOk, 
  editingIndex,
  availableFields,
  currentIndexes // 接收当前索引列表
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (editingIndex) {
        form.setFieldsValue({
          name: editingIndex.name,
          fields: editingIndex.fields,
          unique: editingIndex.unique,
          type: editingIndex.type || undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, editingIndex, form]);

  // 检查索引名称是否重复
  const validateIndexName = (name: string): Promise<void> => {
    if (!name) {
      return Promise.resolve();
    }

    // 检查是否有同名索引（排除当前编辑的索引）
    const isDuplicate = currentIndexes.some(index => 
      index.name === name && 
      (!editingIndex || index.id !== editingIndex.id)
    );

    if (isDuplicate) {
      return Promise.reject(new Error('该索引名称已存在，请使用其他名称'));
    }
    
    return Promise.resolve();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const indexData: Index = {
        id: editingIndex?.id || `index_${Date.now()}`,
        name: values.name,
        fields: values.fields,
        unique: values.unique,
        type: values.type,
      };
      onOk(indexData);
    } catch (error) {
      message.error('请检查表单填写是否正确');
    }
  };

  return (
    <Modal
      title={editingIndex ? '编辑索引' : '新建索引'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={600}
      maskClosable={false}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          unique: false,
        }}
      >
        <Form.Item
          name="name"
          label="索引名称"
          hasFeedback
          rules={[
            { required: true, message: '请输入索引名称' },
            { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '索引名称只能包含字母、数字和下划线，且必须以字母开头' },
            {
              validator: (_, value) => validateIndexName(value),
            }
          ]}
        >
          <Input placeholder="索引名称" />
        </Form.Item>

        <Form.Item
          name="fields"
          label="字段"
          rules={[{ required: true, message: '请选择字段' }]}
        >
          <Select
            mode="multiple"
            placeholder="请选择字段"
            options={availableFields.map(field => ({
              label: field,
              value: field,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="unique"
          label="唯一性"
          valuePropName="checked"
        >
          <Switch checkedChildren="唯一" unCheckedChildren="非唯一" />
        </Form.Item>

        <Form.Item
          name="type"
          label="索引类型"
        >
          <Select placeholder="选择索引类型" allowClear>
            <Option value="btree">B-Tree</Option>
            <Option value="hash">Hash</Option>
            <Option value="gin">GIN</Option>
            <Option value="gist">GIST</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default IndexEditModal;