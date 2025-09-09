import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Project, ADBEntity } from '@/types/storage';

interface EntityManagerProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const EntityManager: React.FC<EntityManagerProps> = ({ project }) => {
  const [entities, setEntities] = useState<ADBEntity[]>([]);

  useEffect(() => {
    const entityList = Object.values(project.schema.entities || {});
    setEntities(entityList);
  }, [project]);

  const columns = [
    {
      title: '实体标识',
      dataIndex: ['entityInfo', 'code'],
      key: 'code',
      render: (code: string) => <code>{code}</code>
    },
    {
      title: '显示名称',
      dataIndex: ['entityInfo', 'label'],
      key: 'label'
    },
    {
      title: '状态',
      dataIndex: ['entityInfo', 'status'],
      key: 'status',
      render: (status: string) => {
        const colors = { enabled: 'green', disabled: 'orange', archived: 'red' };
        return <Tag color={colors[status as keyof typeof colors]}>{status}</Tag>;
      }
    }
  ];

  return (
    <Card 
      title="实体模型管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          新建实体
        </Button>
      }
    >
      {entities.length === 0 ? (
        <Empty description="暂无实体模型" />
      ) : (
        <Table
          columns={columns}
          dataSource={entities}
          rowKey={(record) => record.entityInfo.id}
        />
      )}
    </Card>
  );
};

export default EntityManager;