/**
 * 管理员认证状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminApi } from '../services/api'

interface AdminUser {
  id: string
  username: string
  role: string
  loginTime?: string
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<AdminUser | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)
  
  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  
  /**
   * 管理员登录
   */
  const login = async (credentials: { username: string; password: string }) => {
    isLoading.value = true
    
    try {
      const response = await adminApi.login(credentials)
      
      if (response.success) {
        token.value = response.data.token
        user.value = response.data.user
        
        // 保存到 localStorage
        localStorage.setItem('admin_token', response.data.token)
        localStorage.setItem('admin_user', JSON.stringify(response.data.user))
        
        return { success: true }
      } else {
        return { success: false, error: response.error || '登录失败' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: '网络错误，请稍后重试' }
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 退出登录
   */
  const logout = () => {
    user.value = null
    token.value = null
    
    // 清除本地存储
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }
  
  /**
   * 验证 token 有效性
   */
  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await adminApi.verifyToken(tokenToVerify)
      
      if (response.success) {
        token.value = tokenToVerify
        user.value = response.data.user
        return true
      } else {
        logout()
        return false
      }
    } catch (error) {
      console.error('Token verification error:', error)
      logout()
      return false
    }
  }
  
  /**
   * 刷新用户信息
   */
  const refreshUser = async () => {
    if (!token.value) return false
    
    try {
      const response = await adminApi.getProfile()
      
      if (response.success) {
        user.value = response.data
        localStorage.setItem('admin_user', JSON.stringify(response.data))
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Refresh user error:', error)
      return false
    }
  }
  
  /**
   * 修改密码
   */
  const changePassword = async (passwords: { currentPassword: string; newPassword: string }) => {
    try {
      const response = await adminApi.changePassword(passwords)
      return response
    } catch (error) {
      console.error('Change password error:', error)
      return { success: false, error: '网络错误，请稍后重试' }
    }
  }
  
  /**
   * 初始化认证状态
   */
  const initializeAuth = async () => {
    const savedToken = localStorage.getItem('admin_token')
    const savedUser = localStorage.getItem('admin_user')
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        
        // 验证 token 是否仍然有效
        const isValid = await verifyToken(savedToken)
        
        if (isValid) {
          user.value = userData
        }
      } catch (error) {
        console.error('Initialize auth error:', error)
        logout()
      }
    }
  }
  
  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    verifyToken,
    refreshUser,
    changePassword,
    initializeAuth
  }
})