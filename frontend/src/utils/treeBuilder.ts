export interface TreeNode {
  value: string;
  label: string;
  children?: TreeNode[];
  id?: string;
  isActive: boolean;
  description?: string;
  [key: string]: any;
}

export interface TreeBuilderConfig {
  /** 用于获取节点标签的函数 */
  getLabel: (item: any, part: string, isLeaf: boolean) => string;
  /** 用于构建节点额外属性的函数 */
  buildExtraProps: (item: any, path: string, isLeaf: boolean) => Record<string, any>;
  /** 用于判断节点是否激活的函数 */
  getIsActive?: (item: any, isLeaf: boolean) => boolean;
}

export const buildTree = <T extends { code: string }>(
  items: T[],
  config: TreeBuilderConfig
): TreeNode[] => {
  const treeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // 首先，将所有项转换为树节点
  items.forEach((item:any) => {
    if (!item.code) return; // 跳过无效数据
    
    const parts = item.code.split(':');
    let currentPath = '';
    
    // 为每一级创建节点
    parts.forEach((part:any, index:any) => {
      const path = index === 0 ? part : `${currentPath}:${part}`;
      currentPath = path;
      
      if (!treeMap.has(path)) {
        const isLeaf = index === parts.length - 1;
        const matchedItem = isLeaf ? item : items.find(e => e.code === path);
        
        const node: TreeNode = {
          value: path,
          key: path, // 添加key属性
          label: config.getLabel(matchedItem, part, isLeaf),
          children: [],
          id: isLeaf ? `${item.id}` : `temp_${path}`,
          isActive: config.getIsActive ? config.getIsActive(matchedItem, isLeaf) : true,
          description: isLeaf ? matchedItem?.description : undefined,
          ...config.buildExtraProps(matchedItem, path, isLeaf)
        };

        treeMap.set(path, node);
        
        if (index === 0) {
          rootNodes.push(node);
        } else {
          const parentPath = parts.slice(0, index).join(':');
          const parentNode = treeMap.get(parentPath);
          if (parentNode) {
            if (!parentNode.children) {
              parentNode.children = [];
            }
            parentNode.children.push(node);
          }
        }
      }
    });
  });

  // 清理没有子节点的 children 数组
  const cleanupEmptyChildren = (nodes: TreeNode[]) => {
    nodes.forEach(node => {
      if (node.children && node.children.length === 0) {
        delete node.children;
      } else if (node.children) {
        cleanupEmptyChildren(node.children);
      }
    });
  };
  
  cleanupEmptyChildren(rootNodes);
  return rootNodes;
};

// 实体树构建配置（基于ADB-TypeORM的实体）
interface EntityForTree {
  id: string;
  code: string;
  label?: string;
  description?: string;
  status?: 'enabled' | 'disabled' | 'archived';
}

export const entityTreeConfig: TreeBuilderConfig = {
  getLabel: (item: EntityForTree, part: string, isLeaf: boolean) => {
    if (isLeaf && item) {
      return `${item.label || part}`;
    }
    return part;
  },
  buildExtraProps: (item: EntityForTree, path: string, isLeaf: boolean) => ({
    entityId: isLeaf ? item?.id : undefined,
    type: isLeaf ? 'entity' : 'folder',
    status: isLeaf ? item?.status : undefined,
    rawEntity: isLeaf ? item : undefined
  }),
  getIsActive: (item: EntityForTree, isLeaf: boolean) => {
    if (isLeaf && item) {
      return item.status === 'enabled';
    }
    return true;
  }
};

// 枚举树构建配置
interface Enum {
  id: string;
  code: string;
  description?: string;
  isActive?: boolean;
  options?: Array<{
    value: string;
    label: string;
    description?: string;
    order?: number;
  }>;
}

export const enumTreeConfig: TreeBuilderConfig = {
  getLabel: (item: Enum, part: string, isLeaf: boolean) => {
    return isLeaf ? `${part}（${item?.description || ''}）` : part;
  },
  buildExtraProps: (item: Enum, path: string, isLeaf: boolean) => ({
    options: isLeaf ? item?.options : undefined,
    rawEnum: isLeaf ? item : undefined
  }),
  getIsActive: (item: Enum, isLeaf: boolean) => isLeaf ? !!item?.isActive : true
};

// 表结构树构建配置
interface DataStructure {
  id: string;
  code: string;
  description?: string;
  isActive?: boolean;
  fields?: any[];
}

export const schemaTreeConfig: TreeBuilderConfig = {
  getLabel: (item: DataStructure, part: string, isLeaf: boolean) => {
    return isLeaf ? `${part}（${item?.description || ''}）` : part;
  },
  buildExtraProps: (item: DataStructure, path: string, isLeaf: boolean) => ({
    rawSchema: isLeaf ? item : undefined,
    fields: isLeaf ? item?.fields : undefined
  }),
  getIsActive: (item: DataStructure, isLeaf: boolean) => isLeaf ? !!item?.isActive : true
};