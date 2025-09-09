// 此文件已废弃，功能已拆分到单独的页面
// ModelDesigner: /src/pages/ModelDesigner/index.tsx
// Migration: /src/pages/Migration/index.tsx  
// ApiGenerator: /src/pages/ApiGenerator/index.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';

const Designer: React.FC = () => {
  // 重定向到模型设计页面
  return <Navigate to="/" replace />;
};

export default Designer;