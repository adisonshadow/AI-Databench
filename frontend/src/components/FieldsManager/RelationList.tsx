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
}

const RelationList: React.FC<RelationListProps> = ({ relations, onEdit, onDelete }) => {
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
      title: '源实体',
      dataIndex: ['from', 'entityName'],
      key: 'from',
      width: 120,
    },
    {
      title: '目标实体',
      dataIndex: ['to', 'entityName'],
      key: 'to',
      width: 120,
    },
    {
      title: '关系名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '关系类型',
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
      title: '级联操作',
      dataIndex: ['config', 'cascade'],
      key: 'cascade',
      width: 80,
      render: (cascade: boolean) => (
        <Tag color={cascade ? 'green' : 'default'}>
          {cascade ? '是' : '否'}
        </Tag>
      ),
    },
    // {
    //   title: '删除策略',
    //   dataIndex: ['config', 'onDelete'],
    //   key: 'onDelete',
    //   width: 100,
    //   render: (onDelete: CascadeType) => (
    //     <Tag color={getCascadeTypeColor(onDelete)}>
    //       {RelationUtils.getCascadeTypeDisplayName(onDelete)}
    //     </Tag>
    //   ),
    // },
    {
      title: '操作',
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
            title="确定删除此关系？"
            description="删除关系可能会影响数据完整性，请谨慎操作。"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
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
        />
      ) : (
        <Empty 
            description="暂无关系，点击上方按钮新建关系"
            style={{ margin: '40px 0' }}
        />
      )}
    </div>
  );
};

export default RelationList;