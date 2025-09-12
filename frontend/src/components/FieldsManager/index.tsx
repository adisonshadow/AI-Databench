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
  PlusOutlined, 
} from '@ant-design/icons';
import { StorageService } from '@/stores/storage';
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

const FieldsManager: React.FC<FieldsManagerProps> = ({ entity, project, onEntityUpdate }) => {
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
        message.error('关系验证失败，请检查配置');
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
        message.warning('检测到关系冲突，请检查配置');
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

      StorageService.saveProject(updatedProject);
      onEntityUpdate(updatedProject);
      setIsRelationCreateModalVisible(false);
      setEditingRelationInFields(null);
      setRelationValidationResult(null);
      setRelationConflicts([]);
      message.success(editingRelationInFields ? '关系更新成功' : '关系创建成功');
      
    } catch (error) {
      console.error('保存关系失败:', error);
      message.error('保存关系失败');
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
    return Object.values(entity.fields || {}).map(field => field.columnInfo.code);
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

      // 保存到localStorage
      StorageService.saveProject(updatedProject);
      
      // 立即更新本地状态
      setFields(Object.values(updatedEntity.fields || {}));
      
      // 通知父组件更新
      onEntityUpdate(updatedProject);

      setIsModalVisible(false);
      setEditingField(null);
      
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
      
      // 立即更新本地状态
      setFields(Object.values(updatedEntity.fields || {}));
      
      // 通知父组件更新
      onEntityUpdate(updatedProject);
      
      message.success('字段删除成功');
    } catch (error) {
      console.error('删除字段失败:', error);
      message.error('删除字段失败');
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

      // 保存到localStorage
      StorageService.saveProject(updatedProject);
      
      // 立即更新本地状态
      setIndexes(updatedIndexes);
      
      // 通知父组件更新
      onEntityUpdate(updatedProject);

      setIsIndexEditModalVisible(false);
      setEditingIndex(null);
      
      message.success(`索引${editingIndex ? '更新' : '创建'}成功`);
    } catch (error) {
      console.error('保存索引失败:', error);
      message.error('保存索引失败');
    }
  };

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
          {/* 使用Segmented组件替换原来的表名显示 */}
          <Segmented
            options={[
              { label: '字段', value: 'fields' },
              { label: '索引', value: 'indexes' },
              { label: '关系', value: 'relations' }
            ]}
            value={activeTab}
            onChange={(value) => setActiveTab(value as 'fields' | 'indexes' | 'relations')}
          />
        </div>
        <Space>
          {/* 根据当前活动的tab显示不同的按钮 */}
          {activeTab === 'fields' && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateField}
            >
              新建字段
            </Button>
          )}
          {activeTab === 'relations' && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateRelation}
            >
              新建关系
            </Button>
          )}
          {activeTab === 'indexes' && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateIndex}
            >
              新建索引
            </Button>
          )}
        </Space>
      </Space>
      
      {/* 字段列表内容区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '16px',
        backgroundColor: '#141414'
      }}>
        {/* 根据当前活动的tab显示不同的内容 */}
        {activeTab === 'fields' && (
          <FieldList 
            fields={fields}
            onEdit={handleEditField}
            onDelete={handleDeleteField}
          />
        )}
        
        {activeTab === 'relations' && (
          <RelationList
            relations={entityRelations}
            onEdit={handleEditRelation}
            onDelete={handleDeleteRelation}
          />
        )}
        
        {activeTab === 'indexes' && (
          <IndexList
            indexes={indexes}
            onEdit={handleEditIndex}
            onDelete={handleDeleteIndex}
            onCreate={handleCreateIndex}
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
        title="关系管理"
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
            message.warning("请选择一个枚举");
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
        editingIndex={editingIndex}
        availableFields={availableFields}
        currentIndexes={indexes} // 传递当前索引列表
      />
    </div>
  );
};

export default FieldsManager;