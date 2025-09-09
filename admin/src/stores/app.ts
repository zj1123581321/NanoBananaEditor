/**
 * 应用全局状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 主题状态
  const isDark = ref(false)
  
  // 侧边栏状态
  const sidebarCollapsed = ref(false)
  
  // 加载状态
  const isLoading = ref(false)
  
  // 系统配置
  const config = ref({
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002',
    appName: 'Nano Banana AI Image Editor',
    version: '1.0.0'
  })
  
  /**
   * 切换主题
   */
  const toggleTheme = () => {
    isDark.value = !isDark.value
    localStorage.setItem('admin_theme', isDark.value ? 'dark' : 'light')
  }
  
  /**
   * 切换侧边栏状态
   */
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('admin_sidebar_collapsed', sidebarCollapsed.value.toString())
  }
  
  /**
   * 设置加载状态
   */
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }
  
  /**
   * 初始化应用状态
   */
  const initializeApp = () => {
    // 恢复主题设置
    const savedTheme = localStorage.getItem('admin_theme')
    if (savedTheme) {
      isDark.value = savedTheme === 'dark'
    }
    
    // 恢复侧边栏状态
    const savedSidebar = localStorage.getItem('admin_sidebar_collapsed')
    if (savedSidebar) {
      sidebarCollapsed.value = savedSidebar === 'true'
    }
  }
  
  return {
    isDark,
    sidebarCollapsed,
    isLoading,
    config,
    toggleTheme,
    toggleSidebar,
    setLoading,
    initializeApp
  }
})