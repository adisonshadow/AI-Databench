import React from 'react';
import { Table, Button, Space, Popconfirm, Empty } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Index } from '@/types/storage';

interface IndexListProps {
  indexes: Index[];
  onEdit: (index: Index) => void;
  onDelete: (indexId: string) => void;
  onCreate: () => void;
  rowStatusMap?: Record<string, 'added' | 'updated' | 'original'>;
}

const IndexList: React.FC<IndexListProps> = ({ indexes, onEdit, onDelete, onCreate, rowStatusMap = {} }) => {
  const columns: ColumnsType<Index> = [
    {
      title: 'Index Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Fields',
      dataIndex: 'fields',
      key: 'fields',
      render: (fields: string[]) => (fields || []).filter((field): field is string => Boolean(field)).join(', '),
    },
    {
      title: 'Uniqueness',
      dataIndex: 'unique',
      key: 'unique',
      width: 100,
      render: (unique: boolean) => (unique ? '唯一' : '非唯一'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => type || '默认',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            title="确定删除此索引？"
            description="删除后将无法恢复"
            onConfirm={() => onDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
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

      {indexes.length > 0 ? (
        <Table
          columns={columns}
          dataSource={indexes}
          rowKey="id"
          size="small"
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
                <span>No indexes, click </span> 
                <span style={{ color: '#DDD',display: 'inline-block', margin: '0 4px' }}>
                  + New
                </span>
                <span>(right-above) to add new indexes</span>
              </div>
            }
            style={{ margin: '40px 0' }}
        />
      )}
    </div>
  );
};

export default IndexList;