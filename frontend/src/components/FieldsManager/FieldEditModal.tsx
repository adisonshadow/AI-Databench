import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Tabs,
} from "antd";
import {
  getTypeORMNativeTypes,
  getADBExtendTypes,
  getFieldTypeConfig,
  getFieldTypeHint,
  isIDType,
  requiresLengthConfig,
  requiresPrecisionConfig,
  requiresScaleConfig,
  shouldShowConfig,
  getDefaultValueOptions,
//   supportsRelationConfig,
} from "@/utils/fieldTypeConfig";
import type { ADBField, Project } from "@/types/storage";
import { eventBus, EVENTS } from '@/utils/eventBus';
import { v4 as uuidv4 } from 'uuid';
import { projectStore } from '@/stores/projectStore';

const { Option } = Select;

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
  generated?: boolean | "increment" | "uuid" | "rowid";
  comment?: string;
  status?: "enabled" | "disabled" | "archived";
  orderIndex?: number;

  // ADB 扩展类型配置
  extendType?: string;
  mediaConfig?: {
    mediaType: "image" | "video" | "audio" | "document" | "file";
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
    version?: "v1" | "v4" | "v5";
    format?: "default" | "braced" | "binary" | "urn";
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
    format?: "number" | "string";
  };
}

interface FieldEditModalProps {
  visible: boolean;
  editingField: ADBField | null;
  form: any;
  formValues: FieldFormValues;
  selectedEnumCode: string;
  enumDisplayText: string;
  project: Project;
  selectedEnumCodeState: string;
  setFormValues: React.Dispatch<React.SetStateAction<FieldFormValues>>;
  setSelectedEnumCode: React.Dispatch<React.SetStateAction<string>>;
  setEnumDisplayText: React.Dispatch<React.SetStateAction<string>>;
  setIsEnumSelectModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  handleEnumSelect: (enumCode: string) => void;
  handleEnumClear: () => void;
  onFinish: (values: FieldFormValues) => void;
  onCancel: () => void;
  defaultActiveTab?: string; // 默认激活的Tab
}

const FieldEditModal: React.FC<FieldEditModalProps> = ({
  visible,
  editingField,
  form,
  formValues,
  selectedEnumCode,
  enumDisplayText,
  project,
  selectedEnumCodeState,
  setFormValues,
//   setSelectedEnumCode,
//   setEnumDisplayText,
  setIsEnumSelectModalVisible,
//   handleEnumSelect,
  handleEnumClear,
  onFinish,
  onCancel,
  defaultActiveTab = 'ai',
}) => {
  const [activeTab, setActiveTab] = useState<string>(defaultActiveTab);
  const [aiForm] = Form.useForm();
  
  // 处理AI创建字段
  const handleAICreateField = async (values: { prompt: string }) => {
    try {
      // 先添加实体到AI Chat上下文
      const entityId = editingField?.entityId || Object.keys(project.schema.entities)[0];
      const entity = project.schema.entities[entityId];
      if (entity) {
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
      const fullPrompt = `请帮我为实体"${entity?.entityInfo.label || '当前实体'}"创建一个或多个新的字段。以下是需求描述：

${values.prompt}

注意：
1. 在本体系中 表 和 实体 是同一个概念
2. 在本体系中 字段 和 列 是同一个概念
3. 请基于需求描述展开设计，不要遗漏任何需求，并确保设计结果符合本体系的设计规范
4. 请考虑字段的数据类型、长度、是否可空、默认值等属性
`.replace(/\n/g, '\n\n');

      // 通过事件总线发送消息到AI Chat
      console.log('🚀 通过事件总线发送字段创建消息到AI Chat:', fullPrompt);
      eventBus.emit(EVENTS.SEND_MESSAGE_TO_AI_CHAT, fullPrompt);
      
      // 关闭模态框
      onCancel();
      
    } catch (error) {
      console.error('AI创建字段失败:', error);
    }
  };
  
  // 获取所有支持的类型
  const typeormNativeTypes = getTypeORMNativeTypes();
  const adbExtendTypes = getADBExtendTypes();

  // 获取当前选中的枚举选项
  const getCurrentEnumOptions = () => {
    if (!selectedEnumCodeState) return [];
    const selectedEnum = Object.values(project.schema.enums || {}).find(
      (e) => e.enumInfo.code === selectedEnumCodeState
    );
    if (!selectedEnum) return [];

    // 将EnumInfoOptions的items转换为选项数组
    return Object.entries(selectedEnum.enumInfo.items || {}).map(
      ([value, item]) => ({
        value,
        label: (item as { label: string }).label,
      })
    );
  };

  // 获取实体的字段选项
//   const getFieldOptionsForEntity = (entityId: string) => {
//     if (!entityId) return [];
//     const entity = project.schema.entities[entityId];
//     if (!entity) return [];

//     // 返回实体的所有字段作为选项
//     return Object.values(entity.fields || {}).map((field) => ({
//       value: field.columnInfo.id,
//       label: `${field.columnInfo.label} (${field.columnInfo.code})`,
//     }));
//   };

  // 重置表单值
  useEffect(() => {
    if (visible) {
      if (editingField) {
        const fieldValues = {
          code: editingField.columnInfo.code,
          label: editingField.columnInfo.label,
          comment: editingField.columnInfo.comment,
          status: editingField.columnInfo.status,
          orderIndex: editingField.columnInfo.orderIndex,
          type:
            editingField.columnInfo.extendType ||
            editingField.typeormConfig.type,
          length: editingField.typeormConfig.length,
          nullable: editingField.typeormConfig.nullable,
          unique: editingField.typeormConfig.unique,
          default: editingField.typeormConfig.default,
          primary: editingField.typeormConfig.primary,
          precision: editingField.typeormConfig.precision,
          scale: editingField.typeormConfig.scale,
          generated: editingField.typeormConfig.generated,
          // 扩展类型配置
          extendType: editingField.columnInfo.extendType,
          mediaConfig: editingField.columnInfo.mediaConfig,
          enumConfig: editingField.columnInfo.enumConfig,
          autoIncrementIdConfig: editingField.columnInfo.autoIncrementIdConfig,
          guidIdConfig: editingField.columnInfo.guidIdConfig,
          snowflakeIdConfig: editingField.columnInfo.snowflakeIdConfig,
        };
        form.setFieldsValue(fieldValues);
        setFormValues(fieldValues);
      } else {
        // 新建字段时重置表单
        form.resetFields();
        setFormValues({
          code: "",
          label: "",
          type: "",
          nullable: false,
          unique: false,
          primary: false,
        });
      }
    }
  }, [visible, editingField, form, setFormValues]);

  return (
    <Modal
      title={editingField ? "编辑字段" : "新建字段"}
      open={visible}
      onCancel={onCancel}
      onOk={() => {
        if (activeTab === 'ai') {
          aiForm.submit();
        } else {
          form.submit();
        }
      }}
      width={600}
      forceRender // 强制渲染Modal内容，确保Form初始化
      maskClosable={false}
      destroyOnHidden={false} // 保持Modal内容，确保Form实例连接
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
                onFinish={handleAICreateField}
                layout="vertical"
                preserve={true}
              >
                <Form.Item
                  name="prompt"
                  label="字段需求描述"
                  rules={[{ required: true, message: '请输入字段创建的需求描述' }]}
                >
                  <Input.TextArea 
                    rows={6} 
                    placeholder="例如：为员工实体添加姓名、邮箱、手机号等基本信息字段"
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
                onFinish={onFinish}
                onValuesChange={(_, allValues) => {
                  // 更新表单值，但保护 type 字段不被意外清空
                  setFormValues((prev) => {
                    const newValues = { ...prev, ...allValues };
                    // 如果 type 字段在表单中存在且不为空，保持它
                    if (allValues.type && allValues.type !== "") {
                      newValues.type = allValues.type;
                    } else if (prev.type && prev.type !== "") {
                      // 如果表单中的 type 为空但之前有值，保持之前的值
                      newValues.type = prev.type;
                    }
                    return newValues;
                  });
                }}
                labelCol={{ span: 7 }}
                wrapperCol={{ span: 15 }}
                // labelWrap
        layout="horizontal"
        preserve={false}
        style={{ paddingTop: 30 }}
      >
        <Form.Item
          name="code"
          label="字段标识"
          hasFeedback
          rules={[
            { required: true, message: "请输入字段标识" },
            {
              pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
              message: "字段标识只能包含字母、数字和下划线，且以字母开头",
            },
          ]}
        >
          <Input placeholder="例如: user_name" />
        </Form.Item>

        <Form.Item
          name="label"
          label="显示名称"
          rules={[{ required: true, message: "请输入显示名称" }]}
        >
          <Input placeholder="例如: 用户姓名" />
        </Form.Item>

        <Form.Item
          name="type"
          label="数据类型"
          rules={[{ required: true, message: "请选择数据类型" }]}
        >
          <Select
            placeholder="选择数据类型"
            onChange={(value) => {
              // 当类型改变时，重置相关字段
              const config = getFieldTypeConfig(value);

              // 重置不适用的字段
              const resetFields: Record<string, unknown> = {};
              if (!config.length) resetFields.length = undefined;
              if (!config.precision) resetFields.precision = undefined;
              if (!config.scale) resetFields.scale = undefined;
              if (!config.default) resetFields.default = undefined;
              if (!config.unique) resetFields.unique = false;
              if (!config.primary) resetFields.primary = false;

              // ID类型特殊处理
              if (isIDType(value)) {
                resetFields.nullable = false;
                resetFields.unique = false;
                resetFields.primary = false;
                resetFields.default = undefined;
              }

              form.setFieldsValue(resetFields);
            }}
          >
            <Select.OptGroup label="TypeORM 原生类型">
              {typeormNativeTypes.map((type) => (
                <Option key={type.type} value={type.type}>
                  {type.label}
                </Option>
              ))}
            </Select.OptGroup>
            <Select.OptGroup label="ADB 扩展类型">
              {adbExtendTypes.map((type) => (
                <Option key={type.type} value={type.type}>
                  {type.label}
                </Option>
              ))}
            </Select.OptGroup>
          </Select>
        </Form.Item>

        {/* 智能提示 */}
        {formValues.type && getFieldTypeHint(formValues.type) && (
          <div
            style={{
              marginBottom: 16,
              textAlign: "center",
            }}
          > 
            <span
              style={{
                padding: "4px 12px",
                backgroundColor: "#f6ffed22",
                border: "1px solid #b7eb8f33",
                borderRadius: 6,
                fontSize: "12px",
                color: "rgb(198 228 183)",
                display: "inline-block",
            }}
            >
            💡 {getFieldTypeHint(formValues.type)}
            </span>
          </div>
        )}

        {/* 长度和精度配置 - 使用条件渲染，避免空白 Form.Item */}
        {formValues.type && requiresLengthConfig(formValues.type) && (
          <Form.Item
            name="length"
            label="长度"
            rules={[{ required: true, message: "请输入长度" }]}
          >
            <InputNumber
              min={1}
              max={65535}
              placeholder="字符长度"
              style={{ width: "100%" }}
            />
          </Form.Item>
        )}

        {formValues.type && requiresPrecisionConfig(formValues.type) && (
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item
              name="precision"
              label="精度"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "请输入精度" }]}
            >
              <InputNumber
                min={1}
                max={65}
                placeholder="总位数"
                style={{ width: "100%" }}
              />
            </Form.Item>
            {requiresScaleConfig(formValues.type) && (
              <Form.Item name="scale" label="小数位" style={{ flex: 1 }}>
                <InputNumber
                  min={0}
                  max={30}
                  placeholder="小数位数"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            )}
          </div>
        )}

        {/* 基础配置项 - 智能显示 */}
        <div style={{ display: "flex", gap: 16 }}>
          {/* 可为空 - ID类型不显示，其他类型显示 */}
          {formValues.type && !isIDType(formValues.type) && (
            <Form.Item
              name="nullable"
              label="可为空"
              valuePropName="checked"
              labelCol={{ span: 12 }}
              wrapperCol={{ span: 12 }}
              style={{ flex: 1 }}
            >
              <Switch />
            </Form.Item>
          )}

          {/* 唯一约束 - 根据类型智能显示 */}
          {formValues.type && shouldShowConfig(formValues.type, "unique") && (
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
          {formValues.type && shouldShowConfig(formValues.type, "primary") && (
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

        {/* ADB Enum 配置 */}
        {formValues.type && shouldShowConfig(formValues.type, "enumConfig") && (
          <div>
            <Form.Item
              name={["enumConfig", "enum"]}
              label="选择枚举"
              rules={[{ required: true, message: "请选择枚举" }]}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, color: "#177ddc" }}>
                  {selectedEnumCode ? enumDisplayText : "未选择"}
                </span>
                {selectedEnumCode ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={handleEnumClear}
                    style={{ padding: 0, color: "#888" }}
                  >
                    清空选择
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => setIsEnumSelectModalVisible(true)}
                  >
                    请选择
                  </Button>
                )}
              </div>
            </Form.Item>

            <Form.Item
              name={["enumConfig", "isMultiple"]}
              label="多选模式"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            {/* <Form.Item
              name={['enumConfig', 'default']}
              label="默认值"
            >
              {(() => {
                const enumOptions = getCurrentEnumOptions();
                const defaultValueOptions = getDefaultValueOptions(formValues.type, enumOptions);
                
                if (defaultValueOptions && defaultValueOptions.length > 1) {
                  return (
                    <Select placeholder="选择默认值" showSearch>
                      {defaultValueOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  );
                }
                return <Input placeholder="枚举默认值" />;
              })()}
            </Form.Item> */}
          </div>
        )}

        {/* Auto Increment ID 配置 */}
        {formValues.type &&
          shouldShowConfig(formValues.type, "autoIncrementIdConfig") && (
            <div>
              <div style={{ display: "flex", gap: 16 }}>
                <Form.Item
                  name={["autoIncrementIdConfig", "startValue"]}
                  label="起始值"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <InputNumber
                    min={1}
                    placeholder="起始值"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item
                  name={["autoIncrementIdConfig", "increment"]}
                  label="增量"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <InputNumber
                    min={1}
                    placeholder="增量"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <Form.Item
                  name={["autoIncrementIdConfig", "sequenceName"]}
                  label="序列名称"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="PostgreSQL序列名称" />
                </Form.Item>

                <Form.Item
                  name={["autoIncrementIdConfig", "isPrimaryKey"]}
                  label="是否主键"
                  valuePropName="checked"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <Switch />
                </Form.Item>
              </div>
            </div>
          )}

        {/* GUID ID 配置 */}
        {formValues.type &&
          shouldShowConfig(formValues.type, "guidIdConfig") && (
            <div>
              <div style={{ display: "flex", gap: 16 }}>
                <Form.Item
                  name={["guidIdConfig", "version"]}
                  label="GUID版本"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <Select placeholder="选择版本">
                    <Option value="v1">V1 - 基于时间戳</Option>
                    <Option value="v4">V4 - 随机（推荐）</Option>
                    <Option value="v5">V5 - 基于命名空间</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name={["guidIdConfig", "format"]}
                  label="格式"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <Select placeholder="选择格式">
                    <Option value="default">标准格式</Option>
                    <Option value="braced">大括号格式</Option>
                    <Option value="binary">二进制格式</Option>
                    <Option value="urn">URN格式</Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item
                name={["guidIdConfig", "generateOnInsert"]}
                label="插入时自动生成"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>
          )}

        {/* Snowflake ID 配置 */}
        {formValues.type &&
          shouldShowConfig(formValues.type, "snowflakeIdConfig") && (
            <div>
              <div style={{ display: "flex", gap: 16 }}>
                <Form.Item
                  name={["snowflakeIdConfig", "machineId"]}
                  label="机器ID"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <InputNumber
                    min={0}
                    max={1023}
                    placeholder="0-1023"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item
                  name={["snowflakeIdConfig", "datacenterId"]}
                  label="数据中心ID"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <InputNumber
                    min={0}
                    max={31}
                    placeholder="0-31"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <Form.Item
                  name={["snowflakeIdConfig", "format"]}
                  label="输出格式"
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                  style={{ flex: 1 }}
                >
                  <Select placeholder="选择格式">
                    <Option value="number">数字格式（推荐）</Option>
                    <Option value="string">字符串格式</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name={["snowflakeIdConfig", "generateOnInsert"]}
                  label="插入时自动生成"
                  valuePropName="checked"
                  style={{ flex: 1 }}
                  labelCol={{ span: 12 }}
                >
                  <Switch />
                </Form.Item>
              </div>
            </div>
          )}

        {/* ADB Media 配置 */}
        {formValues.type &&
          shouldShowConfig(formValues.type, "mediaConfig") && (
            <div>
              <div style={{ display: "flex", gap: 16 }}>
                <Form.Item
                  name={["mediaConfig", "mediaType"]}
                  label="媒体类型"
                  rules={[{ required: true, message: "请选择媒体类型" }]}
                  style={{ flex: 1 }}
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
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
                  name={["mediaConfig", "formats"]}
                  label="支持格式"
                  rules={[{ required: true, message: "请输入支持的文件格式" }]}
                  style={{ flex: 1 }}
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                >
                  <Select
                    mode="tags"
                    placeholder="输入文件格式，如: jpg, png, gif"
                  >
                    <Option value="jpg">JPG</Option>
                    <Option value="png">PNG</Option>
                    <Option value="gif">GIF</Option>
                    <Option value="webp">WEBP</Option>
                    <Option value="mp4">MP4</Option>
                    <Option value="pdf">PDF</Option>
                  </Select>
                </Form.Item>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <Form.Item
                  name={["mediaConfig", "maxSize"]}
                  label="最大限制(MB)"
                  style={{ flex: 1 }}
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                >
                  <InputNumber
                    min={1}
                    placeholder="文件大小限制"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item
                  name={["mediaConfig", "isMultiple"]}
                  label="允许多文件"
                  valuePropName="checked"
                  style={{ flex: 1 }}
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                >
                  <Switch />
                </Form.Item>
              </div>

              <Form.Item name={["mediaConfig", "storagePath"]} label="存储路径">
                <Input placeholder="例如: uploads/avatars" />
              </Form.Item>
            </div>
          )}

        {/* 默认值 - 根据类型智能显示 */}
        {formValues.type && shouldShowConfig(formValues.type, "default") && (
          <Form.Item name="default" label="默认值">
            {(() => {
              const enumOptions = getCurrentEnumOptions();
              const defaultValueOptions = getDefaultValueOptions(
                formValues.type,
                enumOptions
              );
              if (defaultValueOptions) {
                return (
                  <Select
                    placeholder="选择或输入默认值"
                    allowClear
                    showSearch
                    filterOption={(input, option) => {
                      // 允许搜索选项
                      return (
                        option?.children
                          ?.toString()
                          .toLowerCase()
                          .includes(input.toLowerCase()) || false
                      );
                    }}
                    popupRender={(menu) => (
                      <div>
                        {menu}
                        <div
                          style={{
                            padding: "8px 12px",
                            fontSize: "12px",
                            color: "#666",
                          }}
                        >
                          💡 您可以直接输入自定义值
                        </div>
                      </div>
                    )}
                  >
                    {defaultValueOptions.map((option) => (
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

        {/* 关系配置 - 仅对支持关系配置的字段类型显示 */}
        {/* 暂时注释掉关系配置部分 */}
        {/* {formValues.type && supportsRelationConfig(formValues.type) && (
          <div style={{ 
            border: '1px solid #424242', 
            borderRadius: 6, 
            padding: 16, 
            marginTop: 16,
            backgroundColor: '#1f1f1f'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 16 
            }}>
              <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                🔗 关系配置
              </div>
              <Form.Item 
                name="enableRelation" 
                valuePropName="checked" 
                noStyle
              >
                <Switch />
              </Form.Item>
            </div>
            
            <Form.Item 
              noStyle 
              shouldUpdate={(prevValues, currentValues) => 
                prevValues.enableRelation !== currentValues.enableRelation
              }
            >
              {({ getFieldValue }) => 
                getFieldValue('enableRelation') && (
                  <>
                    <Form.Item
                      name="relationType"
                      label="关系类型"
                      rules={[{ required: true, message: '请选择关系类型' }]}
                    >
                      <Select placeholder="选择关系类型">
                        <Option value="manyToOne">多对一 (ManyToOne)</Option>
                        <Option value="oneToOne">一对一 (OneToOne)</Option>
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      name="targetEntity"
                      label="目标实体"
                      rules={[{ required: true, message: '请选择目标实体' }]}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, color: '#177ddc' }}>
                          {getFieldValue('targetEntityName') || '未选择实体'}
                        </span>
                        <Button 
                          type="primary" 
                          size="small" 
                          // onClick={() => setIsEntitySelectModalVisible(true)}
                        >
                          选择实体
                        </Button>
                      </div>
                    </Form.Item>
                    
                    <Form.Item
                      name="targetField"
                      label="目标字段"
                      rules={[{ required: true, message: '请选择目标字段' }]}
                    >
                      <Select placeholder="选择目标字段">
                        {getFieldOptionsForEntity(getFieldValue('targetEntity')).map(option => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      name="relationName"
                      label="关系名称"
                    >
                      <Input placeholder="例如: user, orders" />
                    </Form.Item>
                  </>
                )
              }
            </Form.Item>
          </div>
        )} */}
              </Form>
            )
          }
        ]}
      />
    </Modal>
  );
};

export default FieldEditModal;
