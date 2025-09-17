import React, { useState, useRef, useEffect } from 'react';
import { 
  Button, 
  Space, 
  Typography, 
//   Avatar, 
  Tooltip,
  Badge,
  Flex,
  Divider,
  type GetProp,
  type GetRef
} from 'antd';
import { 
  ClearOutlined,
  HistoryOutlined,
  LinkOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import { Bubble, Sender, Attachments, type AttachmentsProps } from '@ant-design/x';
import { aiModelSelected, createAIModelSender, type AIModelConfig, type AIModelSender as IAIModelSender } from 'ai-model-application-suite';
import { getSelectedAIModelConfig } from './utils/AIModel.ts';
import { SmartRenderer } from './utils/SmartRenderer.tsx';
import { AIAssistantIntegration } from './utils/AIAssistantIntegration';
import { StorageService } from '@/stores/storage';
import type { ADBEntity } from '@/types/storage';


import './AIChatInterface.css';

const { Text } = Typography;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  status?: 'loading' | 'success' | 'error';
  badges?: Array<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
    color: string;
    icon?: string;
  }>;
  operationData?: any;
  requiresConfirmation?: boolean;
}

interface SendOptions {
  stream?: boolean;
  model?: string;
  jsonParams?: string;
}

interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created: number;
}

interface AIChatInterfaceProps {
  visible?: boolean;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
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

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  visible = true,
  className,
  style
}) => {
  const [selectedModel, setSelectedModel] = useState<AIModelConfig | null>(null);
  const [aiIntegration] = useState(() => new AIAssistantIntegration());
  
  // 聊天相关状态
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: '你好！我是AI ORM设计专家，可以帮助你设计和创建数据库实体。请告诉我你的业务需求，我会为你设计合适的实体结构。' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 确认相关状态
  const [pendingOperation, setPendingOperation] = useState<{
    operationData: unknown;
    badges: Array<{
      type: 'success' | 'warning' | 'error' | 'info';
      text: string;
      color: string;
      icon?: string;
    }>;
  } | null>(null);
  
  // 发送模式
  const [streamMode] = useState(true); // 默认启用流式响应
  
  // 响应相关
  const [, setLastResponse] = useState<ChatResponse | null>(null);
  const [, setError] = useState<string | null>(null);
  
  // 附件配置
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GetProp<AttachmentsProps, 'items'>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const senderRef = useRef<GetRef<typeof Sender>>(null);

  const iconStyle = {
    color: '#666',
    fontSize: '1.2rem'
  };

  // 监听AI模型选择变化
  useEffect(() => {
    const unsubscribe = aiModelSelected.onChange((config: AIModelConfig) => {
      if (config) {
        setSelectedModel(config);
        console.log('AIChatInterface aiModelSelected 选择变化:', config);
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

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 应用 AI 操作
  const applyAIOperation = async (operationData: unknown) => {
    try {
      const activeProject = StorageService.getActiveProject();
      if (!activeProject) {
        console.log('没有找到当前项目，跳过自动应用操作');
        return;
      }

      console.log('✅ 找到当前项目:', activeProject.name);

      const opData = operationData as { 
        operationType: string; 
        entityData: unknown;
      };
      
      console.log('🔍 操作数据:', opData);
      
      switch (opData.operationType) {
        case 'create_entity':
          await createEntityFromAI(opData.entityData, activeProject);
          break;
        case 'update_entity':
          await updateEntityFromAI(opData.entityData, activeProject);
          break;
        case 'delete_entity':
          await deleteEntityFromAI(opData.entityData, activeProject);
          break;
        default:
          console.log('暂不支持的操作类型:', opData.operationType);
      }
    } catch (error) {
      console.error('应用 AI 操作失败:', error);
    }
  };

  // 从 AI 数据创建实体
  const createEntityFromAI = async (entityData: unknown, project: unknown) => {
    try {
      console.log('🔍 开始创建实体，原始数据:', entityData);
      console.log('🔍 项目数据:', project);
      
      const { v4: uuidv4 } = await import('uuid');
      const now = new Date().toISOString();
      
      // 直接使用 entityData，不进行类型断言
      console.log('🔍 原始 entityData:', entityData);
      
      // 检查 entityData 是否存在
      if (!entityData || typeof entityData !== 'object') {
        throw new Error('entityData 不是有效的对象');
      }
      
      const data = entityData as any; // 临时使用 any 类型
      
      const projectData = project as {
        id: string;
        schema: {
          entities: Record<string, any>;
        };
      };
      
      // 生成实体 ID
      const entityId = uuidv4();
      
      console.log('🔍 实体数据解析:', data);
      console.log('🔍 实体ID:', entityId);
      
      // 检查必要字段
      if (!data.code) {
        throw new Error('缺少实体代码 (code)');
      }
      if (!data.label) {
        throw new Error('缺少实体标签 (label)');
      }
      
      // 构建 ADB 实体
      const newEntity: ADBEntity = {
        entityInfo: {
          id: entityId,
          code: data.code,
          label: data.label,
          tableName: data.tableName || data.code.replace(/:/g, '_'),
          description: data.description || '',
          status: 'enabled',
          isLocked: false,
          tags: [],
          comment: data.comment || data.description || ''
        },
        fields: {},
        createdAt: now,
        updatedAt: now
      };

      // 处理字段
      if (data.fields && Array.isArray(data.fields)) {
        console.log('🔍 处理字段数据:', data.fields);
        for (let index = 0; index < data.fields.length; index++) {
          const fieldData = data.fields[index];
          console.log(`🔍 处理字段 ${index}:`, fieldData);
          
          try {
            // 检查字段数据结构
            if (!fieldData || typeof fieldData !== 'object') {
              console.error('❌ 字段数据不是对象:', fieldData);
              continue;
            }
            
            if (!fieldData.code || !fieldData.label || !fieldData.type) {
              console.error('❌ 字段缺少必要信息:', fieldData);
              continue;
            }
            
            const fieldId = uuidv4();
            console.log(`🔍 生成字段ID: ${fieldId} for field: ${fieldData.code}`);
            
            newEntity.fields[fieldId] = {
              columnInfo: {
                id: fieldId,
                label: fieldData.label || '',
                code: fieldData.code || '',
                extendType: fieldData.type && fieldData.type.startsWith('adb-') ? fieldData.type : undefined,
                comment: fieldData.comment || '',
                status: 'enabled',
                orderIndex: index
              },
              typeormConfig: {
                type: fieldData.type || 'varchar',
                length: fieldData.length,
                nullable: fieldData.nullable || false,
                unique: false,
                default: fieldData.default,
                primary: fieldData.isPrimary || false,
                generated: fieldData.type && (fieldData.type.includes('snowflake') || fieldData.type.includes('guid') || fieldData.type.includes('auto-increment')),
                comment: fieldData.comment || ''
              },
              createdAt: now,
              updatedAt: now
            };
            
            console.log(`✅ 字段创建成功: ${fieldData.code}`);
          } catch (fieldError) {
            console.error(`❌ 字段 ${index} 创建失败:`, fieldError);
            continue;
          }
        }
      }

      // 更新项目
      const updatedProject = {
        ...projectData,
        schema: {
          ...projectData.schema,
          entities: {
            ...projectData.schema.entities,
            [entityId]: newEntity
          }
        },
        updatedAt: now
      };

      // 保存到存储
      StorageService.saveProject(updatedProject as Project);
      
      console.log('✅ 成功创建实体:', newEntity.entityInfo.label);
      
      // 显示成功消息
      const successMessage: ChatMessage = {
        role: 'assistant',
        content: `✅ 已成功创建实体 "${newEntity.entityInfo.label}" (${newEntity.entityInfo.code})`,
        badges: [{
          type: 'success',
          text: '实体已创建',
          color: '#52c41a',
          icon: 'plus-circle'
        }]
      };
      
      setMessages(prev => [...prev, successMessage]);
      
    } catch (error) {
      console.error('创建实体失败:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ 创建实体失败: ${error instanceof Error ? error.message : '未知错误'}`,
        badges: [{
          type: 'error',
          text: '创建失败',
          color: '#ff4d4f',
          icon: 'exclamation-circle'
        }]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // 更新实体（暂时不实现）
  const updateEntityFromAI = async (_entityData: any, _project: any) => {
    console.log('更新实体功能暂未实现');
  };

  // 删除实体（暂时不实现）
  const deleteEntityFromAI = async (_entityData: any, _project: any) => {
    console.log('删除实体功能暂未实现');
  };

  // 确认操作
  const confirmOperation = async () => {
    if (!pendingOperation) return;
    
    try {
      await applyAIOperation(pendingOperation.operationData);
      setPendingOperation(null);
    } catch (error) {
      console.error('确认操作失败:', error);
    }
  };

  // 拒绝操作
  const rejectOperation = () => {
    setPendingOperation(null);
  };

  // 发送聊天消息
  const sendChatMessage = async () => {
    if (!inputMessage.trim() || !selectedModel) return;
    
    console.log('当前选中的模型配置:', selectedModel);

    const userMessage: ChatMessage = { role: 'user', content: inputMessage };
    
    // 构建显示消息列表（不包含系统提示词）
    const displayMessages = [...messages, userMessage];
    setMessages(displayMessages);
    
    // 生成包含上下文的 AI 提示词
    const contextPrompt = aiIntegration.generateAIPrompt(inputMessage);
    
    // 构建发送给AI的消息列表（包含系统提示词和上下文）
    const aiMessages = [
      { role: 'system' as const, content: contextPrompt },
      ...messages.filter(msg => msg.role !== 'system'),
      userMessage
    ];
    
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    console.log('🚀 发送AI聊天请求:', {
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
      if (streamMode) {
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
              console.log('🏁 流式响应完成2', fullContent);
              
              // 处理 AI 响应，检查是否包含操作数据
              try {
                const processResult = await aiIntegration.processAIResponse(fullContent);
                console.log('🔍 processResult:', processResult);
                
                if (processResult.type === 'operation' && processResult.operationData) {
                  console.log('✅ 检测到操作数据，开始处理');
                  // 更新最后一条消息，添加 Badge 和操作数据
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.badges = processResult.badges;
                      lastMessage.operationData = processResult.operationData;
                      lastMessage.requiresConfirmation = processResult.requiresConfirmation;
                    }
                    return newMessages;
                  });
                  
                  // 处理操作应用
                  if (processResult.operationData) {
                    if (processResult.requiresConfirmation) {
                      console.log('🔔 需要用户确认操作');
                      // 需要确认，设置待确认操作
                      setPendingOperation({
                        operationData: processResult.operationData,
                        badges: processResult.badges
                      });
                    } else {
                      console.log('🚀 自动应用操作');
                      // 自动应用操作
                      await applyAIOperation(processResult.operationData);
                    }
                  }
                } else {
                  console.log('❌ 没有检测到操作数据:', {
                    type: processResult.type,
                    hasOperationData: !!processResult.operationData,
                    operationData: processResult.operationData
                  });
                }
              } catch (processError) {
                console.error('AI 响应处理失败:', processError);
              }
              
              break;
            }
          }
          
          console.log('✅ AI聊天完成');
          
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
      } else {
        // 普通聊天
        console.log('📤 发送普通聊天请求...');
        
        const sender = createRealAISender(selectedModel);
        const options: SendOptions = {
          model: selectedModel.config?.model,
          jsonParams: selectedModel.config?.jsonParams
        };
        
        const response = await sender.sendChatMessage(aiMessages, options);
        setLastResponse(response);
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.choices[0]?.message?.content || '抱歉，没有收到有效回复'
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        console.log('✅ 普通聊天完成');
      }
    } catch (err: unknown) {
      const errorMessage = `发送失败: ${err instanceof Error ? err.message : '未知错误'}`;
      setError(errorMessage);
      
      console.error('❌ AI聊天请求失败:', {
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
      console.log('🏁 AI聊天请求处理完成');
    }
  };

  // 清空聊天记录
  const clearChat = () => {
    setMessages([{ role: 'system', content: '你好！我是AI ORM设计专家，可以帮助你设计和创建数据库实体。请告诉我你的业务需求，我会为你设计合适的实体结构。' }]);
    setLastResponse(null);
    setError(null);
  };


  // Sender.Header 组件
  const senderHeader = (
    <Sender.Header
      title="Attachments"
      open={open}
      onOpenChange={setOpen}
      styles={{
        content: {
          padding: 0,
        },
      }}
    >
      <Attachments
        // Mock not real upload file
        beforeUpload={() => false}
        items={items}
        onChange={({ fileList }) => setItems(fileList)}
        placeholder={(type) =>
          type === 'drop'
            ? {
                title: 'Drop file here',
              }
            : {
                icon: <CloudUploadOutlined />,
                title: 'Upload files',
                description: 'Click or drag files to this area to upload',
              }
        }
        getDropContainer={() => senderRef.current?.nativeElement}
      />
    </Sender.Header>
  );

  if (!visible) return null;

  return (
    <div 
      className={className}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1f1f1f',
        borderLeft: '1px solid #303030',
        ...style
      }}
    >
      {/* 头部 */}
      <div className="chat-header" style={{
        padding: '4px 10px',
        borderBottom: '1px solid #303030',
        backgroundColor: '#262626'
      }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="center">
            <Text style={{ color: '#fff' }}>AI助手</Text>
          </Space>
          <Space>
            <Tooltip title="对话历史">
              <Button 
                type="text" 
                icon={<HistoryOutlined />} 
                size="small"
                style={{ color: '#fff' }}
              />
            </Tooltip>
            <Tooltip title="清空对话">
              <Button 
                type="text" 
                icon={<ClearOutlined />} 
                size="small"
                style={{ color: '#fff' }}
                onClick={clearChat}
              />
            </Tooltip>
          </Space>
        </Space>
      </div>

      {/* 使用 Ant Design X 的 Bubble.List 组件 */}
      <div className="chat-messages" style={{ flex: 1, overflow: 'hidden' }}>
              <Bubble.List
                items={messages?.map((message: ChatMessage, index) => {
                  // 如果有 Badge，在内容前添加 Markdown 格式的 Badge 显示
                  let displayContent = message.content;
                  if (message.badges && message.badges.length > 0) {
                    const badgesMarkdown = message.badges.map((badge) => 
                      `**${badge.text}**`
                    ).join(' • ');
                    displayContent = `> ${badgesMarkdown}\n\n${message.content}`;
                  }
                  
                  return {
                    key: index.toString(),
                    role: message.role === 'user' ? 'user' : 'assistant',
                    content: displayContent,
                    header: message.role === 'user' ? '我' : 
                           message.role === 'assistant' ? 'AI助手' : '系统',
                    placement: message.role === 'user' ? 'end' : 'start',
                    variant: message.role === 'user' ? 'filled' : 'outlined',
                    classNames: {
                      content: message.status === 'loading' ? 'loading-message' : '',
                    },
                    typing: message.status === 'loading' ? { step: 5, interval: 20, suffix: <>💗</> } : false
                    // 注意：不包含 badges、operationData、requiresConfirmation 等自定义属性
                  };
                })}
                roles={{
                  user: {
                    placement: 'end',
                    variant: 'filled',
                    header: '用户'
                  },
                  assistant: {
                    placement: 'start',
                    variant: 'outlined',
                    header: 'AI助手',
                    messageRender: SmartRenderer
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


      {/* 确认操作区域 */}
      {pendingOperation && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#262626',
          borderTop: '1px solid #303030',
          borderBottom: '1px solid #303030'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {pendingOperation.badges.map((badge, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    backgroundColor: badge.color,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Text style={{ color: '#fff', fontWeight: 500 }}>AI 建议操作：</Text>
            <Button
              type="primary"
              size="small"
              onClick={confirmOperation}
              style={{
                backgroundColor: '#52c41a',
                borderColor: '#52c41a'
              }}
            >
              接受
            </Button>
            <Button
              size="small"
              onClick={rejectOperation}
              style={{
                color: '#fff',
                borderColor: '#666'
              }}
            >
              拒绝
            </Button>
          </div>
        </div>
      )}

      {/* 使用 Ant Design X 的 Sender 组件 */}
      <div className="chat-input-container">
        <Sender
          ref={senderRef}
          header={senderHeader}
          value={inputMessage}
          onChange={(nextVal) => {
            setInputMessage(nextVal);
          }}
          onSubmit={() => {
            sendChatMessage();
          }}
          placeholder="Type your message... Press Shift+Enter for a new line, Enter to send."
          disabled={isLoading}
          autoSize={{ minRows: 2, maxRows: 6 }}
          footer={({ components }) => {
            const { SendButton, LoadingButton, SpeechButton } = components;
            return (
              <Flex justify="space-between" align="center">
                <Flex gap="small" align="center">
                  <Badge dot={items.length > 0 && !open}>
                    <Button color="default" variant="text" onClick={() => setOpen(!open)} icon={<LinkOutlined />} />
                  </Badge>
                  {/* <Divider type="vertical" />
                  <label>
                    流式聊天
                    <Switch size="small" checked={streamMode} onChange={(checked) => setStreamMode(checked)} />
                  </label> */}
                </Flex>
                <Flex align="center">
                  {/* <Button type="text" style={iconStyle} icon={<ApiOutlined />} />
                  <Divider type="vertical" /> */}
                  <SpeechButton style={iconStyle} />
                  <Divider type="vertical" />
                  {isLoading ? (
                    <LoadingButton type="default" />
                  ) : (
                    <SendButton type="primary" disabled={!inputMessage.trim() || !selectedModel} />
                  )}
                </Flex>
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
  );
};

export default AIChatInterface;
