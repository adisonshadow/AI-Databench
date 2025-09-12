import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Row, Col, Divider, Alert, Typography } from 'antd';
import type { Relation, Project, RelationValidationResult, RelationConflict } from '@/types/storage';
import { RelationType, CascadeType } from '@/types/storage';
import { RelationUtils } from '@/utils/relationUtils';
import { StorageService } from '@/stores/storage';

const { Title } = Typography;
const { Option } = Select;

interface RelationFormValues {
  type: RelationType;
  fromEntityId: string;
  toEntityId: string;
  name: string;
  inverseName?: string;
  cascade: boolean;
  onDelete: CascadeType;
  onUpdate: CascadeType;
  nullable: boolean;
  eager: boolean;
  lazy: boolean;
  joinTableName?: string;
  joinColumn?: string;
  inverseJoinColumn?: string;
  description?: string;
}

interface RelationEditModalProps {
  visible: boolean;
  editingRelation: Relation | null;
  form: any;
  project: Project;
  validationResult: RelationValidationResult | null;
  conflicts: RelationConflict[];
  entities: any[];
  onFinish: (values: RelationFormValues) => void;
  onCancel: () => void;
  setValidationResult: React.Dispatch<React.SetStateAction<RelationValidationResult | null>>;
  setConflicts: React.Dispatch<React.SetStateAction<RelationConflict[]>>;
}

const RelationEditModal: React.FC<RelationEditModalProps> = ({
  visible,
  editingRelation,
  form,
  project,
  validationResult,
  conflicts,
  entities,
  onFinish,
  onCancel,
  setValidationResult,
  setConflicts
}) => {
  // 获取关系类型颜色
  const getRelationTypeColor = (type: RelationType): string => {
    const colors = {
      [RelationType.ONE_TO_ONE]: 'blue',
      [RelationType.ONE_TO_MANY]: 'green',
      [RelationType.MANY_TO_ONE]: 'orange',
      [RelationType.MANY_TO_MANY]: 'purple',
    };
    return colors[type];
  };

  // 获取级联类型颜色
  const getCascadeTypeColor = (type: CascadeType): string => {
    const colors = {
      [CascadeType.CASCADE]: 'red',
      [CascadeType.SET_NULL]: 'orange',
      [CascadeType.RESTRICT]: 'blue',
      [CascadeType.NO_ACTION]: 'default',
    };
    return colors[type];
  };

  // 重置表单
  useEffect(() => {
    if (visible) {
      if (editingRelation) {
        form.setFieldsValue({
          type: editingRelation.type,
          fromEntityId: editingRelation.from.entityId,
          toEntityId: editingRelation.to.entityId,
          name: editingRelation.name,
          inverseName: editingRelation.inverseName,
          cascade: editingRelation.config.cascade,
          onDelete: editingRelation.config.onDelete,
          onUpdate: editingRelation.config.onUpdate,
          nullable: editingRelation.config.nullable,
          eager: editingRelation.config.eager,
          lazy: editingRelation.config.lazy,
          joinTableName: editingRelation.joinTable?.name,
          joinColumn: editingRelation.joinTable?.joinColumn,
          inverseJoinColumn: editingRelation.joinTable?.inverseJoinColumn,
          description: editingRelation.metadata.description,
        });
      } else {
        form.resetFields();
      }
      setValidationResult(null);
      setConflicts([]);
    }
  }, [visible, editingRelation, form, setValidationResult, setConflicts]);

  return (
    <Modal
      title={editingRelation ? '编辑关系' : '新建关系'}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      width={800}
      okText="保存"
      cancelText="取消"
      maskClosable={false}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          cascade: false,
          onDelete: CascadeType.RESTRICT,
          onUpdate: CascadeType.RESTRICT,
          nullable: true,
          eager: false,
          lazy: true,
        }}
        style={{ paddingTop: 30 }}
      >
        {/* 基本信息 */}
        <Title level={5}>基本信息</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="type"
              label="关系类型"
              rules={[{ required: true, message: '请选择关系类型' }]}
            >
              <Select placeholder="选择关系类型">
                <Option value={RelationType.ONE_TO_ONE}>一对一 (OneToOne)</Option>
                <Option value={RelationType.ONE_TO_MANY}>一对多 (OneToMany)</Option>
                <Option value={RelationType.MANY_TO_ONE}>多对一 (ManyToOne)</Option>
                <Option value={RelationType.MANY_TO_MANY}>多对多 (ManyToMany)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="name"
              label="关系名称"
              rules={[{ required: true, message: '请输入关系名称' }]}
            >
              <Input placeholder="关系名称" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fromEntityId"
              label="源实体"
              rules={[{ required: true, message: '请选择源实体' }]}
            >
              <Select placeholder="选择源实体" disabled={!!editingRelation}>
                {entities.map(entity => (
                  <Option key={entity.entityInfo.id} value={entity.entityInfo.id}>
                    {entity.entityInfo.label || entity.entityInfo.code}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="toEntityId"
              label="目标实体"
              rules={[{ required: true, message: '请选择目标实体' }]}
            >
              <Select placeholder="选择目标实体">
                {entities.map(entity => (
                  <Option key={entity.entityInfo.id} value={entity.entityInfo.id}>
                    {entity.entityInfo.label || entity.entityInfo.code}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="inverseName"
          label="反向关系名称"
        >
          <Input placeholder="反向关系名称（可选）" />
        </Form.Item>

        <Form.Item
          name="description"
          label="关系描述"
        >
          <Input.TextArea placeholder="关系描述（可选）" rows={3} />
        </Form.Item>

        {/* 关系配置 */}
        <Divider />
        <Title level={5}>关系配置</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="cascade"
              label="级联操作"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="nullable"
              label="可为空"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="eager"
              label="立即加载"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="onDelete"
              label="删除策略"
            >
              <Select>
                <Option value={CascadeType.CASCADE}>级联 (CASCADE)</Option>
                <Option value={CascadeType.SET_NULL}>设为空 (SET NULL)</Option>
                <Option value={CascadeType.RESTRICT}>限制 (RESTRICT)</Option>
                <Option value={CascadeType.NO_ACTION}>无操作 (NO ACTION)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="onUpdate"
              label="更新策略"
            >
              <Select>
                <Option value={CascadeType.CASCADE}>级联 (CASCADE)</Option>
                <Option value={CascadeType.SET_NULL}>设为空 (SET NULL)</Option>
                <Option value={CascadeType.RESTRICT}>限制 (RESTRICT)</Option>
                <Option value={CascadeType.NO_ACTION}>无操作 (NO ACTION)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* 多对多关系配置 */}
        {form.getFieldValue('type') === RelationType.MANY_TO_MANY && (
          <>
            <Divider />
            <Title level={5}>中间表配置</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="joinTableName"
                  label="中间表名称"
                  rules={[{ required: true, message: '请输入中间表名称' }]}
                >
                  <Input placeholder="中间表名称" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="joinColumn"
                  label="连接列名称"
                  rules={[{ required: true, message: '请输入连接列名称' }]}
                >
                  <Input placeholder="连接列名称" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="inverseJoinColumn"
                  label="反向连接列名称"
                  rules={[{ required: true, message: '请输入反向连接列名称' }]}
                >
                  <Input placeholder="反向连接列名称" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {/* 验证结果 */}
        {validationResult && (
          <>
            <Divider />
            <Title level={5}>验证结果</Title>
            {validationResult.errors.length > 0 && (
              <Alert
                message="验证错误"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error.message}</li>
                      ))}
                  </ul>
                }
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            {validationResult.warnings.length > 0 && (
              <Alert
                message="验证警告"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning.message}</li>
                    ))}
                  </ul>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            {validationResult.isValid && validationResult.errors.length === 0 && (
              <Alert
                message="验证通过"
                description="关系配置验证通过，可以保存。"
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </>
        )}

        {/* 冲突检测 */}
        {conflicts.length > 0 && (
          <>
            <Divider />
            <Title level={5}>冲突检测</Title>
            <Alert
              message="检测到关系冲突"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {conflicts.map((conflict, index) => (
                    <li key={index}>
                      {conflict.message}
                      {conflict.suggestion && (
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          建议：{conflict.suggestion}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </>
        )}
      </Form>
    </Modal>
  );
};

export default RelationEditModal;