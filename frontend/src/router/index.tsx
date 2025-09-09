import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import Designer from '@/pages/Designer';
import ModelDesigner from '@/pages/ModelDesigner';
import Migration from '@/pages/Migration';
import ApiGenerator from '@/pages/ApiGenerator';
import Settings from '@/pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { 
        index: true, 
        element: <Projects /> // 项目管理作为首页
      },
      { 
        path: 'dashboard', 
        element: <Dashboard /> 
      },
      { 
        path: 'project/:projectId',
        element: <ModelDesigner /> // 模型设计页面，默认页面
      },
      {
        path: 'project/:projectId/migration',
        element: <Migration /> // 物化迁移页面
      },
      {
        path: 'project/:projectId/api',
        element: <ApiGenerator /> // 生成服务页面
      },
      { 
        path: 'settings', 
        element: <Settings /> 
      }
    ]
  }
]);