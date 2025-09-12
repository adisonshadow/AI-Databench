import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Input, Segmented, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { Project } from '@/types/storage';

interface EnumSelectModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (enumCode: string) => void;
  project: Project;
  selectedEnumCode: string;
}

const EnumSelectModal: React.FC<EnumSelectModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  project,
  selectedEnumCode
}) => {
  const [tempSelectedEnumCode, setTempSelectedEnumCode] = useState<string>(selectedEnumCode);
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  // 获取所有启用的枚举
  const enabledEnums = useMemo(() => {
    return Object.values(project.schema.enums || {}).filter(() => {
      // 这里假设所有枚举都是启用状态，因为ADBEnumDefinition没有status字段
      return true;
    });
  }, [project.schema.enums]);

  // 过滤枚举列表
  const filteredEnums = useMemo(() => enabledEnums.filter(enumItem =>
    enumItem.enumInfo.code.toLowerCase().includes(searchText.toLowerCase()) ||
    enumItem.enumInfo.label.toLowerCase().includes(searchText.toLowerCase()) ||
    enumItem.enumInfo.description?.toLowerCase().includes(searchText.toLowerCase())
  ), [enabledEnums, searchText]);

  // 构建树形数据
  const treeData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const codeMap = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // const result: any[] = [];
    const allCodes: string[] = [];

    filteredEnums.forEach(enumItem => {
      const codes = enumItem.enumInfo.code.split(':');
      let currentPath = '';
      
      codes.forEach((code: string, index: number) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}:${code}` : code;
        allCodes.push(currentPath);
        
        if (!codeMap.has(currentPath)) {
          const node = {
            value: currentPath,
            label: index === codes.length - 1 ? enumItem.enumInfo.label : code,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            children: [] as any[],
            parentPath: parentPath || undefined,
            enumInfo: index === codes.length - 1 ? enumItem.enumInfo : undefined,
            createdAt: index === codes.length - 1 ? enumItem.createdAt : undefined,
            updatedAt: index === codes.length - 1 ? enumItem.updatedAt : undefined
          };
          codeMap.set(currentPath, node);
        }
      });
    });

    // 构建树形结构
    codeMap.forEach((node) => {
      if (node.parentPath) {
        const parent = codeMap.get(node.parentPath);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    });

    // 只返回根节点
    const rootNodes = Array.from(codeMap.values()).filter(node => !node.parentPath);
    
    // 递归处理节点
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processNode = (node: any): any => {
      if (node.children && node.children.length > 0) {
        node.children = node.children.map(processNode);
      }
      return node;
    };

    return rootNodes.map(processNode);
  }, [filteredEnums]);

  // 表格列定义
  const columns = useMemo(() => [
    {
      title: '代码',
      dataIndex: 'enumInfo.code',
      key: 'code',
      width: viewMode === 'tree' ? 200 : undefined,
      ellipsis: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (text: string, record: any) => {
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        return <Tag color="blue">{record.enumInfo?.code || record.value}</Tag>;
      }
    },
    {
      title: '显示名称',
      dataIndex: 'enumInfo.label',
      key: 'label',
      width: viewMode === 'tree' ? 200 : undefined,
      ellipsis: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (text: string, record: any) => {
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        const label = viewMode === 'tree' ? (record.enumInfo?.label || text) : (record.enumInfo?.label || text);
        return label;
      }
    },
    {
      title: '描述',
      dataIndex: 'enumInfo.description',
      key: 'description',
      width: viewMode === 'tree' ? 200 : undefined,
      ellipsis: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (text: string, record: any) => {
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        const description = viewMode === 'tree' ? (record.enumInfo?.description || text) : (record.enumInfo?.description || text);
        return description || '-';
      }
    },
    {
      title: '选项数量',
      key: 'optionsCount',
      width: 80,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (record: any) => {
        if (viewMode === 'tree' && record.children && record.children.length > 0) {
          return null;
        }
        const enumData = viewMode === 'tree' ? record : record;
        const options = Object.entries(enumData.enumInfo?.items || {});
        return <Tag color="green">{options.length}</Tag>;
      }
    }
  ], [viewMode]);

  // 处理枚举选择
  const handleEnumClick = (enumCode: string) => {
    setTempSelectedEnumCode(enumCode);
  };

  // 处理确认选择
  const handleConfirm = () => {
    if (tempSelectedEnumCode) {
      onConfirm(tempSelectedEnumCode);
    }
  };

  // 重置临时选择状态
  useEffect(() => {
    if (visible) {
      setTempSelectedEnumCode(selectedEnumCode);
    }
  }, [visible, selectedEnumCode]);

  return (
    <Modal
      title="选择枚举"
      open={visible}
      onCancel={onCancel}
      onOk={handleConfirm}
      width={800}
      okText="确认选择"
      cancelText="取消"
      okButtonProps={{ disabled: !tempSelectedEnumCode }}
      destroyOnHidden
    >
      {/* 搜索和视图切换 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Segmented
            options={[
              { label: '列表', value: 'list' },
              { label: '树形', value: 'tree' }
            ]}
            value={viewMode}
            onChange={(value) => setViewMode(value as 'list' | 'tree')}
          />
          <Input
            placeholder="搜索枚举代码、名称或描述"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
      </div>

      {/* 表格区域 */}
      <div style={{ height: 400, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={viewMode === 'list' ? filteredEnums : treeData}
          pagination={false}
          rowKey={viewMode === 'list' ? "id" : "value"}
          size="small"
          onRow={(record) => ({
            onClick: () => {
              const enumCode = viewMode === 'tree' ? record.enumInfo?.code : record.enumInfo?.code;
              if (enumCode) {
                handleEnumClick(enumCode);
              }
            },
            style: {
              cursor: 'pointer',
              backgroundColor: tempSelectedEnumCode === (viewMode === 'tree' ? record.enumInfo?.code : record.enumInfo?.code) 
                ? 'rgba(139, 69, 255, 0.1)' : undefined, // 半透明紫色背景
            }
          })}
          expandable={viewMode === 'tree' ? {
            childrenColumnName: "children",
            indentSize: 20
          } : undefined}
        />
      </div>
    </Modal>
  );
};

export default EnumSelectModal;