import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === 'production' ? '/admin/' : '/',
  server: {
    port: 3003,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/images': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'naive-ui': ['naive-ui'],
          'echarts': ['echarts', 'vue-echarts'],
          'vue-vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})