import React from 'react';
import { Alert, Card, Empty } from 'antd';
import { Typography } from 'antd';

const { Text } = Typography;

const Migration: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Alert 
        message="功能简化通知"
        description="根据项目重构要求，数据库物化功能已被简化。所有数据使用localStorage存储。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="物化迁移功能已简化"
        >
          <Text type="secondary">
            数据存储使用localStorage，不需要数据库连接
          </Text>
        </Empty>
      </Card>
    </div>
  );
};

export default Migration;