import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Button, 
  Space, 
  Typography,
//   Avatar, 
  Tooltip,
  Badge,
  Flex,
  Divider,
  Tag,
  type GetProp,
  type GetRef
} from 'antd';
import { 
  ClearOutlined,
  HistoryOutlined,
  LinkOutlined,
  CloudUploadOutlined,
  MacCommandOutlined
} from '@ant-design/icons';
import { Bubble, Sender, Attachments, type AttachmentsProps } from '@ant-design/x';
import { aiModelSelected, createAIModelSender, type AIModelConfig, type AIModelSender as IAIModelSender } from 'ai-model-application-suite';
import { getSelectedAIModelConfig } from './utils/AIModel.ts';
import { SmartRenderer } from './utils/SmartRenderer.tsx';
import { AIAssistantIntegration } from './utils/AIAssistantIntegration';
import { StorageService } from '@/stores/storage';
import { projectStore, type AIChatContext } from '@/stores/projectStore';
import type { ADBEntity, Project } from '@/types/storage';


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
    color?: string;
    icon?: string;
  }>;
  operationData?: unknown;
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
  onProjectUpdate?: (project: Project) => void;
  externalMessage?: string; // 外部传入的消息
  onExternalMessageSent?: () => void; // 外部消息发送完成回调
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
  style,
  onProjectUpdate,
  externalMessage,
  onExternalMessageSent
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
      color?: string;
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
  
  // AI聊天上下文状态
  const [aiChatContexts, setAiChatContexts] = useState<AIChatContext[]>([]);
  
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


  // 监听AI聊天上下文变化
  useEffect(() => {
    const unsubscribe = projectStore.subscribe(() => {
      setAiChatContexts(projectStore.getAIChatContexts());
    });

    // 初始化时获取当前上下文
    setAiChatContexts(projectStore.getAIChatContexts());

    return unsubscribe;
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 标准化AI数据，将所有 xxxData 字段重写为 data
  const normalizeAIData = (aiData: any): any => {
    const normalizedData = { ...aiData };
    
    // 查找所有可能的 xxxData 字段
    const dataFields = ['entityData', 'fieldData', 'enumData', 'relationData', 'indexData'];
    const underscoreDataFields = ['entity_data', 'field_data', 'enum_data', 'relation_data', 'index_data'];
    
    // 检查是否有任何 xxxData 字段
    let foundDataField = null;
    let foundDataValue = null;
    
    // 优先检查 data 字段
    if (normalizedData.data) {
      foundDataField = 'data';
      foundDataValue = normalizedData.data;
    } else {
      // 检查其他 xxxData 字段
      for (const field of dataFields) {
        if (normalizedData[field]) {
          foundDataField = field;
          foundDataValue = normalizedData[field];
          break;
        }
      }
      
      // 检查下划线格式的字段
      if (!foundDataField) {
        for (const field of underscoreDataFields) {
          if (normalizedData[field]) {
            foundDataField = field;
            foundDataValue = normalizedData[field];
            break;
          }
        }
      }
    }
    
    // 如果找到了数据字段，将其标准化为 data
    if (foundDataField && foundDataValue) {
      normalizedData.data = foundDataValue;
      
      // 清理其他数据字段
      for (const field of dataFields) {
        delete normalizedData[field];
      }
      for (const field of underscoreDataFields) {
        delete normalizedData[field];
      }
      
      console.log(`🔍 数据标准化: 将 ${foundDataField} 重写为 data`);
    } else {
      console.log('🔍 数据标准化: 未找到任何数据字段');
    }
    
    return normalizedData;
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

      // 数据标准化处理：将所有 xxxData 字段重写为 data
      const normalizedData = normalizeAIData(operationData as any);
      
      const opData = normalizedData as { 
        operationType: string; 
        data: unknown;
      };
      
      console.log('🔍 操作数据:', opData);
      
      switch (opData.operationType) {
        case 'create_entity':
          await createEntityFromAI(opData.data, activeProject);
          break;
        case 'create_field':
          await createFieldFromAI(opData.data, activeProject);
          break;
        case 'update_field':
          await updateFieldFromAI(opData.data, activeProject);
          break;
        case 'delete_field':
          await deleteFieldFromAI(opData.data, activeProject);
          break;
        case 'update_entity':
          await updateEntityFromAI(opData.data, activeProject);
          break;
        case 'delete_entity':
          await deleteEntityFromAI();
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
      
      const data = entityData as Record<string, unknown>; // 使用 Record 类型
      
      const projectData = project as {
        id: string;
        schema: {
          entities: Record<string, unknown>;
        };
      };
      
      // 生成实体 ID
      const entityId = uuidv4();
      
      console.log('🔍 实体数据解析:', data);
      console.log('🔍 实体ID:', entityId);
      
      // 检查必要字段
      if (!data.code || typeof data.code !== 'string') {
        throw new Error('缺少实体代码 (code)');
      }
      if (!data.label || typeof data.label !== 'string') {
        throw new Error('缺少实体标签 (label)');
      }
      
      // 构建 ADB 实体
      const newEntity: ADBEntity = {
        entityInfo: {
          id: entityId,
          code: data.code as string,
          label: data.label as string,
          tableName: (data.tableName as string) || (data.code as string).replace(/:/g, '_'),
          description: (data.description as string) || '',
          status: 'enabled',
          isLocked: false,
          tags: [],
          comment: (data.comment as string) || (data.description as string) || ''
        },
        fields: {},
        createdAt: now,
        updatedAt: now
      };

      // 处理字段
      if (data.fields && Array.isArray(data.fields)) {
        console.log('🔍 处理字段数据:', data.fields);
        for (let index = 0; index < data.fields.length; index++) {
          const fieldData = data.fields[index] as Record<string, unknown>;
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
                label: (fieldData.label as string) || '',
                code: (fieldData.code as string) || '',
                extendType: fieldData.type && (fieldData.type as string).startsWith('adb-') ? (fieldData.type as string) : undefined,
                comment: (fieldData.comment as string) || '',
                status: 'enabled',
                orderIndex: index
              },
              typeormConfig: {
                type: (fieldData.type as string) || 'varchar',
                length: fieldData.length as number,
                nullable: (fieldData.nullable as boolean) || false,
                unique: false,
                default: fieldData.default as string,
                primary: (fieldData.isPrimary as boolean) || false,
                generated: fieldData.type && ((fieldData.type as string).includes('snowflake') || (fieldData.type as string).includes('guid') || (fieldData.type as string).includes('auto-increment')),
                comment: (fieldData.comment as string) || ''
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
      
      // 通知父组件项目已更新
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject as Project);
      }
      
      // 通知全局项目存储项目已更新
      projectStore.notifyUpdate();
      
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

  // 从 AI 数据创建字段
  const createFieldFromAI = async (fieldData: unknown, project: unknown) => {
    try {
      console.log('🔍 开始创建字段，原始数据:', fieldData);
      console.log('🔍 项目数据:', project);

      const { v4: uuidv4 } = await import('uuid');
      const now = new Date().toISOString();

      // 检查 fieldData 是否存在
      if (!fieldData || typeof fieldData !== 'object') {
        throw new Error('fieldData 不是有效的对象');
      }

      const actualData = fieldData as Record<string, unknown>;
      console.log('🔍 字段数据:', actualData);
      
      const projectData = project as {
        id: string;
        schema: {
          entities: Record<string, unknown>;
        };
      };
      
      console.log('🔍 字段数据解析:', actualData);

      // 检查必要字段 - 支持 entityCode 和 code 两种格式
      const entityCode = actualData.entityCode || actualData.code;
      if (!entityCode || typeof entityCode !== 'string') {
        throw new Error('缺少实体代码 (entityCode 或 code)');
      }

      // 查找目标实体
      const targetEntity = Object.values(projectData.schema.entities).find((entity: unknown) => {
        const entityInfo = (entity as { entityInfo: { code: string } }).entityInfo;
        return entityInfo.code === entityCode;
      }) as { entityInfo: { id: string; label: string; code: string }; fields: Record<string, unknown> };

      if (!targetEntity) {
        throw new Error(`找不到实体: ${entityCode}`);
      }

      console.log('🔍 找到目标实体:', targetEntity.entityInfo.label);

      // 处理字段 - 支持 field, fieldData 和 fields 三种格式
      let fieldsToProcess: Record<string, unknown>[] = [];
      
      if (actualData.field && typeof actualData.field === 'object') {
        // 单个字段格式: { entityCode: "...", field: {...} }
        fieldsToProcess = [actualData.field as Record<string, unknown>];
        console.log('🔍 处理单个字段数据:', actualData.field);
      } else if (actualData.fieldData && typeof actualData.fieldData === 'object') {
        // 单个字段格式: { entityCode: "...", fieldData: {...} }
        fieldsToProcess = [actualData.fieldData as Record<string, unknown>];
        console.log('🔍 处理单个字段数据 (fieldData):', actualData.fieldData);
      } else if (actualData.fields && Array.isArray(actualData.fields)) {
        // 多个字段格式: { code: "...", fields: [...] }
        fieldsToProcess = actualData.fields as Record<string, unknown>[];
        console.log('🔍 处理多个字段数据:', actualData.fields);
      }
      
      if (fieldsToProcess.length > 0) {
        const updatedFields = { ...targetEntity.fields };
        
        for (let index = 0; index < fieldsToProcess.length; index++) {
          const fieldData = fieldsToProcess[index] as Record<string, unknown>;
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
            
            updatedFields[fieldId] = {
              columnInfo: {
                id: fieldId,
                label: (fieldData.label as string) || '',
                code: (fieldData.code as string) || '',
                comment: (fieldData.comment as string) || '',
                status: 'enabled',
                orderIndex: Object.keys(updatedFields).length
              },
              typeormConfig: {
                type: (fieldData.type as string) || 'varchar',
                length: fieldData.length as number,
                nullable: (fieldData.nullable as boolean) || false,
                unique: false,
                default: fieldData.default as string,
                primary: (fieldData.isPrimary as boolean) || false,
                comment: (fieldData.comment as string) || ''
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
        
        // 更新实体
        const updatedEntity = {
          ...targetEntity,
          fields: updatedFields,
          updatedAt: now
        };
        
        // 更新项目
        const updatedProject = {
          ...projectData,
          schema: {
            ...projectData.schema,
            entities: {
              ...projectData.schema.entities,
              [targetEntity.entityInfo.id]: updatedEntity
            }
          },
          updatedAt: now
        };
        
        // 保存到存储
        StorageService.saveProject(updatedProject as Project);
        
        console.log('✅ 成功更新实体字段:', targetEntity.entityInfo.label);
        
        // 通知父组件项目已更新
        if (onProjectUpdate) {
          onProjectUpdate(updatedProject as Project);
        }
        
        // 通知全局项目存储项目已更新
        projectStore.notifyUpdate();
        
        // 显示成功消息
        const successMessage: ChatMessage = {
          role: 'assistant',
          content: `✅ 已成功在实体 "${targetEntity.entityInfo.label}" 中添加字段`,
          badges: [{
            type: 'success',
            text: '字段已添加',
            color: '#52c41a',
            icon: 'plus-circle'
          }]
        };
        
        setMessages(prev => [...prev, successMessage]);
      }
      
    } catch (error) {
      console.error('创建字段失败:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ 创建字段失败: ${error instanceof Error ? error.message : '未知错误'}`,
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

  // 从 AI 数据更新字段
  const updateFieldFromAI = async (fieldData: unknown, project: unknown) => {
    try {
      console.log('🔍 开始更新字段，原始数据:', fieldData);
      const now = new Date().toISOString();
      
      if (!fieldData || typeof fieldData !== 'object') {
        throw new Error('fieldData 不是有效的对象');
      }
      
      const actualData = fieldData as Record<string, unknown>;
      console.log('🔍 字段数据:', actualData);
      const projectData = project as {
        id: string;
        schema: {
          entities: Record<string, unknown>;
        };
      };
      
      if (!actualData.code || typeof actualData.code !== 'string') {
        throw new Error('缺少实体代码 (code)');
      }
      
      // 查找目标实体
      const targetEntity = Object.values(projectData.schema.entities).find((entity: unknown) => {
        const entityInfo = (entity as { entityInfo: { code: string } }).entityInfo;
        return entityInfo.code === actualData.code;
      }) as { entityInfo: { id: string; label: string; code: string }; fields: Record<string, unknown> };
      
      if (!targetEntity) {
        throw new Error(`找不到实体: ${actualData.code}`);
      }
      
      console.log('🔍 找到目标实体:', targetEntity.entityInfo.label);
      
      // 处理字段更新
      if (actualData.fields && Array.isArray(actualData.fields)) {
        const updatedFields = { ...targetEntity.fields };
        
        for (const fieldData of actualData.fields as Record<string, unknown>[]) {
          if (!fieldData || typeof fieldData !== 'object') continue;
          
          const fieldCode = fieldData.code as string;
          if (!fieldCode) continue;
          
          // 查找现有字段
          const existingField = Object.values(updatedFields).find((field: unknown) => {
            const fieldInfo = (field as { columnInfo: { code: string } }).columnInfo;
            return fieldInfo.code === fieldCode;
          }) as { columnInfo: { id: string } };
          
          if (existingField) {
            // 更新现有字段
            const currentField = updatedFields[existingField.columnInfo.id] as {
              columnInfo: { label: string; comment: string };
              typeormConfig: { type: string; length: number; nullable: boolean; comment: string };
            };
            
            updatedFields[existingField.columnInfo.id] = {
              ...currentField,
              columnInfo: {
                ...currentField.columnInfo,
                label: (fieldData.label as string) || currentField.columnInfo.label,
                comment: (fieldData.comment as string) || currentField.columnInfo.comment,
              },
              typeormConfig: {
                ...currentField.typeormConfig,
                type: (fieldData.type as string) || currentField.typeormConfig.type,
                length: fieldData.length as number || currentField.typeormConfig.length,
                nullable: (fieldData.nullable as boolean) ?? currentField.typeormConfig.nullable,
                comment: (fieldData.comment as string) || currentField.typeormConfig.comment,
              },
              updatedAt: now
            };
            
            console.log(`✅ 字段更新成功: ${fieldCode}`);
          }
        }
        
        // 更新实体和项目
        const updatedEntity = {
          ...targetEntity,
          fields: updatedFields,
          updatedAt: now
        };
        
        const updatedProject = {
          ...projectData,
          schema: {
            ...projectData.schema,
            entities: {
              ...projectData.schema.entities,
              [targetEntity.entityInfo.id]: updatedEntity
            }
          },
          updatedAt: now
        };
        
        StorageService.saveProject(updatedProject as Project);
        
        if (onProjectUpdate) {
          onProjectUpdate(updatedProject as Project);
        }
        
        projectStore.notifyUpdate();
        
        const successMessage: ChatMessage = {
          role: 'assistant',
          content: `✅ 已成功更新实体 "${targetEntity.entityInfo.label}" 中的字段`,
          badges: [{
            type: 'success',
            text: '字段已更新',
            color: '#52c41a',
            icon: 'edit'
          }]
        };
        
        setMessages(prev => [...prev, successMessage]);
      }
      
    } catch (error) {
      console.error('更新字段失败:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ 更新字段失败: ${error instanceof Error ? error.message : '未知错误'}`,
        badges: [{
          type: 'error',
          text: '更新失败',
          color: '#ff4d4f',
          icon: 'exclamation-circle'
        }]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // 从 AI 数据删除字段
  const deleteFieldFromAI = async (fieldData: unknown, project: unknown) => {
    try {
      console.log('🔍 开始删除字段，原始数据:', fieldData);
      
      const now = new Date().toISOString();
      
      if (!fieldData || typeof fieldData !== 'object') {
        throw new Error('字段 Data 不是有效的对象');
      }
      
      const actualData = fieldData as Record<string, unknown>;
      console.log('🔍 字段数据:', actualData);
      const projectData = project as {
        id: string;
        schema: {
          entities: Record<string, unknown>;
        };
      };
      
      if (!actualData.code || typeof actualData.code !== 'string') {
        throw new Error('缺少实体代码 (code)');
      }
      
      // 查找目标实体
      const targetEntity = Object.values(projectData.schema.entities).find((entity: unknown) => {
        const entityInfo = (entity as { entityInfo: { code: string } }).entityInfo;
        return entityInfo.code === actualData.code;
      }) as { entityInfo: { id: string; label: string; code: string }; fields: Record<string, unknown> };
      
      if (!targetEntity) {
        throw new Error(`找不到实体: ${actualData.code}`);
      }
      
      console.log('🔍 找到目标实体:', targetEntity.entityInfo.label);
      
      // 处理字段删除
      if (actualData.fields && Array.isArray(actualData.fields)) {
        const updatedFields = { ...targetEntity.fields };
        let deletedCount = 0;
        
        for (const fieldData of actualData.fields as Record<string, unknown>[]) {
          if (!fieldData || typeof fieldData !== 'object') continue;
          
          const fieldCode = fieldData.code as string;
          if (!fieldCode) continue;
          
          // 查找并删除字段
          const fieldToDelete = Object.entries(updatedFields).find(([, field]) => {
            const fieldInfo = (field as { columnInfo: { code: string } }).columnInfo;
            return fieldInfo.code === fieldCode;
          });
          
          if (fieldToDelete) {
            delete updatedFields[fieldToDelete[0]];
            deletedCount++;
            console.log(`✅ 字段删除成功: ${fieldCode}`);
          }
        }
        
        if (deletedCount > 0) {
          // 更新实体和项目
          const updatedEntity = {
            ...targetEntity,
            fields: updatedFields,
            updatedAt: now
          };
          
          const updatedProject = {
            ...projectData,
            schema: {
              ...projectData.schema,
              entities: {
                ...projectData.schema.entities,
                [targetEntity.entityInfo.id]: updatedEntity
              }
            },
            updatedAt: now
          };
          
          StorageService.saveProject(updatedProject as Project);
          
          if (onProjectUpdate) {
            onProjectUpdate(updatedProject as Project);
          }
          
          projectStore.notifyUpdate();
          
          const successMessage: ChatMessage = {
            role: 'assistant',
            content: `✅ 已成功从实体 "${targetEntity.entityInfo.label}" 中删除 ${deletedCount} 个字段`,
            badges: [{
              type: 'success',
              text: '字段已删除',
              color: '#52c41a',
              icon: 'delete'
            }]
          };
          
          setMessages(prev => [...prev, successMessage]);
        } else {
          throw new Error('没有找到要删除的字段');
        }
      }
      
    } catch (error) {
      console.error('删除字段失败:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ 删除字段失败: ${error instanceof Error ? error.message : '未知错误'}`,
        badges: [{
          type: 'error',
          text: '删除失败',
          color: '#ff4d4f',
          icon: 'exclamation-circle'
        }]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // 更新实体（暂时不实现）
  const updateEntityFromAI = async (entityData: unknown, project: unknown) => {
    try {
      console.log('🔍 开始更新实体，原始数据:', entityData);
      console.log('🔍 项目数据:', project);
      
      const now = new Date().toISOString();
      
      // 检查 entityData 是否存在
      if (!entityData || typeof entityData !== 'object') {
        throw new Error('entityData 不是有效的对象');
      }
      
      const data = entityData as Record<string, unknown>;
      
      const projectData = project as Project;
      
      console.log('🔍 实体数据解析:', data);
      
      // 检查必要字段
      if (!data.code || typeof data.code !== 'string') {
        throw new Error('缺少实体代码 (code)');
      }
      
      // 查找要更新的实体
      const targetEntity = Object.values(projectData.schema.entities).find((entity: unknown) => {
        const entityInfo = (entity as { entityInfo: { code: string } }).entityInfo;
        return entityInfo.code === data.code;
      }) as { 
        entityInfo: { 
          id: string; 
          label: string; 
          code: string; 
          tableName?: string; 
          description?: string; 
          comment?: string; 
        }; 
        fields: Record<string, unknown>;
        indexes?: Record<string, unknown>;
        relations?: Record<string, unknown>;
      };
      
      if (!targetEntity) {
        throw new Error(`找不到实体: ${data.code}`);
      }
      
      console.log('🔍 找到目标实体:', targetEntity.entityInfo.label);
      
      // 更新实体信息
      if (data.label && typeof data.label === 'string') {
        targetEntity.entityInfo.label = data.label;
      }
      if (data.tableName && typeof data.tableName === 'string') {
        targetEntity.entityInfo.tableName = data.tableName;
      }
      if (data.description && typeof data.description === 'string') {
        targetEntity.entityInfo.description = data.description;
      }
      if (data.comment && typeof data.comment === 'string') {
        targetEntity.entityInfo.comment = data.comment;
      }
      
      // 处理字段更新
      if (data.fields && Array.isArray(data.fields)) {
        console.log('🔍 处理字段更新:', data.fields);
        
        const updatedFields = { ...targetEntity.fields };
        
        for (const fieldData of data.fields as Record<string, unknown>[]) {
          if (!fieldData || typeof fieldData !== 'object') continue;
          
          const fieldCode = fieldData.code as string;
          if (!fieldCode) continue;
          
          // 查找现有字段
          const existingField = Object.values(updatedFields).find((field: unknown) => {
            const columnInfo = (field as { columnInfo: { code: string } }).columnInfo;
            return columnInfo.code === fieldCode;
          });
          
          if (existingField) {
            // 更新现有字段
            const field = existingField as { columnInfo: Record<string, unknown>; typeormConfig: Record<string, unknown> };
            
            if (fieldData.label && typeof fieldData.label === 'string') {
              field.columnInfo.label = fieldData.label;
            }
            if (fieldData.type && typeof fieldData.type === 'string') {
              field.typeormConfig.type = fieldData.type;
            }
            if (fieldData.length && typeof fieldData.length === 'number') {
              field.typeormConfig.length = fieldData.length;
            }
            if (typeof fieldData.nullable === 'boolean') {
              field.typeormConfig.nullable = fieldData.nullable;
            }
            if (typeof fieldData.isPrimary === 'boolean') {
              field.typeormConfig.primary = fieldData.isPrimary;
            }
            if (fieldData.default !== undefined) {
              field.typeormConfig.default = fieldData.default;
            }
            if (fieldData.comment && typeof fieldData.comment === 'string') {
              field.columnInfo.comment = fieldData.comment;
              field.typeormConfig.comment = fieldData.comment;
            }
            
            // 处理字段中的索引 (兼容indexes/indexe拼写错误)
            const fieldIndexes = (fieldData.indexes || fieldData.indexe || []);
            const normalizedIndexes = Array.isArray(fieldIndexes) 
              ? fieldIndexes 
              : [fieldIndexes];
            
            if (normalizedIndexes.length > 0) {
              console.log(`🔍 [DEBUG] 处理字段索引: ${fieldCode}`, normalizedIndexes);
              
              // 确保实体有indexes数组
              if (!targetEntity.indexes) {
                targetEntity.indexes = [];
              } else if (!Array.isArray(targetEntity.indexes)) {
                targetEntity.indexes = Object.values(targetEntity.indexes);
              }
              
              // 处理每个索引定义
              for (const indexDef of normalizedIndexes) {
                if (!indexDef || typeof indexDef !== 'object') continue;
                
                // 兼容不同格式的索引定义
                const indexName = indexDef.name || 
                                 (indexDef.type === 'primary' ? `PK_${targetEntity.entityInfo.tableName}_${fieldCode}` : 
                                 `IDX_${targetEntity.entityInfo.tableName}_${fieldCode}`);
                
                const indexFields = indexDef.columns || indexDef.fields || [fieldCode];
                const isUnique = indexDef.type === 'unique' || indexDef.unique;
                
                // 查找是否已存在同名索引
                const existingIndex = targetEntity.indexes.find(
                  idx => idx.name === indexName
                );
                
                if (!existingIndex) {
                  const { v4: uuidv4 } = await import('uuid');
                  targetEntity.indexes.push({
                    id: uuidv4(),
                    name: indexName,
                    fields: indexFields,
                    unique: isUnique,
                    type: indexDef.type || 'btree',
                    comment: indexDef.comment || '',
                    createdAt: now,
                    updatedAt: now
                  });
                  
                  console.log(`🔍 添加字段索引: ${indexName}`, {
                    fields: indexFields,
                    unique: isUnique
                  });
                }
              }
            }
            
            console.log(`🔍 更新字段: ${fieldCode}`);
          } else {
            // 添加新字段
            const { v4: uuidv4 } = await import('uuid');
            const fieldId = uuidv4();
            
            updatedFields[fieldId] = {
              columnInfo: {
                id: fieldId,
                label: (fieldData.label as string) || '',
                code: fieldCode,
                extendType: fieldData.type && (fieldData.type as string).startsWith('adb-') ? (fieldData.type as string) : undefined,
                comment: (fieldData.comment as string) || '',
                status: 'enabled',
                orderIndex: Object.keys(updatedFields).length
              },
              typeormConfig: {
                type: (fieldData.type as string) || 'varchar',
                length: fieldData.length as number,
                nullable: (fieldData.nullable as boolean) || false,
                unique: false,
                default: fieldData.default as string,
                primary: (fieldData.isPrimary as boolean) || false,
                generated: fieldData.type && ((fieldData.type as string).includes('snowflake') || (fieldData.type as string).includes('guid') || (fieldData.type as string).includes('auto-increment')),
                comment: (fieldData.comment as string) || ''
              },
              createdAt: now,
              updatedAt: now
            };
            
            console.log(`🔍 添加新字段: ${fieldCode}`);
          }
        }
        
        targetEntity.fields = updatedFields;
      }
      
      // 处理索引更新
      console.log('🔍 [DEBUG] 原始索引数据:', {
        indices: data.indices,
        compositeIndexes: data.compositeIndexes,
        fields: data.fields?.map(f => ({
          code: f.code,
          index: f.index,
          isUnique: f.isUnique
        }))
      });
      
      if (data.indices || data.compositeIndexes) {
        console.log('🔍 [DEBUG] 开始处理索引更新');
        
        // 检查字段中的索引标记
        const indexedFields = data.fields?.filter(f => f.index || f.isUnique);
        if (indexedFields?.length) {
          console.log('🔍 [DEBUG] 字段中定义的索引:', indexedFields);
        }
        
        // 确保indexes属性存在并且是数组
        if (!targetEntity.indexes) {
          targetEntity.indexes = [];
        } else if (!Array.isArray(targetEntity.indexes)) {
          // 如果indexes是对象，将其转换为数组
          targetEntity.indexes = Object.values(targetEntity.indexes);
        }
        
        // 创建索引数组的副本
        const updatedIndexes = [...targetEntity.indexes];
        
        // 处理普通索引 (indices)
        if (data.indices) {
          const indicesArray = Array.isArray(data.indices) 
            ? data.indices 
            : Object.values(data.indices || {});
            
          for (const indexData of indicesArray) {
            if (!indexData || typeof indexData !== 'object') continue;
            
            const indexName = indexData.name || `IDX_${indexData.field || indexData.columns?.[0]}`;
            if (!indexName) continue;
            
            // 查找现有索引
            const existingIndexIndex = updatedIndexes.findIndex((index) => 
              index.name === indexName
            );
            
            if (existingIndexIndex >= 0) {
              // 更新现有索引
              const index = updatedIndexes[existingIndexIndex];
              
              if (indexData.columns && Array.isArray(indexData.columns)) {
                index.fields = indexData.columns;
              } else if (indexData.field) {
                index.fields = [indexData.field];
              }
              
              if (typeof indexData.unique === 'boolean') {
                index.unique = indexData.unique;
              }
              if (indexData.comment && typeof indexData.comment === 'string') {
                index.comment = indexData.comment;
              }
              if (indexData.type && typeof indexData.type === 'string') {
                index.type = indexData.type;
              }
              
              console.log(`🔍 更新索引: ${indexName}`, index);
            } else {
              // 添加新索引
              const { v4: uuidv4 } = await import('uuid');
              const indexId = uuidv4();
              
              // 将新索引添加到数组中
              updatedIndexes.push({
                id: indexId,
                name: indexName,
                fields: (indexData.columns || (indexData.field ? [indexData.field] : [])) as string[],
                unique: (indexData.unique as boolean) || false,
                comment: (indexData.comment as string) || '',
                type: (indexData.type as string) || 'btree',
                createdAt: now,
                updatedAt: now
              });
              
              console.log(`🔍 添加新索引: ${indexName}`, updatedIndexes[updatedIndexes.length - 1]);
            }
          }
        }
        
        // 处理复合索引 (compositeIndexes)
        if (data.compositeIndexes && Array.isArray(data.compositeIndexes)) {
          console.log('🔍 [DEBUG] 开始处理复合索引，数量:', data.compositeIndexes.length);
          for (const compositeIndex of data.compositeIndexes) {
            console.log('🔍 [DEBUG] 处理复合索引:', compositeIndex);
            if (!compositeIndex || typeof compositeIndex !== 'object') continue;
            
            const indexName = compositeIndex.name || 
              `IDX_${compositeIndex.columns.join('_')}`;
            if (!indexName) continue;
            
            // 查找现有索引
            const existingIndexIndex = updatedIndexes.findIndex((index) => 
              index.name === indexName
            );
            
            if (existingIndexIndex >= 0) {
              // 更新现有索引
              const index = updatedIndexes[existingIndexIndex];
              index.fields = compositeIndex.columns;
              index.unique = compositeIndex.isUnique || false;
              
              console.log(`🔍 更新复合索引: ${indexName}`, index);
            } else {
              // 添加新索引
              const { v4: uuidv4 } = await import('uuid');
              const indexId = uuidv4();
              
              updatedIndexes.push({
                id: indexId,
                name: indexName,
                fields: compositeIndex.columns,
                unique: compositeIndex.isUnique || false,
                comment: compositeIndex.comment || '',
                type: compositeIndex.type || 'btree',
                createdAt: now,
                updatedAt: now
              });
              
              console.log(`🔍 添加复合索引: ${indexName}`, updatedIndexes[updatedIndexes.length - 1]);
            }
          }
        }
        
        // 将更新后的索引数组赋值给实体
        targetEntity.indexes = updatedIndexes;
        
        // 调试日志 - 打印更新后的索引
        console.log('🔍 [DEBUG] 最终索引列表:', {
          count: updatedIndexes.length,
          indexes: updatedIndexes.map(i => ({
            name: i.name,
            fields: i.fields,
            unique: i.unique
          }))
        });
        console.log('🔍 [DEBUG] 实体数据快照:', {
          id: targetEntity.entityInfo.id,
          code: targetEntity.entityInfo.code,
          indexesCount: targetEntity.indexes?.length,
          fieldsCount: Object.keys(targetEntity.fields).length
        });
      }
      
      // 处理关系更新
      if (data.relations && Array.isArray(data.relations)) {
        console.log('🔍 处理关系更新:', data.relations);
        
        // 确保relations属性存在
        if (!targetEntity.relations) {
          targetEntity.relations = {};
        }
        
        const updatedRelations = { ...targetEntity.relations };
        
        for (const relationData of data.relations as Record<string, unknown>[]) {
          if (!relationData || typeof relationData !== 'object') continue;
          
          const relationName = relationData.name as string;
          if (!relationName) continue;
          
          // 查找现有关系
          const existingRelation = Object.values(updatedRelations).find((relation: unknown) => {
            const relationInfo = (relation as { name: string }).name;
            return relationInfo === relationName;
          });
          
          if (existingRelation) {
            // 更新现有关系
            const relation = existingRelation as { 
              name: string; 
              type: string; 
              fromEntityId: string; 
              toEntityId: string; 
              inverseName?: string;
              cascade?: boolean;
              onDelete?: string;
              onUpdate?: string;
              nullable?: boolean;
              eager?: boolean;
              lazy?: boolean;
              joinTableName?: string;
              joinColumn?: string;
              inverseJoinColumn?: string;
              description?: string;
            };
            
            if (relationData.type && typeof relationData.type === 'string') {
              relation.type = relationData.type;
            }
            if (relationData.fromEntityId && typeof relationData.fromEntityId === 'string') {
              relation.fromEntityId = relationData.fromEntityId;
            }
            if (relationData.toEntityId && typeof relationData.toEntityId === 'string') {
              relation.toEntityId = relationData.toEntityId;
            }
            if (relationData.inverseName && typeof relationData.inverseName === 'string') {
              relation.inverseName = relationData.inverseName;
            }
            if (typeof relationData.cascade === 'boolean') {
              relation.cascade = relationData.cascade;
            }
            if (relationData.onDelete && typeof relationData.onDelete === 'string') {
              relation.onDelete = relationData.onDelete;
            }
            if (relationData.onUpdate && typeof relationData.onUpdate === 'string') {
              relation.onUpdate = relationData.onUpdate;
            }
            if (typeof relationData.nullable === 'boolean') {
              relation.nullable = relationData.nullable;
            }
            if (typeof relationData.eager === 'boolean') {
              relation.eager = relationData.eager;
            }
            if (typeof relationData.lazy === 'boolean') {
              relation.lazy = relationData.lazy;
            }
            if (relationData.joinTableName && typeof relationData.joinTableName === 'string') {
              relation.joinTableName = relationData.joinTableName;
            }
            if (relationData.joinColumn && typeof relationData.joinColumn === 'string') {
              relation.joinColumn = relationData.joinColumn;
            }
            if (relationData.inverseJoinColumn && typeof relationData.inverseJoinColumn === 'string') {
              relation.inverseJoinColumn = relationData.inverseJoinColumn;
            }
            if (relationData.description && typeof relationData.description === 'string') {
              relation.description = relationData.description;
            }
            
            console.log(`🔍 更新关系: ${relationName}`);
          } else {
            // 添加新关系
            const { v4: uuidv4 } = await import('uuid');
            const relationId = uuidv4();
            
            updatedRelations[relationId] = {
              id: relationId,
              name: relationName,
              type: (relationData.type as string) || 'oneToMany',
              fromEntityId: (relationData.fromEntityId as string) || '',
              toEntityId: (relationData.toEntityId as string) || '',
              inverseName: (relationData.inverseName as string) || '',
              cascade: (relationData.cascade as boolean) || false,
              onDelete: (relationData.onDelete as string) || 'RESTRICT',
              onUpdate: (relationData.onUpdate as string) || 'RESTRICT',
              nullable: (relationData.nullable as boolean) || true,
              eager: (relationData.eager as boolean) || false,
              lazy: (relationData.lazy as boolean) || true,
              joinTableName: (relationData.joinTableName as string) || '',
              joinColumn: (relationData.joinColumn as string) || '',
              inverseJoinColumn: (relationData.inverseJoinColumn as string) || '',
              description: (relationData.description as string) || '',
              createdAt: now,
              updatedAt: now
            };
            
            console.log(`🔍 添加新关系: ${relationName}`);
          }
        }
        
        targetEntity.relations = updatedRelations;
      }
      
      // 保存项目
      console.log('🔍 开始保存项目到localStorage');
      await StorageService.saveProject(projectData);
      
      // 调试日志 - 验证保存后的数据
      const savedProject = StorageService.getProject(projectData.id);
      console.log('🔍 保存后的项目数据:', JSON.stringify(savedProject, null, 2));
      console.log('🔍 项目保存完成');
      
      // 强制刷新UI
      projectStore.notifyUpdate();
      setTimeout(() => projectStore.notifyUpdate(), 100);
      
      // 通知项目更新
      if (onProjectUpdate) {
        console.log('🔍 开始调用onProjectUpdate');
        onProjectUpdate(projectData);
        console.log('🔍 onProjectUpdate调用完成');
      }
      
      // 手动触发 projectStore 通知，确保所有订阅者都能收到更新
      console.log('🔍 开始手动触发projectStore通知');
      projectStore.notifyUpdate();
      console.log('🔍 projectStore通知触发完成');
      
      console.log('✅ 实体更新成功');
      
    } catch (error) {
      console.error('❌ 实体更新失败:', error);
      throw error;
    }
  };

  // 删除实体（暂时不实现）
  const deleteEntityFromAI = async () => {
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
  const sendChatMessage = useCallback(async () => {
    if (!inputMessage.trim() || !selectedModel) return;
    
    console.log('当前选中的模型配置:', selectedModel);

    const userMessage: ChatMessage = { role: 'user', content: inputMessage };
    
    // 构建显示消息列表（不包含系统提示词）
    const displayMessages = [...messages, userMessage];
    setMessages(displayMessages);
    
    // 生成包含上下文的 AI 提示词
    const contextPrompt = aiIntegration.generateAIPrompt(inputMessage);
    console.log('🔍 AI提示词长度:', contextPrompt.length);
    console.log('🔍 AI提示词包含实体信息:', contextPrompt.includes('现有实体'));
    
    // 添加上下文信息到提示词中
    let enhancedPrompt = contextPrompt;
    if (aiChatContexts.length > 0) {
      const contextInfo = aiChatContexts.map(context => {
        switch (context.type) {
          case 'entity':
            return `实体: ${context.entityName} (code: ${context.entityCode})`;
          case 'field':
            return `实体 ${context.entityName} (code: ${context.entityCode}) 的字段: ${context.fieldCode}`;
          case 'index':
            return `实体 ${context.entityName} (code: ${context.entityCode}) 的索引`;
          case 'relation':
            return `实体 ${context.entityName} (code: ${context.entityCode}) 的关系`;
          default:
            return context.description;
        }
      }).join('\n');
      
      enhancedPrompt = `${contextPrompt}\n\n当前上下文信息:\n${contextInfo}`;
    }
    
    // 构建发送给AI的消息列表（包含系统提示词和上下文）
    const aiMessages = [
      { role: 'system' as const, content: enhancedPrompt },
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
  }, [inputMessage, selectedModel, messages, aiIntegration, aiChatContexts]);

  // 处理外部消息
  useEffect(() => {
    if (externalMessage && externalMessage.trim()) {
      console.log('🔔 收到外部消息:', externalMessage);
      console.log('🔔 当前selectedModel:', selectedModel);
      console.log('🔔 当前inputMessage:', inputMessage);
      
      setInputMessage(externalMessage);
      
      // 延迟发送消息，确保inputMessage已更新
      setTimeout(() => {
        console.log('🔔 准备发送外部消息到AI Chat');
        console.log('🔔 发送前的inputMessage:', externalMessage);
        console.log('🔔 发送前的selectedModel:', selectedModel);
        
        sendChatMessage();
        
        // 通知外部消息已发送
        if (onExternalMessageSent) {
          onExternalMessageSent();
        }
      }, 100);
    }
  }, [externalMessage, sendChatMessage, onExternalMessageSent]);

  // 清空聊天记录
  const clearChat = () => {
    setMessages([{ role: 'system', content: '你好！我是AI ORM设计专家，可以帮助你设计和创建数据库实体。请告诉我你的业务需求，我会为你设计合适的实体结构。' }]);
    setLastResponse(null);
    setError(null);
  };


  // 处理移除上下文Tag
  const handleRemoveContext = (contextId: string) => {
    projectStore.removeAIChatContext(contextId);
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
        // backgroundColor: '#1f1f1f',
        borderLeft: '1px solid #303030',
        ...style
      }}
    >
      {/* 头部 */}
      <div className="chat-header" style={{
        padding: '4px 10px',
        borderBottom: '1px solid #303030',
        // backgroundColor: '#262626'
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
                    // backgroundColor: badge.color,
                    backgroundColor: '#ffffff14',
                    color: '#ffffff94',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    // fontWeight: 500
                  }}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            {/* <Text style={{ color: '#ffffff94', fontSize: '12px' }}>操作确认：</Text> */}
            <Space>
              <Button
                type='text'
                size="small"
                style={{ color: '#ffffff94', fontSize: '13px', marginRight: '16px' }}
                onClick={rejectOperation}
              >
                Reject
              </Button>
              <Button
                color="default" 
                variant="filled"
                size="small"
                style={{ color: '#ffffff94', fontSize: '13px' }}
                onClick={confirmOperation}
              >
                Accept All <MacCommandOutlined />
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* AI聊天上下文Tag组件 */}
      {aiChatContexts.length > 0 && (
        <div style={{ 
          padding: '8px 16px', 
          borderTop: '1px solid #303030',
          backgroundColor: '#262626'
        }}>
          <Space wrap size={[4, 4]}>
            {aiChatContexts.map(context => (
              <Tag
                key={context.id}
                closable
                onClose={() => handleRemoveContext(context.id)}
                style={{
                  // backgroundColor: context.type === 'entity' ? '#1890ff' : '#52c41a',
                  // color: '#fff',
                  // border: 'none',
                  fontSize: '11px'
                }}
              >
                {context.description}
              </Tag>
            ))}
          </Space>
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
