import React from 'react';
import { Table, Tag, Space, Button, Popconfirm, Empty, Typography } from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined,
  KeyOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ADBField } from '@/types/storage';

const { Text } = Typography;

interface FieldListProps {
  fields: ADBField[];
  onEdit: (field: ADBField) => void;
  onDelete: (field: ADBField) => void;
}

const FieldList: React.FC<FieldListProps> = ({ fields, onEdit, onDelete }) => {
  // 表格列定义
  const columns: ColumnsType<ADBField> = [
    {
      title: '字段标识',
      dataIndex: ['columnInfo', 'code'],
      key: 'code',
      width: 120,
      render: (code: string, record: ADBField) => (
        <div>
          <code style={{ color: '#1890ff' }}>{code}</code>
          {record.typeormConfig.primary && (
            <KeyOutlined style={{ color: '#f39c12', marginLeft: 4 }} title="主键" />
          )}
          {record.typeormConfig.unique && (
            <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} title="唯一" />
          )}
        </div>
      )
    },
    {
      title: '显示名称',
      dataIndex: ['columnInfo', 'label'],
      key: 'label',
      width: 120
    },
    {
      title: '数据类型',
      key: 'type',
      width: 120,
      render: (_, record: ADBField) => {
        const { type, length, precision, scale } = record.typeormConfig;
        const { extendType } = record.columnInfo;
        
        // 如果有扩展类型，优先显示扩展类型
        const displayType = extendType || type;
        let typeDisplay = displayType;
        
        if (length) {
          typeDisplay += `(${length})`;
        } else if (precision !== undefined && scale !== undefined) {
          typeDisplay += `(${precision},${scale})`;
        } else if (precision !== undefined) {
          typeDisplay += `(${precision})`;
        }
        
        // 根据类型设置不同的颜色
        const getTagColor = (type: string): string => {
          if (type.startsWith('adb-')) {
            return 'purple'; // ADB 扩展类型使用紫色
          }
          return 'blue'; // TypeORM 原生类型使用蓝色
        };
        
        return <Tag color={getTagColor(displayType)}>{typeDisplay.toUpperCase()}</Tag>;
      }
    },
    {
      title: '约束',
      key: 'constraints',
      width: 100,
      render: (_, record: ADBField) => (
        <Space size={4}>
          {!record.typeormConfig.nullable && <Tag color="red">NOT NULL</Tag>}
          {record.typeormConfig.unique && <Tag color="green">UNIQUE</Tag>}
          {record.typeormConfig.default !== undefined && (
            <Tag color="orange">DEFAULT</Tag>
          )}
        </Space>
      )
    },
    {
      title: '默认值',
      dataIndex: ['typeormConfig', 'default'],
      key: 'default',
      width: 100,
      render: (defaultValue: string | number | boolean | undefined) => (
        defaultValue !== undefined ? <code>{String(defaultValue)}</code> : <Text type="secondary">-</Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record: ADBField) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            title="确定删除此字段？"
            description="删除后将无法恢复，相关关系也会被清除"
            onConfirm={() => onDelete(record)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      {fields.length > 0 ? (
        <Table
          columns={columns}
          dataSource={fields}
          rowKey={(record) => record.columnInfo.id}
          size="small"
          scroll={{ x: 800 }}
          pagination={false}
        />
      ) : (
        <Empty 
          description="暂无字段，点击上方按钮新建字段"
          style={{ margin: '40px 0' }}
        />
      )}
    </>
  );
};

export default FieldList;