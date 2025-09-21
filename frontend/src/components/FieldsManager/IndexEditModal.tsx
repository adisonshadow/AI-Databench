import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, message, Tabs } from 'antd';
import type { Index } from '@/types/storage';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { v4 as uuidv4 } from 'uuid';
import { projectStore } from '@/stores/projectStore';

const { Option } = Select;

interface IndexEditModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: Index) => void;
  editingIndex: Index | null;
  availableFields: string[];
  currentIndexes: Index[]; // 添加当前索引列表属性
  defaultActiveTab?: string; // 默认激活的Tab
  project?: any; // 项目信息
  entity?: any; // 当前实体信息
}

const IndexEditModal: React.FC<IndexEditModalProps> = ({ 
  visible, 
  onCancel, 
  onOk, 
  editingIndex,
  availableFields,
  currentIndexes, // 接收当前索引列表
  defaultActiveTab = 'ai',
  project,
  entity
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>(defaultActiveTab);
  const [aiForm] = Form.useForm();
  
  // 处理AI创建索引
  const handleAICreateIndex = async (values: { prompt: string }) => {
    try {
      // 先添加实体到AI Chat上下文
      if (entity && project) {
        const entityContext = {
          id: uuidv4(),
          type: 'entity' as const,
          entityCode: entity.entityInfo.code,
          entityName: entity.entityInfo.label || entity.entityInfo.code,
          description: `${entity.entityInfo.label || entity.entityInfo.code}(${entity.entityInfo.code})`
        };
        projectStore.addAIChatContext(entityContext);
      }

      // 构建完整的AI提示词
      const fullPrompt = `请帮我为实体"${entity?.entityInfo.label || '当前实体'}"创建一个或多个新的索引。以下是需求描述：

${values.prompt}

注意：
1. 在本体系中 表 和 实体 是同一个概念
2. 在本体系中 字段 和 列 是同一个概念
3. 请基于需求描述展开设计，不要遗漏任何需求，并确保设计结果符合本体系的设计规范
4. 请考虑索引的类型（普通索引、唯一索引等）和涉及的字段
`.replace(/\n/g, '\n\n');

      // 通过事件总线发送消息到AI Chat
      console.log('🚀 通过事件总线发送索引创建消息到AI Chat:', fullPrompt);
      eventBus.emit(EVENTS.SEND_MESSAGE_TO_AI_CHAT, fullPrompt);
      
      // 关闭模态框
      onCancel();
      
    } catch (error) {
      console.error('AI创建索引失败:', error);
    }
  };

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
      onOk={() => {
        if (activeTab === 'ai') {
          aiForm.submit();
        } else {
          handleOk();
        }
      }}
      onCancel={onCancel}
      width={600}
      maskClosable={false}
      destroyOnHidden
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'ai',
            label: 'AI',
            children: (
              <Form
                form={aiForm}
                onFinish={handleAICreateIndex}
                layout="vertical"
                preserve={true}
              >
                <Form.Item
                  name="prompt"
                  label="索引需求描述"
                  rules={[{ required: true, message: '请输入索引创建的需求描述' }]}
                >
                  <Input.TextArea 
                    rows={6} 
                    placeholder="例如：为员工实体的姓名和邮箱字段创建唯一索引，为创建时间字段创建普通索引"
                  />
                </Form.Item>
              </Form>
            )
          },
          {
            key: 'manual',
            label: '手工',
            children: (
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
            )
          }
        ]}
      />
    </Modal>
  );
};

export default IndexEditModal;