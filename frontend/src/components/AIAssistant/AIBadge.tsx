import React from 'react';
import { Badge, Tooltip } from 'antd';
import { 
  PlusCircleOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined,
  LinkOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

interface AIBadgeProps {
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
  color: string;
  icon?: string;
  onClick?: () => void;
}

const AIBadge: React.FC<AIBadgeProps> = ({ type, text, color, icon, onClick }) => {
  const getIcon = () => {
    if (icon) {
      switch (icon) {
        case 'plus-circle':
          return <PlusCircleOutlined />;
        case 'edit':
          return <EditOutlined />;
        case 'delete':
          return <DeleteOutlined />;
        case 'plus':
          return <PlusOutlined />;
        case 'link':
          return <LinkOutlined />;
        case 'warning':
          return <WarningOutlined />;
        case 'exclamation-circle':
          return <ExclamationCircleOutlined />;
        case 'analysis':
        case 'optimization':
        case 'info':
          return <InfoCircleOutlined />;
        default:
          return null;
      }
    }
    return null;
  };

  const badgeContent = (
    <Badge
      count={text}
      style={{
        backgroundColor: color,
        color: '#fff',
        fontSize: '12px',
        padding: '2px 8px',
        borderRadius: '4px',
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: 500,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        ...(onClick && {
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
          }
        })
      }}
      onClick={onClick}
    >
      {getIcon()}
    </Badge>
  );

  if (onClick) {
    return (
      <Tooltip title={`点击${text}`}>
        {badgeContent}
      </Tooltip>
    );
  }

  return badgeContent;
};

export default AIBadge;
