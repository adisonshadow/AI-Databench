import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Space, 
  Typography, 
  Card, 
  message,
  Flex
} from 'antd';
import { 
  RobotOutlined, 
  FileTextOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { Bubble, Sender } from '@ant-design/x';
import { aiModelSelected, createAIModelSender, type AIModelConfig, type AIModelSender as IAIModelSender } from 'ai-model-application-suite';
import PromptGeneratorApp from './PromptGeneratorApp';
import { getSelectedAIModelConfig } from '../utils/AIModel.ts';
import type { Project, ADBEntity } from '@/types/storage';

const { Text } = Typography;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 创建真实AI发送器
const createRealAISender = (config: AIModelConfig): IAIModelSender => {
  try {
    // 安全地处理日期字段
    const createdAt = config.createdAt instanceof Date 
      ? config.createdAt.getTime() 
      : typeof config.createdAt === 'number' 
        ? config.createdAt 
        : new Date(config.createdAt).getTime();
    
    const updatedAt = config.updatedAt instanceof Date 
      ? config.updatedAt.getTime() 
      : typeof config.updatedAt === 'number' 
        ? config.updatedAt 
        : new Date(config.updatedAt).getTime();

    // 转换配置格式以匹配 unified-AI-chat-transceiver 的类型要求
    const convertedConfig = {
      ...config,
      provider: config.provider as string,
      createdAt,
      updatedAt,
      config: config.config || { apiKey: '' } // 确保 config 存在
    };
    
    console.log('转换后的配置:', convertedConfig);
    return createAIModelSender(convertedConfig as unknown as AIModelConfig);
  } catch (error) {
    console.error('创建AI发送器失败:', error);
    console.error('原始配置:', config);
    throw error;
  }
};

interface AIAddNewEntitiesProps {
  visible: boolean;
  onClose: () => void;
  project: Project;
  onEntityCreated?: (entity: ADBEntity) => void;
}

const AIAddNewEntities: React.FC<AIAddNewEntitiesProps> = ({
  visible,
  onClose,
  project,
  onEntityCreated
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: '你好！我是AI ORM设计专家，可以帮助你设计和创建数据库实体。请告诉我你的业务需求，我会为你设计合适的实体结构。' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModelConfig | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听AI模型选择变化
  useEffect(() => {
    const unsubscribe = aiModelSelected.onChange((config) => {
      if (config) {
        setSelectedModel(config);
        console.log('aiModelSelected 选择变化:', config);
      }
    });

    // 初始化时获取当前配置
    const currentConfig = getSelectedAIModelConfig();
    if (currentConfig) {
      setSelectedModel(currentConfig);
    }

    // 初始化管理器
    aiModelSelected.initialize();

    return () => {
      unsubscribe();
    };
  }, []);

  // 发送聊天消息
  const sendChatMessage = async () => {
    if (!inputMessage.trim() || !selectedModel) return;
    
    console.log('当前选中的模型配置:', selectedModel);

    const userMessage: ChatMessage = { role: 'user', content: inputMessage };
    const displayMessages = [...messages, userMessage];
    setMessages(displayMessages);
    
    // 构建发送给AI的消息列表
    const aiMessages = [...messages, userMessage];
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    console.log('🚀 发送AI实体设计请求:', {
      timestamp: new Date().toISOString(),
      userMessage: userMessage.content,
      selectedConfig: {
        id: selectedModel.id,
        name: selectedModel.name,
        provider: selectedModel.provider,
        model: selectedModel.config?.model
      }
    });

    try {
      // 流式聊天 - 直接处理流式响应
      console.log('📡 开始接收流式数据...');
      
      // 先添加一个空的助手消息，用于实时更新
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: ''
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      try {
        // 直接调用 OpenAI 客户端获取流式响应
        const sender = createRealAISender(selectedModel);
        const openaiClient = (sender as unknown as { 
          client: { 
            chat: { 
              completions: { 
                create: (options: unknown) => Promise<unknown> 
              } 
            } 
          } 
        }).client; // 获取 OpenAI 客户端实例
        
        if (!openaiClient) {
          throw new Error('无法获取 OpenAI 客户端');
        }
        
        // 直接创建流式请求
        const response = await openaiClient.chat.completions.create({
          model: selectedModel.config?.model || 'deepseek-v3-1-250821',
          messages: aiMessages.map((msg: ChatMessage) => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        });
        
        let fullContent = '';
        
        // 实时处理每个 chunk
        for await (const chunk of response as AsyncIterable<{ 
          id?: string; 
          choices?: Array<{ 
            finish_reason?: string; 
            delta?: { content?: string } 
          }> 
        }>) {
          // 检查是否有 finish_reason
          const isEnd = chunk.choices?.[0]?.finish_reason === 'stop';
          
          if (chunk.choices && chunk.choices.length > 0) {
            chunk.choices.forEach((choice: { 
              finish_reason?: string; 
              delta?: { content?: string } 
            }) => {
              if (choice.delta && choice.delta.content) {
                const deltaContent = choice.delta.content;
                fullContent += deltaContent;
                
                // 实时更新消息内容
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = fullContent;
                  }
                  return newMessages;
                });
              }
            });
          }
          
          if (isEnd) {
            console.log('🏁 流式响应完成1', fullContent);
            break;
          }
        }
        
        console.log('✅ AI实体设计完成');
        
      } catch (streamError: unknown) {
        // 如果流式处理失败，更新错误消息
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = `❌ 流式响应失败: ${streamError instanceof Error ? streamError.message : '未知错误'}`;
          }
          return newMessages;
        });
        throw streamError;
      }
    } catch (err: unknown) {
      const errorMessage = `发送失败: ${err instanceof Error ? err.message : '未知错误'}`;
      setError(errorMessage);
      
      console.error('❌ AI实体设计请求失败:', {
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : '未知错误',
        userMessage: userMessage.content,
        selectedConfig: selectedModel.id
      });
      
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `❌ 错误: ${errorMessage}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      console.log('🏁 AI实体设计请求处理完成');
    }
  };

  // 处理提示词生成器发送的提示词
  const handlePromptSent = useCallback((systemPrompt: string, userPrompt: string) => {
    // 更新系统消息
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[0].role === 'system') {
        newMessages[0].content = systemPrompt;
      } else {
        newMessages.unshift({ role: 'system', content: systemPrompt });
      }
      return newMessages;
    });

    // 设置用户输入
    setInputMessage(userPrompt);
    setShowPromptGenerator(false);
    
    message.success('提示词已设置，可以发送给AI助手');
  }, []);

  // 清空聊天记录
  const clearChat = () => {
    setMessages([{ role: 'system', content: '你好！我是AI ORM设计专家，可以帮助你设计和创建数据库实体。请告诉我你的业务需求，我会为你设计合适的实体结构。' }]);
    setError(null);
  };


  return (
    <>
      <Modal
        title={
          <Space>
            <RobotOutlined />
            <span>AI新建实体</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={1200}
        footer={null}
        destroyOnHidden={true}
      >
        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
          {/* 顶部工具栏 */}
          <div style={{ marginBottom: 16 }}>
            <Flex justify="space-between" align="center">
              <Space>
                <Button 
                  type="primary" 
                  icon={<FileTextOutlined />}
                  onClick={() => setShowPromptGenerator(true)}
                >
                  提示词生成器
                </Button>
                <Button 
                  icon={<DatabaseOutlined />}
                  onClick={clearChat}
                  disabled={messages.length <= 1}
                >
                  清空对话
                </Button>
              </Space>
              
              <Space>
                <Text strong>当前AI模型：</Text>
                <Text type="secondary">{selectedModel?.name || '未选择'}</Text>
              </Space>
            </Flex>
          </div>

          {/* 聊天界面 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* 消息列表 */}
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
              <Bubble.List
                items={messages?.map((message: ChatMessage, index) => ({
                  ...message,
                  key: index.toString(),
                  role: message.role === 'user' ? 'user' : 'assistant',
                  content: message.content,
                  header: message.role === 'user' ? '用户' : 
                         message.role === 'assistant' ? 'AI助手' : '系统',
                  placement: message.role === 'user' ? 'end' : 'start',
                  variant: message.role === 'user' ? 'filled' : 'outlined',
                  classNames: {
                    content: '',
                  },
                  typing: false,
                }))}
                roles={{
                  user: {
                    placement: 'end',
                    variant: 'filled',
                    header: '用户'
                  },
                  assistant: {
                    placement: 'start',
                    variant: 'outlined',
                    header: 'AI助手'
                  },
                  system: {
                    placement: 'start',
                    variant: 'outlined',
                    header: '系统'
                  }
                }}
                autoScroll={true}
                style={{ height: '100%' }}
              />
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div>
              <Sender
                value={inputMessage}
                onChange={setInputMessage}
                onSubmit={() => {
                  setIsLoading(true);
                  sendChatMessage();
                }}
                placeholder="输入你的业务需求... (Shift+Enter换行，Enter发送)"
                disabled={isLoading}
                autoSize={{ minRows: 2, maxRows: 6 }}
                footer={({ components }) => {
                  const { SendButton, LoadingButton } = components;
                  return (
                    <Flex justify="end" align="center">
                      {isLoading ? (
                        <LoadingButton type="default" />
                      ) : (
                        <SendButton type="primary" disabled={!selectedModel} />
                      )}
                    </Flex>
                  );
                }}
                onCancel={() => {
                  setIsLoading(false);
                }}
                actions={false}
              />
            </div>
          </div>

          {/* 错误信息显示 */}
          {error && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Text type="danger">错误: {error}</Text>
            </Card>
          )}
        </div>
      </Modal>

      {/* 提示词生成器 */}
      <PromptGeneratorApp
        visible={showPromptGenerator}
        onClose={() => setShowPromptGenerator(false)}
        onSendPrompt={handlePromptSent}
      />
    </>
  );
};

export default AIAddNewEntities;
