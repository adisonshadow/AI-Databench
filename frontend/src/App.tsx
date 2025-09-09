import { RouterProvider } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { router } from './router'
import { darkTheme } from './config/theme'
import './App.css'

function App() {
  return (
    <ConfigProvider 
      locale={zhCN}
      theme={darkTheme}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}

export default App
