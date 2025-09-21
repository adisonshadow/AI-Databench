import React, { useState, useEffect } from 'react';
import { Tag, Space, Button, Empty, Dropdown, Flex, Popconfirm } from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  MoreOutlined,
  MessageOutlined,
  ToolOutlined 
} from '@ant-design/icons';
// import type { ColumnsType } from 'antd/es/table';
import type { ADBField } from '@/types/storage';

import type { ProColumns } from '@ant-design/pro-components';
import { DragSortTable } from '@ant-design/pro-components';

// const { Text } = Typography;

interface FieldListProps {
  fields: ADBField[];
  onEdit: (field: ADBField) => void;
  onDelete: (field: ADBField) => void;
  onAddToChat: (field: ADBField) => void;
  onSortChange?: (fields: ADBField[]) => void;
  rowStatusMap?: Record<string, 'added' | 'updated' | 'original'>;
}

const FieldList: React.FC<FieldListProps> = ({ fields, onEdit, onDelete, onAddToChat, onSortChange, rowStatusMap = {} }) => {
  
  const [fieldsData, setFieldsData] = useState<ADBField[]>([]);

  // 表格列定义
  const columns: ProColumns<ADBField>[] = [
    {
      title: '',
      dataIndex: 'sort',
      width: 40,
      className: 'drag-visible'
    },
    {
      title: 'Identifier',
      dataIndex: ['columnInfo', 'code'],
      key: 'code',
      width: 120,
      render: (_, record: ADBField) => (
        <div>
          <code style={{ color: '#1890ff' }}>{record.columnInfo.code}</code>
          {record.typeormConfig.primary && (
            <KeyOutlined style={{ color: '#f39c12', marginLeft: 4 }} title="Primary Key" />
          )}
          {record.typeormConfig.unique && (
            <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} title="Unique" />
          )}
        </div>
      )
    },
    {
      title: 'Label',
      dataIndex: ['columnInfo', 'label'],
      key: 'label',
      width: 120
    },
    {
      title: 'Information',
      key: 'desc',
      render: (_, record: ADBField) => {

        /////////数据类型

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

        /////////默认值
        
        return (<Space size={2}>
            <Tag color={getTagColor(displayType)}>{typeDisplay.toUpperCase()}</Tag>
            {!record.typeormConfig.nullable && <Tag color="red">NOT NULL</Tag>}
            {record.typeormConfig.unique && <Tag color="green">UNIQUE</Tag>}
            {record.typeormConfig.default !== undefined && (
              <Tag color="orange">DEFAULT</Tag>
            )}
            {record.typeormConfig.default !== undefined && (
              <code>{String(record.typeormConfig.default)}</code> 
            )}
          </Space>);
      }
    },
    {
      title: ()=>{
        return (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}><ToolOutlined /></div>
        );
      },
      key: 'actions',
      width: 40,
      fixed: 'right',
      render: (_, record: ADBField) => {
        const dropdownItems = [
          {
            key: 'edit',
            label: 'Edit',
            icon: <EditOutlined />,
            onClick: () => onEdit(record)
          },
          {
            key: 'addToChat',
            label: 'Add Field to AI Chat',
            icon: <MessageOutlined />,
            onClick: () => onAddToChat(record)
          },
          {
            key: 'delete',
            label: (
              <Popconfirm
                title="Delete Field"
                description={`Are you sure you want to delete the field "${record.columnInfo.label}"? This action cannot be undone.`}
                onConfirm={() => {
                  onDelete(record);
                }}
                okText="Delete"
                cancelText="Cancel"
                okType="danger"
              >
                <span>Delete</span>
              </Popconfirm>
            ),
            icon: <DeleteOutlined />,
            danger: true
          }
        ];
        
        return (
          <Flex justify='end'>
            <Dropdown
              menu={{
                items: dropdownItems.map(item => ({
                  ...item,
                  onClick: () => {
                    if (item.onClick) {
                      item.onClick();
                    }
                  }
                }))
              }}
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </Flex>
        );
      }
    }
  ];

  useEffect(() => {

    // 为字段添加sort属性，用于拖拽排序
    const fieldsWithSort = fields.map((field, index) => ({
      ...field,
      sort: index
    }));
    setFieldsData(fieldsWithSort);
    console.log('fieldsWithSort', fieldsWithSort);
  }, [fields]);

  const handleDragSortEnd = (
    _beforeIndex: number,
    _afterIndex: number,
    newDataSource: ADBField[],
  ) => {
    console.log('排序后的数据', newDataSource);
    
    // 移除sort属性，恢复原始字段数据
    const fieldsWithoutSort = newDataSource.map((field) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sort, ...fieldWithoutSort } = field as ADBField & { sort?: number };
      return fieldWithoutSort as ADBField;
    });
    
    setFieldsData(newDataSource);
    
    // 通知父组件字段顺序已改变
    if (onSortChange) {
      onSortChange(fieldsWithoutSort);
    }
  };

  return (
    <>
      {fieldsData.length > 0 ? (
        <DragSortTable
          columns={columns}
          dataSource={fieldsData}
          search={false}
          rowKey="sort"  //{(record) => record.columnInfo.id}
          size="small"
          scroll={{ x: 800 }}
          pagination={false}
          dragSortKey="sort"
          onDragSortEnd={handleDragSortEnd}
          toolBarRender={false}
          optionsRender={() => []}
          rowClassName={(record) => {
            const fieldCode = record.columnInfo.code || record.columnInfo.id;
            if (rowStatusMap[fieldCode] === 'added') return 'added-row';
            if (rowStatusMap[fieldCode] === 'updated') return 'updated-row';
            return '';
          }}
        />
      ) : (
        <Empty 
          description={
            <div>
              <span>No fields, click </span> 
              <span style={{ color: '#DDD',display: 'inline-block', margin: '0 4px' }}>
                + New
              </span>
              <span>(right-above) to add new fields</span>
            </div>
          }
          style={{ margin: '40px 0' }}
        />
      )}
    </>
  );
};

export default FieldList;