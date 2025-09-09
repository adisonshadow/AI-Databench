import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~/': path.resolve(__dirname, './src/'),
    }
  },
  server: {
    port: 3000,
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3001',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, '/api')
    //   }
    // }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'antd-vendor': ['antd', '@ant-design/pro-components'],
          'chart-vendor': ['@antv/g6'],
          'editor-vendor': ['@monaco-editor/react']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      '@ant-design/pro-components',
      '@antv/g6',
      'react-router-dom'
      // 'react-ai-model-manager'  // 暂时禁用
    ]
  }
})
