import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableLayoutProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface ResizableHandleProps {
  className?: string;
  style?: React.CSSProperties;
}

// Resizable Handle 组件
const ResizableHandle: React.FC<ResizableHandleProps> = ({
  className = '',
  style = {}
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<number>(0);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 500); // 500ms 延迟
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!isResizing) {
      setIsHovered(false);
    }
  }, [isResizing]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setIsHovered(true);
    startPosRef.current = e.clientX;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const delta = e.clientX - startPosRef.current;
    // 通过自定义事件传递拖拽信息，注意方向：向右拖拽应该是增加宽度
    const resizeEvent = new CustomEvent('resize', { 
      detail: { delta } 
    });
    window.dispatchEvent(resizeEvent);
    startPosRef.current = e.clientX;
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setIsHovered(false); // 拖拽结束后取消高亮
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`resizable-handle ${className}`}
      style={{
        width: '4px',
        backgroundColor: isHovered || isResizing ? '#1890ff' : 'transparent',
        cursor: 'col-resize',
        transition: 'background-color 0.2s ease',
        position: 'relative',
        flexShrink: 0,
        ...style
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      {/* 可拖拽区域 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-2px',
          right: '-2px',
          bottom: 0,
          zIndex: 1
        }}
      />
    </div>
  );
};

// Resizable Panel 组件
const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultSize = 300,
  minSize = 200,
  maxSize = 600,
  className = '',
  style = {}
}) => {
  const [size, setSize] = useState(defaultSize);

  useEffect(() => {
    const handleResize = (e: CustomEvent) => {
      const delta = e.detail.delta;
      // 向右拖拽时，侧边栏宽度应该减少（因为分界线向右移动）
      setSize(prev => Math.max(minSize, Math.min(maxSize, prev - delta)));
    };

    window.addEventListener('resize', handleResize as EventListener);
    return () => {
      window.removeEventListener('resize', handleResize as EventListener);
    };
  }, [minSize, maxSize]);

  return (
    <div
      className={`resizable-panel ${className}`}
      style={{
        width: size,
        minWidth: minSize,
        maxWidth: maxSize,
        flexShrink: 0,
        ...style
      }}
    >
      {children}
    </div>
  );
};

// 主 ResizableLayout 组件
const ResizableLayout: React.FC<ResizableLayoutProps> = ({
  children,
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`resizable-layout ${className}`}
      style={{
        display: 'flex',
        height: '100%',
        ...style
      }}
    >
      {children}
    </div>
  );
};

// 导出组件和类型
export { ResizableLayout, ResizablePanel, ResizableHandle };
export type { ResizableLayoutProps, ResizablePanelProps, ResizableHandleProps };
