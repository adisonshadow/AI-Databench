import React, { useState, useCallback, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Card, 
  Divider,
  message,
  Tabs,
  Select,
  Tag
} from 'antd';
import { 
  RobotOutlined, 
  CopyOutlined, 
  SendOutlined,
  FileTextOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { aiModelSelected } from 'ai-model-application-suite';

const { TextArea } = Input;
const { Text } = Typography;
const { TabPane } = Tabs;

interface PromptGeneratorAppProps {
  visible: boolean;
  onClose: () => void;
  onSendPrompt?: (systemPrompt: string, userPrompt: string) => void;
}

interface PromptFormValues {
  businessDescription: string;
  requirements: string[];
  entityName: string;
  entityDescription: string;
  businessFields: string[];
  entities: string[];
  businessRelations: string[];
  generalInput: string;
  context: string;
}

const PromptGeneratorApp: React.FC<PromptGeneratorAppProps> = ({
  visible,
  onClose,
  onSendPrompt
}) => {
  const [form] = Form.useForm<PromptFormValues>();
  const [activeTab, setActiveTab] = useState('entity');
  const [generatedPrompts, setGeneratedPrompts] = useState<{
    systemPrompt: string;
    userPrompt: string;
  } | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // 监听AI模型选择变化
  useEffect(() => {
    const unsubscribe = aiModelSelected.onChange((config) => {
      if (config) {
        setSelectedModelId(config.id);
        console.log('PromptGeneratorApp aiModelSelected 选择变化:', config);
      }
    });

    // 初始化管理器
    aiModelSelected.initialize();

    return () => {
      unsubscribe();
    };
  }, []);

  // 生成提示词
  const generatePrompts = useCallback(() => {
    try {
      const values = form.getFieldsValue();
      let prompts: { systemPrompt: string; userPrompt: string };

      // 简化的提示词生成逻辑
      switch (activeTab) {
        case 'entity':
          prompts = {
            systemPrompt: '你是一个专业的数据库实体设计专家，擅长根据业务需求设计合理的数据库实体结构。',
            userPrompt: `请帮我设计一个数据库实体，业务描述如下：\n\n${values.businessDescription || ''}\n\n请按照以下格式返回设计结果：\n1. 实体基本信息（名称、描述、用途）\n2. 字段列表（字段名、类型、长度、是否必填、默认值、注释）\n3. 索引设计（主键、唯一索引、普通索引）\n4. 约束设计（外键、检查约束等）\n5. 实体关系（与其他实体的关联关系）`
          };
          break;
        case 'field':
          prompts = {
            systemPrompt: '你是一个专业的数据库字段设计专家，擅长为实体设计合理的字段结构。',
            userPrompt: `请为实体 "${values.entityName || ''}" 设计字段结构。\n\n实体描述：${values.entityDescription || ''}\n\n请按照以下格式返回字段设计：\n1. 基础字段（id、created_at、updated_at等）\n2. 业务字段（字段名、数据类型、长度、是否必填、默认值、注释）\n3. 索引设计（主键、唯一索引、普通索引）\n4. 约束设计（非空约束、检查约束等）`
          };
          break;
        case 'relation':
          prompts = {
            systemPrompt: '你是一个专业的数据库关系设计专家，擅长设计实体间的关联关系。',
            userPrompt: `请为以下实体设计关联关系：\n\n${(values.entities || []).map((entity, index) => `${index + 1}. ${entity}`).join('\n')}\n\n请按照以下格式返回关系设计：\n1. 关系类型（一对一、一对多、多对多）\n2. 外键设计（字段名、关联表、约束）\n3. 关联表设计（如需要）\n4. 级联规则（CASCADE、SET NULL、RESTRICT等）\n5. 索引优化建议`
          };
          break;
        case 'general':
          prompts = {
            systemPrompt: '你是一个专业的AI编程助手，擅长帮助用户进行数据库设计、实体建模、字段设计等任务。',
            userPrompt: values.generalInput || ''
          };
          break;
        default:
          throw new Error('未知的标签页类型');
      }

      setGeneratedPrompts(prompts);
      message.success('提示词生成成功！');
    } catch (error) {
      console.error('生成提示词失败:', error);
      message.error('生成提示词失败，请检查输入内容');
    }
  }, [form, activeTab]);

  // 发送提示词到AI
  const sendToAI = useCallback(() => {
    if (!generatedPrompts) {
      message.warning('请先生成提示词');
      return;
    }

    if (!selectedModelId) {
      message.warning('请先选择AI模型');
      return;
    }

    if (onSendPrompt) {
      onSendPrompt(generatedPrompts.systemPrompt, generatedPrompts.userPrompt);
      message.success('提示词已发送到AI助手');
    }
  }, [generatedPrompts, selectedModelId, onSendPrompt]);

  // 复制提示词
  const copyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt).then(() => {
      message.success('提示词已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  }, []);

  // 重置表单
  const resetForm = useCallback(() => {
    form.resetFields();
    setGeneratedPrompts(null);
  }, [form]);

  // 处理标签页切换
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
    setGeneratedPrompts(null);
  }, []);

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          <span>AI提示词生成器</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
      destroyOnHidden={true}
    >
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          {/* 实体创建 */}
          <TabPane 
            tab={
              <Space>
                <DatabaseOutlined />
                <span>实体创建</span>
              </Space>
            } 
            key="entity"
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="businessDescription"
                label="业务描述"
                rules={[{ required: true, message: '请输入业务描述' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="请详细描述需要创建的实体对应的业务场景，例如：用户管理系统中的用户实体..."
                />
              </Form.Item>

              <Form.Item
                name="requirements"
                label="具体要求"
              >
                <Select
                  mode="tags"
                  placeholder="输入具体要求，按回车添加"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Form>
          </TabPane>

          {/* 字段设计 */}
          <TabPane 
            tab={
              <Space>
                <FileTextOutlined />
                <span>字段设计</span>
              </Space>
            } 
            key="field"
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="entityName"
                label="实体名称"
                rules={[{ required: true, message: '请输入实体名称' }]}
              >
                <Input placeholder="例如：用户、订单、商品..." />
              </Form.Item>

              <Form.Item
                name="entityDescription"
                label="实体描述"
                rules={[{ required: true, message: '请输入实体描述' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="请描述该实体的作用和用途..."
                />
              </Form.Item>

              <Form.Item
                name="businessFields"
                label="业务字段"
              >
                <Select
                  mode="tags"
                  placeholder="输入需要包含的业务字段，按回车添加"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Form>
          </TabPane>

          {/* 关系设计 */}
          <TabPane 
            tab={
              <Space>
                <DatabaseOutlined />
                <span>关系设计</span>
              </Space>
            } 
            key="relation"
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="entities"
                label="相关实体"
                rules={[{ required: true, message: '请输入相关实体' }]}
              >
                <Select
                  mode="tags"
                  placeholder="输入需要设计关系的实体名称，按回车添加"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="businessRelations"
                label="业务关系"
              >
                <Select
                  mode="tags"
                  placeholder="输入业务关系描述，按回车添加"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Form>
          </TabPane>

          {/* 通用助手 */}
          <TabPane 
            tab={
              <Space>
                <RobotOutlined />
                <span>通用助手</span>
              </Space>
            } 
            key="general"
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="context"
                label="上下文信息"
              >
                <TextArea
                  rows={3}
                  placeholder="可选：提供相关的上下文信息..."
                />
              </Form.Item>

              <Form.Item
                name="generalInput"
                label="用户需求"
                rules={[{ required: true, message: '请输入用户需求' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="请描述您的具体需求..."
                />
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>

        <Divider />

        {/* 操作按钮 */}
        <Space style={{ marginBottom: 16 }}>
          <Button 
            type="primary" 
            icon={<RobotOutlined />}
            onClick={generatePrompts}
          >
            生成提示词
          </Button>
          <Button onClick={resetForm}>
            重置
          </Button>
        </Space>

        {/* 生成的提示词显示 */}
        {generatedPrompts && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 系统提示词 */}
              <Card 
                title={
                  <Space>
                    <Tag color="blue">系统提示词</Tag>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<CopyOutlined />}
                      onClick={() => copyPrompt(generatedPrompts.systemPrompt)}
                    >
                      复制
                    </Button>
                  </Space>
                }
                size="small"
              >
                <TextArea
                  value={generatedPrompts.systemPrompt}
                  rows={6}
                  readOnly
                  style={{ fontFamily: 'monospace' }}
                />
              </Card>

              {/* 用户提示词 */}
              <Card 
                title={
                  <Space>
                    <Tag color="green">用户提示词</Tag>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<CopyOutlined />}
                      onClick={() => copyPrompt(generatedPrompts.userPrompt)}
                    >
                      复制
                    </Button>
                  </Space>
                }
                size="small"
              >
                <TextArea
                  value={generatedPrompts.userPrompt}
                  rows={8}
                  readOnly
                  style={{ fontFamily: 'monospace' }}
                />
              </Card>

              {/* AI模型选择和发送 */}
              <Card title="发送到AI助手" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>当前AI模型：</Text>
                    <Text type="secondary">{selectedModelId || '未选择'}</Text>
                  </div>
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />}
                    onClick={sendToAI}
                    disabled={!selectedModelId}
                  >
                    发送到AI助手
                  </Button>
                </Space>
              </Card>
            </Space>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PromptGeneratorApp;
