import React, { useState, useMemo } from 'react';
import { Modal, Table, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ADBEntity, Project } from '@/types/storage';

interface EntitySelectModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (entityId: string, entityName: string) => void;
  project: Project;
}

const EntitySelectModal: React.FC<EntitySelectModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  project
}) => {
  const [tempSelectedEntityId, setTempSelectedEntityId] = useState<string>('');
  const [tempSelectedEntityName, setTempSelectedEntityName] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  // 获取所有实体
  const allEntities = useMemo(() => {
    return Object.values(project.schema.entities || {});
  }, [project.schema.entities]);

  // 过滤实体列表
  const filteredEntities = useMemo(() => allEntities.filter(entity =>
    entity.entityInfo.code.toLowerCase().includes(searchText.toLowerCase()) ||
    entity.entityInfo.label.toLowerCase().includes(searchText.toLowerCase()) ||
    entity.entityInfo.description?.toLowerCase().includes(searchText.toLowerCase())
  ), [allEntities, searchText]);

  // 处理实体选择
  const handleEntityClick = (entity: ADBEntity) => {
    setTempSelectedEntityId(entity.entityInfo.id);
    setTempSelectedEntityName(entity.entityInfo.label || entity.entityInfo.code);
  };

  // 处理确认选择
  const handleConfirm = () => {
    if (tempSelectedEntityId) {
      onConfirm(tempSelectedEntityId, tempSelectedEntityName);
    }
  };

  return (
    <Modal
      title="选择目标实体"
      open={visible}
      onCancel={onCancel}
      onOk={handleConfirm}
      width={800}
      okText="确认选择"
      cancelText="取消"
      okButtonProps={{ disabled: !tempSelectedEntityId }}
      destroyOnHidden
    >
      {/* 搜索框 */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索实体代码、名称或描述"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* 实体列表 */}
      <div style={{ height: 400, overflow: 'auto' }}>
        <Table
          columns={[
            {
              title: '代码',
              dataIndex: ['entityInfo', 'code'],
              key: 'code',
            },
            {
              title: '显示名称',
              dataIndex: ['entityInfo', 'label'],
              key: 'label',
            },
            {
              title: '描述',
              dataIndex: ['entityInfo', 'description'],
              key: 'description',
              ellipsis: true,
              render: (text: string) => text || '-',
            }
          ]}
          dataSource={filteredEntities}
          pagination={false}
          rowKey={(record) => record.entityInfo.id}
          size="small"
          onRow={(record) => ({
            onClick: () => handleEntityClick(record),
            style: {
              cursor: 'pointer',
              backgroundColor: tempSelectedEntityId === record.entityInfo.id 
                ? 'rgba(139, 69, 255, 0.1)' : undefined, // 半透明紫色背景
            }
          })}
        />
      </div>
    </Modal>
  );
};

export default EntitySelectModal;