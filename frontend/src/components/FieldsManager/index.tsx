import React, { useState, useEffect, useMemo } from 'react';
import { 
  Button, 
  Space, 
  message,
  Segmented,
  Modal,
  Form
} from 'antd';
import { 
  PlusOutlined
} from '@ant-design/icons';
import { StorageService } from '@/stores/storage';
import { projectStore, type AIChatContext } from '@/stores/projectStore';
import type { ADBEntity, ADBField, Project, ExtendedColumnInfo, RelationCreateConfig, Index } from '@/types/storage';
import RelationManager from '../RelationManager';
import ADBEnumManager from '../ADBEnumManager';
import type { 
  Relation, 
  RelationValidationResult,
  RelationConflict
} from '@/types/storage';
import { RelationType } from '@/types/storage';
import { RelationUtils } from '@/utils/relationUtils';
import { v4 as uuidv4 } from 'uuid';
import { eventBus, EVENTS } from '@/utils/eventBus';

// 导入新创建的组件
import FieldList from './FieldList';
import FieldEditModal from './FieldEditModal';
import RelationList from './RelationList';
import RelationEditModal from './RelationEditModal';
import IndexList from './IndexList';
import IndexEditModal from './IndexEditModal';
import EnumSelectModal from './EnumSelectModal';
import EntitySelectModal from './EntitySelectModal';

interface FieldsManagerProps {
  entity: ADBEntity;
  project: Project;
  onEntityUpdate: (project: Project) => void;
  onProjectUpdate?: (project: Project) => void;
}

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

const FieldsManager: React.FC<FieldsManagerProps> = ({ entity, project, onEntityUpdate, onProjectUpdate }) => {
  const [fields, setFields] = useState<ADBField[]>([]);
  const [activeTab, setActiveTab] = useState<'fields' | 'indexes' | 'relations'>('fields');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRelationModalVisible, setIsRelationModalVisible] = useState(false);
  const [isEnumModalVisible, setIsEnumModalVisible] = useState(false);
  const [isEnumSelectModalVisible, setIsEnumSelectModalVisible] = useState(false);
  const [isEntitySelectModalVisible, setIsEntitySelectModalVisible] = useState(false);
  const [selectedEnumCode, setSelectedEnumCode] = useState<string>('');
  const [enumDisplayText, setEnumDisplayText] = useState<string>('');
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
  const [isRelationCreateModalVisible, setIsRelationCreateModalVisible] = useState(false);
  const [editingRelationInFields, setEditingRelationInFields] = useState<Relation | null>(null);
  const [relationValidationResult, setRelationValidationResult] = useState<RelationValidationResult | null>(null);
  const [relationConflicts, setRelationConflicts] = useState<RelationConflict[]>([]);
  const [relationForm] = Form.useForm();
  
  // 添加索引相关的状态
  const [isIndexEditModalVisible, setIsIndexEditModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<Index | null>(null);
  const [indexes, setIndexes] = useState<Index[]>([]);
  
  // 字段行状态管理
  const [fieldRowStatusMap, setFieldRowStatusMap] = useState<Record<string, 'added' | 'updated' | 'original'>>({});
  
  // 索引行状态管理
  const [indexRowStatusMap, setIndexRowStatusMap] = useState<Record<string, 'added' | 'updated' | 'original'>>({});
  
  // 关系行状态管理
  const [relationRowStatusMap, setRelationRowStatusMap] = useState<Record<string, 'added' | 'updated' | 'original'>>({});
  
  // 添加 handleSaveRelation 函数定义
  const handleSaveRelation = async () => {
    try {
      const values = await relationForm.validateFields();
      
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
      };

      // 创建新关系
      const newRelation = RelationUtils.createRelation(config, project);
      
      // 验证关系
      const validation = RelationUtils.validateRelation(newRelation, project);
      setRelationValidationResult(validation);

      if (!validation.isValid) {
        message.error('Relation validation failed, please check the configuration');
        return;
      }

      // 检查冲突 - 排除正在编辑的关系
      const existingRelations = project.schema.relations || [];
      const relationsToCheck = editingRelationInFields 
        ? existingRelations.filter(r => r.id !== editingRelationInFields.id)
        : existingRelations;
        
      const relationConflicts = RelationUtils.checkConflicts(newRelation, relationsToCheck);
      setRelationConflicts(relationConflicts);

      if (relationConflicts.length > 0) {
        message.warning('Detected relation conflicts, please check the configuration');
        return;
      }

      // 更新项目
      const updatedRelations = editingRelationInFields 
        ? (project.schema.relations || []).map(r => r.id === editingRelationInFields.id ? newRelation : r)
        : [...(project.schema.relations || []), newRelation];

      const updatedProject = {
        ...project,
        schema: {
          ...project.schema,
          relations: updatedRelations,
        },
      };

      // 标记关系行状态
      setRelationRowStatusMap(prev => ({
        ...prev,
        [newRelation.id]: editingRelationInFields ? 'updated' : 'added'
      }));
      
      StorageService.saveProject(updatedProject);
      onEntityUpdate(updatedProject);
      setIsRelationCreateModalVisible(false);
      setEditingRelationInFields(null);
      setRelationValidationResult(null);
      setRelationConflicts([]);
      message.success(editingRelationInFields ? 'Relation updated successfully' : 'Relation created successfully');
      
      // 3秒后清除闪烁效果
      setTimeout(() => {
        setRelationRowStatusMap(prev => {
          const newMap = { ...prev };
          delete newMap[newRelation.id];
          return newMap;
        });
      }, 3000);
      
    } catch (error) {
      console.error('保存关系失败:', error);
      message.error('Save relation failed');
    }
  };

  // 获取所有实体
  const entities = useMemo(() => {
    return Object.values(project.schema.entities || {});
  }, [project.schema.entities]);

  // 获取当前实体的关系列表
  const entityRelations = useMemo(() => {
    if (!project.schema.relations) return [];
    return project.schema.relations.filter(relation => 
      relation.from.entityId === entity.entityInfo.id || 
      relation.to.entityId === entity.entityInfo.id
    );
  }, [project.schema.relations, entity.entityInfo.id]);

  // 获取可用字段列表
  const availableFields = useMemo(() => {
    return Object.values(entity.fields || {})
      .map(field => field.columnInfo.code)
      .filter((code): code is string => code !== undefined);
  }, [entity.fields]);

  useEffect(() => {
    const fieldList = Object.values(entity.fields || {});
    setFields(fieldList);
    
    // 初始化索引数据
    const indexList = entity.indexes || [];
    setIndexes(indexList);
  }, [entity.fields, entity.indexes]);

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

      // 标记字段行状态
      const fieldCode = values.code || fieldId;
      setFieldRowStatusMap(prev => ({
        ...prev,
        [fieldCode]: editingField ? 'updated' : 'added'
      }));
      
      // 保存到localStorage
      StorageService.saveProject(updatedProject);
      
      // 立即更新本地状态
      setFields(Object.values(updatedEntity.fields || {}));
      
      // 通知父组件更新
      onEntityUpdate(updatedProject);

      setIsModalVisible(false);
      setEditingField(null);
      
      message.success(`Field ${editingField ? 'updated' : 'created'} successfully`);
      
      // 3秒后清除闪烁效果
      setTimeout(() => {
        setFieldRowStatusMap(prev => {
          const newMap = { ...prev };
          delete newMap[fieldCode];
          return newMap;
        });
      }, 3000);
    } catch (error) {
      console.error('保存字段失败:', error);
      message.error('Field save failed');
    }
  };

  // 处理删除字段
  const handleDeleteField = async (field: ADBField) => {
    console.log('🔍 开始删除字段:', field);
    console.log('🔍 字段ID:', field.columnInfo.id);
    console.log('🔍 实体:', entity);
    console.log('🔍 项目:', project);
    
    try {
      const now = new Date().toISOString();
      console.log('🔍 删除前的字段列表:', Object.keys(entity.fields));
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [field.columnInfo.id]: _, ...remainingFields } = entity.fields;
      
      console.log('🔍 删除后的字段列表:', Object.keys(remainingFields));
      
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

      console.log('🔍 暂停projectStore通知');
      projectStore.pauseNotifications();
      
      console.log('🔍 保存项目到localStorage');
      StorageService.saveProject(updatedProject);
      
      // 验证保存是否成功
      const savedProject = StorageService.getProject(project.id);
      console.log('🔍 验证保存结果:', Object.keys(savedProject?.schema.entities[entity.entityInfo.id]?.fields || {}));
      
      console.log('🔍 更新本地字段状态');
      // 立即更新本地状态
      setFields(Object.values(updatedEntity.fields || {}));
      
      console.log('🔍 通知父组件更新');
      // 通知父组件更新
      onEntityUpdate(updatedProject);
      
      console.log('🔍 恢复projectStore通知');
      projectStore.resumeNotifications();
      
      console.log('✅ 字段删除成功');
      message.success('字段删除成功');
    } catch (error) {
      console.error('❌ 删除字段失败:', error);
      message.error('删除字段失败');
    }
  };

  // 处理删除字段确认
  // handleDeleteFieldWithConfirm 函数已移除，现在直接使用 Popconfirm 组件

  // 处理字段排序变化
  const handleFieldSortChange = (sortedFields: ADBField[]) => {
    if (!project || !entity.entityInfo.id) return;
    
    try {
      const now = new Date().toISOString();
      
      // 更新字段的orderIndex
      const updatedFields: Record<string, ADBField> = {};
      sortedFields.forEach((field, index) => {
        updatedFields[field.columnInfo.id] = {
          ...field,
          columnInfo: {
            ...field.columnInfo,
            orderIndex: index
          },
          updatedAt: now
        };
      });
      
      // 更新实体
      const updatedEntity = {
        ...entity,
        fields: updatedFields,
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
        },
        updatedAt: now
      };
      
      // 保存到localStorage
      StorageService.saveProject(updatedProject);
      
      // 通知父组件项目已更新
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }
      
      // 通知全局项目存储项目已更新
      projectStore.notifyUpdate();
      
      message.success('字段排序已更新');
      
    } catch (error) {
      console.error('更新字段排序失败:', error);
      message.error('更新字段排序失败');
    }
  };

  // 处理编辑关系
  const handleEditRelation = (relation: Relation) => {
    // 设置正在编辑的关系
    setEditingRelationInFields(relation);
    // 打开关系创建模态框
    setIsRelationCreateModalVisible(true);
  };

  // 处理新建关系
  const handleCreateRelation = () => {
    setEditingRelationInFields(null);
    setIsRelationCreateModalVisible(true);
  };

  // 处理删除关系
  const handleDeleteRelation = (relationId: string) => {
    const updatedRelations = project.schema.relations?.filter(r => r.id !== relationId) || [];
    const updatedProject = {
      ...project,
      schema: {
        ...project.schema,
        relations: updatedRelations,
      },
    };
    StorageService.saveProject(updatedProject);
    onEntityUpdate(updatedProject);
    message.success('关系删除成功');
  };

  // 处理编辑字段
  const handleEditField = (field: ADBField) => {
    setEditingField(field);
    
    // 设置枚举选择状态
    if (field.columnInfo.enumConfig?.enum) {
      const selectedEnum = Object.values(project.schema.enums || {}).find(e => e.enumInfo.code === field.columnInfo.enumConfig?.enum);
      if (selectedEnum) {
        setSelectedEnumCode(selectedEnum.enumInfo.code);
        setEnumDisplayText(`${selectedEnum.enumInfo.code}（${selectedEnum.enumInfo.description || selectedEnum.enumInfo.label}）`);
      }
    } else {
      setSelectedEnumCode('');
      setEnumDisplayText('');
    }
    
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
    setSelectedEnumCode('');
    setEnumDisplayText('');
    setIsModalVisible(true);
  };

  // 处理枚举选择
  const handleEnumSelect = (enumCode: string) => {
    const selectedEnum = Object.values(project.schema.enums || {}).find(e => e.enumInfo.code === enumCode);
    if (selectedEnum) {
      setSelectedEnumCode(enumCode);
      setEnumDisplayText(`${selectedEnum.enumInfo.code}（${selectedEnum.enumInfo.description || selectedEnum.enumInfo.label}）`);
      form.setFieldValue('enumConfig', {
        ...form.getFieldValue('enumConfig'),
        enum: enumCode
      });
    }
  };

  // 处理枚举清空
  const handleEnumClear = () => {
    setSelectedEnumCode('');
    setEnumDisplayText('');
    form.setFieldValue('enumConfig', {
      ...form.getFieldValue('enumConfig'),
      enum: ''
    });
  };

  // 处理新建索引
  const handleCreateIndex = () => {
    setEditingIndex(null);
    setIsIndexEditModalVisible(true);
  };

  // 处理编辑索引
  const handleEditIndex = (index: Index) => {
    setEditingIndex(index);
    setIsIndexEditModalVisible(true);
  };

  // 处理删除索引
  const handleDeleteIndex = async (indexId: string) => {
    try {
      const now = new Date().toISOString();
      
      // 更新实体
      const updatedEntity = {
        ...entity,
        indexes: indexes.filter(index => index.id !== indexId),
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
      
      // 立即更新本地状态
      setIndexes(updatedEntity.indexes || []);
      
      // 通知父组件更新
      onEntityUpdate(updatedProject);
      
      message.success('索引删除成功');
    } catch (error) {
      console.error('删除索引失败:', error);
      message.error('删除索引失败');
    }
  };

  // 处理保存索引
  const handleSaveIndex = async (indexData: Index) => {
    try {
      const now = new Date().toISOString();
      
      // 更新索引列表
      let updatedIndexes: Index[];
      if (editingIndex) {
        // 更新现有索引
        updatedIndexes = indexes.map(index => 
          index.id === editingIndex.id ? indexData : index
        );
      } else {
        // 添加新索引
        updatedIndexes = [...indexes, indexData];
      }
      
      // 更新实体
      const updatedEntity = {
        ...entity,
        indexes: updatedIndexes,
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

      // 标记索引行状态
      setIndexRowStatusMap(prev => ({
        ...prev,
        [indexData.id]: editingIndex ? 'updated' : 'added'
      }));
      
      // 保存到localStorage
      StorageService.saveProject(updatedProject);
      
      // 立即更新本地状态
      setIndexes(updatedIndexes);
      
      // 通知父组件更新
      onEntityUpdate(updatedProject);

      setIsIndexEditModalVisible(false);
      setEditingIndex(null);
      
      message.success(`Index ${editingIndex ? 'updated' : 'created'} successfully`);
      
      // 3秒后清除闪烁效果
      setTimeout(() => {
        setIndexRowStatusMap(prev => {
          const newMap = { ...prev };
          delete newMap[indexData.id];
          return newMap;
        });
      }, 3000);
    } catch (error) {
      console.error('Save index failed:', error);
      message.error('Save index failed');
    }
  };

  // 处理添加单个字段到AI Chat
  const handleAddFieldToChat = (field: ADBField) => {
    // 只添加选中的实体和字段组合
    const entityCodeLast = entity.entityInfo.code.split(':').pop() || entity.entityInfo.code;
    const entityName = entity.entityInfo.label || entityCodeLast;
    
    const fieldContext: AIChatContext = {
      id: uuidv4(),
      type: 'field',
      entityCode: entity.entityInfo.code,
      entityName: entity.entityInfo.label || entity.entityInfo.code,
      fieldCode: field.columnInfo.code,
      fieldName: field.columnInfo.label,
      description: `${entityName}(${entityCodeLast})的${field.columnInfo.code}`
    };
    projectStore.addAIChatContext(fieldContext);

    // message.success(`已添加字段 "${field.columnInfo.code}" 到AI聊天上下文`);
  };

  // 处理AI生成索引
  const handleAIGenerateIndexes = () => {
    try {
      // 先添加实体到AI Chat上下文
      const entityContext: AIChatContext = {
        id: uuidv4(),
        type: 'entity',
        entityCode: entity.entityInfo.code,
        entityName: entity.entityInfo.label || entity.entityInfo.code,
        description: `${entity.entityInfo.label || entity.entityInfo.code}(${entity.entityInfo.code})`
      };
      projectStore.addAIChatContext(entityContext);

      // 构建固定的AI提示词
      const fullPrompt = `请帮我为实体"${entity.entityInfo.label}"自动创建和补齐索引。

请分析当前实体的字段结构，自动为以下情况创建合适的索引：
1. 主键字段（如果存在）
2. 外键字段（如果存在）
3. 唯一字段（如果存在）
4. 经常用于查询的字段（如姓名、邮箱、手机号等）
5. 时间字段（如创建时间、更新时间等）
6. 状态字段（如状态、类型等）

请根据字段的特点和业务逻辑，创建合适的索引类型：
- 普通索引：用于提高查询性能
- 唯一索引：用于保证数据唯一性
- 复合索引：用于多字段组合查询

注意：
1. 在本体系中 表 和 实体 是同一个概念
2. 在本体系中 字段 和 列 是同一个概念
3. 请基于实体结构展开设计，不要遗漏任何需求，并确保设计结果符合本体系的设计规范
4. 请考虑索引的命名规范和性能优化
`.replace(/\n/g, '\n\n');

      // 通过事件总线发送消息到AI Chat
      console.log('🚀 通过事件总线发送AI生成索引消息到AI Chat:', fullPrompt);
      eventBus.emit(EVENTS.SEND_MESSAGE_TO_AI_CHAT, fullPrompt);
      
      message.success('已发送AI生成索引请求到AI Chat，请查看右侧AI助手回复');
      
    } catch (error) {
      console.error('AI生成索引失败:', error);
      message.error('AI生成索引失败');
    }
  };

  // 处理AI生成关系
  const handleAIGenerateRelations = () => {
    try {
      // 先添加实体到AI Chat上下文
      const entityContext: AIChatContext = {
        id: uuidv4(),
        type: 'entity',
        entityCode: entity.entityInfo.code,
        entityName: entity.entityInfo.label || entity.entityInfo.code,
        description: `${entity.entityInfo.label || entity.entityInfo.code}(${entity.entityInfo.code})`
      };
      projectStore.addAIChatContext(entityContext);

      // 构建固定的AI提示词
      const fullPrompt = `请帮我为实体"${entity.entityInfo.label}"自动创建和补齐关系。

请分析当前实体的字段结构和业务逻辑，自动创建合适的关系：
1. 一对一关系：如用户与用户资料、订单与订单详情等
2. 一对多关系：如用户与订单、部门与员工、分类与商品等
3. 多对多关系：如用户与角色、学生与课程、商品与标签等

请根据字段的特点和业务逻辑，创建合适的关系类型：
- 外键关系：通过外键字段建立的关系
- 关联表关系：通过中间表建立的多对多关系
- 级联关系：设置合适的级联操作（删除、更新等）

注意：
1. 在本体系中 表 和 实体 是同一个概念
2. 在本体系中 字段 和 列 是同一个概念
3. 请基于实体结构展开设计，不要遗漏任何需求，并确保设计结果符合本体系的设计规范
4. 请考虑关系的命名规范和业务逻辑
5. 请分析项目中其他实体的结构，建立合理的关系网络
`.replace(/\n/g, '\n\n');

      // 通过事件总线发送消息到AI Chat
      console.log('🚀 通过事件总线发送AI生成关系消息到AI Chat:', fullPrompt);
      eventBus.emit(EVENTS.SEND_MESSAGE_TO_AI_CHAT, fullPrompt);
      
      // message.success('已发送AI生成关系请求到AI Chat，请查看右侧AI助手回复');
      
    } catch (error) {
      console.error('AI生成关系失败:', error);
      message.error('Failed to generate relations');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 字段管理头部 */}
      <Space style={{ 
        height: 40,
        padding: '0 5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {/* 使用Segmented组件替换原来的表名显示 */}
          <Segmented
            options={[
              { label: 'Fields', value: 'fields' },
              { label: 'Indexes', value: 'indexes' },
              { label: 'Relations', value: 'relations' }
            ]}
            size="small"
            value={activeTab}
            onChange={(value) => setActiveTab(value as 'fields' | 'indexes' | 'relations')}
          />
        </div>
        <Space>
          {/* 根据当前活动的tab显示不同的按钮 */}
          {activeTab === 'fields' && (
            <Button 
              type="text" 
              icon={<PlusOutlined />}
              onClick={handleCreateField}
              size="small"
            >
              New
            </Button>
          )}
          {activeTab === 'relations' && (
            <>
              <Button 
                className='btn-ai'
                size="small"
                onClick={handleAIGenerateRelations}
                style={{ marginRight: 8 }}
              >
                Auto Generate
              </Button>
              <Button 
                type="text" 
                icon={<PlusOutlined />}
                onClick={handleCreateRelation}
                size="small"
              >
                New
              </Button>
            </>
          )}
          {activeTab === 'indexes' && (
            <>
              <Button 
                className='btn-ai' 
                size="small"
                onClick={handleAIGenerateIndexes}
                style={{ marginRight: 8 }}
              >
                Auto Create
              </Button>
              <Button 
                type="text" 
                icon={<PlusOutlined />}
                onClick={handleCreateIndex}
                size="small"
              >
                New
              </Button>
            </>
          )}
        </Space>
      </Space>
      
      {/* 字段列表内容区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '5px',
        // backgroundColor: '#141414'
      }}>
        {/* 根据当前活动的tab显示不同的内容 */}
        {activeTab === 'fields' && (
          <FieldList 
            fields={fields}
            onEdit={handleEditField}
            onDelete={handleDeleteField}
            onAddToChat={handleAddFieldToChat}
            onSortChange={handleFieldSortChange}
            rowStatusMap={fieldRowStatusMap}
          />
        )}
        
        {activeTab === 'relations' && (
          <RelationList
            relations={entityRelations}
            onEdit={handleEditRelation}
            onDelete={handleDeleteRelation}
            rowStatusMap={relationRowStatusMap}
          />
        )}
        
        {activeTab === 'indexes' && (
          <IndexList
            indexes={indexes}
            onEdit={handleEditIndex}
            onDelete={handleDeleteIndex}
            onCreate={handleCreateIndex}
            rowStatusMap={indexRowStatusMap}
          />
        )}
      </div>

      {/* 字段编辑模态框 */}
      <FieldEditModal
        visible={isModalVisible}
        editingField={editingField}
        form={form}
        formValues={formValues}
        selectedEnumCode={selectedEnumCode}
        enumDisplayText={enumDisplayText}
        project={project}
        selectedEnumCodeState={selectedEnumCode}
        setFormValues={setFormValues}
        setSelectedEnumCode={setSelectedEnumCode}
        setEnumDisplayText={setEnumDisplayText}
        setIsEnumSelectModalVisible={setIsEnumSelectModalVisible}
        handleEnumSelect={handleEnumSelect}
        handleEnumClear={handleEnumClear}
        onFinish={handleSaveField}
        defaultActiveTab={editingField ? 'manual' : 'ai'}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingField(null);
          setFormValues({
            code: '',
            label: '',
            type: '',
            nullable: false,
            unique: false,
            primary: false,
          });
        }}
      />

      {/* 关系管理模态框 */}
      <Modal
        title="Relation Management"
        open={isRelationModalVisible}
        onCancel={() => setIsRelationModalVisible(false)}
        footer={null}
        width={1200}
        destroyOnHidden
        maskClosable={false}
      >
        <RelationManager 
          project={project}
          onProjectUpdate={onEntityUpdate}
        />
      </Modal>

      {/* ADB枚举管理模态框 */}
      <ADBEnumManager
        visible={isEnumModalVisible}
        onClose={() => setIsEnumModalVisible(false)}
        project={project}
        onProjectUpdate={onEntityUpdate}
      />

      {/* 枚举选择模态框 */}
      <EnumSelectModal
        visible={isEnumSelectModalVisible}
        onCancel={() => setIsEnumSelectModalVisible(false)}
        onConfirm={(enumCode) => {
          if (enumCode) {
            handleEnumSelect(enumCode);
            setIsEnumSelectModalVisible(false);
          } else {
            message.warning("Please select an enum");
          }
        }}
        project={project}
        selectedEnumCode={selectedEnumCode}
      />
      
      {/* 实体选择模态框 */}
      <EntitySelectModal
        visible={isEntitySelectModalVisible}
        onCancel={() => setIsEntitySelectModalVisible(false)}
        onConfirm={(entityId, entityName) => {
          form.setFieldsValue({
            targetEntity: entityId,
            targetEntityName: entityName
          });
          setIsEntitySelectModalVisible(false);
        }}
        project={project}
      />

      {/* 关系创建模态框 */}
      <RelationEditModal
        visible={isRelationCreateModalVisible}
        editingRelation={editingRelationInFields}
        form={relationForm}
        project={project}
        entity={entity} // 传递当前实体
        validationResult={relationValidationResult}
        conflicts={relationConflicts}
        entities={entities}
        onFinish={handleSaveRelation}
        defaultActiveTab={editingRelationInFields ? 'manual' : 'ai'}
        onCancel={() => {
          setIsRelationCreateModalVisible(false);
          setEditingRelationInFields(null);
          setRelationValidationResult(null);
          setRelationConflicts([]);
        }}
        setValidationResult={setRelationValidationResult}
        setConflicts={setRelationConflicts}
      />
      
      {/* 索引编辑模态框 */}
      <IndexEditModal
        visible={isIndexEditModalVisible}
        onCancel={() => {
          setIsIndexEditModalVisible(false);
          setEditingIndex(null);
        }}
        onOk={handleSaveIndex}
        defaultActiveTab={editingIndex ? 'manual' : 'ai'}
        editingIndex={editingIndex}
        availableFields={availableFields}
        currentIndexes={indexes} // 传递当前索引列表
        project={project}
        entity={entity}
      />
    </div>
  );
};

export default FieldsManager;