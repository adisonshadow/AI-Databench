import React from 'react';
import { Table, Tag, Space, Button, Popconfirm, Empty } from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Relation } from '@/types/storage';
import { RelationType, CascadeType } from '@/types/storage';
import { RelationUtils } from '@/utils/relationUtils';

interface RelationListProps {
  relations: Relation[];
  onEdit: (relation: Relation) => void;
  onDelete: (relationId: string) => void;
  rowStatusMap?: Record<string, 'added' | 'updated' | 'original'>;
}

const RelationList: React.FC<RelationListProps> = ({ relations, onEdit, onDelete, rowStatusMap = {} }) => {
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

  // 关系表格列定义
  const columns: ColumnsType<Relation> = [
    {
      title: 'Source Entity',
      dataIndex: ['from', 'entityName'],
      key: 'from',
      width: 120,
    },
    {
      title: 'Target Entity',
      dataIndex: ['to', 'entityName'],
      key: 'to',
      width: 120,
    },
    {
      title: 'Relation Name',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: 'Relation Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: RelationType) => (
        <Tag color={getRelationTypeColor(type)}>
          {RelationUtils.getRelationTypeDisplayName(type)}
        </Tag>
      ),
    },
    // {
    //   title: '反向名称',
    //   dataIndex: 'inverseName',
    //   key: 'inverseName',
    //   width: 120,
    //   render: (inverseName: string) => inverseName || '-',
    // },
    {
      title: 'Cascade Operation',
      dataIndex: ['config', 'cascade'],
      key: 'cascade',
      width: 80,
      render: (cascade: boolean) => (
        <Tag color={cascade ? 'green' : 'default'}>
          {cascade ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Delete Strategy',
      dataIndex: ['config', 'onDelete'],
      key: 'onDelete',
      width: 100,
      render: (onDelete: CascadeType) => (
        <Tag color={getCascadeTypeColor(onDelete)}>
          {RelationUtils.getCascadeTypeDisplayName(onDelete)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space size="small" align='center'>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this relation?"
            description="Deleting a relation may affect data integrity, please proceed with caution."
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {relations.length > 0 ? (
        <Table
          columns={columns}
          dataSource={relations}
          rowKey="id"
          size="small"
          scroll={{ x: 1000 }}
          pagination={false}
          rowClassName={(record) => {
            if (rowStatusMap[record.id] === 'added') return 'added-row';
            if (rowStatusMap[record.id] === 'updated') return 'updated-row';
            return '';
          }}
        />
      ) : (
        <Empty 
            description={
              <div>
                <span>No relations, click </span> 
                <span style={{ color: '#DDD',display: 'inline-block', margin: '0 4px' }}>
                  + New
                </span>
                <span>(right-above) to add new relations</span>
              </div>
            }
            style={{ margin: '40px 0' }}
        />
      )}
    </div>
  );
};

export default RelationList;