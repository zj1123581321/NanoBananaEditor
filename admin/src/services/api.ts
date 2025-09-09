/**
 * 管理后台 API 服务
 */

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class AdminApiService {
  private baseUrl: string
  private token: string | null = null
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002'
  }
  
  /**
   * 设置认证 token
   */
  setToken(token: string) {
    this.token = token
  }
  
  /**
   * 获取请求头
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    
    return headers
  }
  
  /**
   * 发起 API 请求
   */
  private async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: this.getHeaders(),
        ...options,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
        }
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('API request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败'
      }
    }
  }
  
  // ========== 认证相关 ==========
  
  /**
   * 管理员登录
   */
  async login(credentials: { username: string; password: string }): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await this.request('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    
    if (response.success && response.data?.token) {
      this.setToken(response.data.token)
    }
    
    return response
  }
  
  /**
   * 验证 token
   */
  async verifyToken(token: string): Promise<ApiResponse<{ user: any }>> {
    this.setToken(token)
    return this.request('/api/admin/auth/verify', {
      method: 'POST'
    })
  }
  
  /**
   * 获取管理员信息
   */
  async getProfile(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/auth/me')
  }
  
  /**
   * 修改密码
   */
  async changePassword(passwords: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
    return this.request('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    })
  }
  
  // ========== 用户管理 ==========
  
  /**
   * 获取用户列表
   */
  async getUsers(params: PaginationParams = {}): Promise<ApiResponse<{ users: any[]; total: number }>> {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    
    const queryString = queryParams.toString()
    return this.request(`/api/admin/users${queryString ? `?${queryString}` : ''}`)
  }
  
  /**
   * 创建用户
   */
  async createUser(userData: { email: string; password: string; metadata?: any }): Promise<ApiResponse<any>> {
    return this.request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }
  
  /**
   * 更新用户
   */
  async updateUser(userId: string, userData: { email?: string; metadata?: any }): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }
  
  /**
   * 删除用户
   */
  async deleteUser(userId: string): Promise<ApiResponse> {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    })
  }
  
  /**
   * 重置用户密码
   */
  async resetUserPassword(userId: string): Promise<ApiResponse<{ temporaryPassword: string }>> {
    return this.request(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
    })
  }
  
  // ========== 统计数据 ==========
  
  /**
   * 获取系统概览统计
   */
  async getOverviewStats(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/stats/overview')
  }
  
  /**
   * 获取使用统计
   */
  async getUsageStats(params: { 
    startDate?: string; 
    endDate?: string; 
    userId?: string;
    groupBy?: 'day' | 'week' | 'month';
  } = {}): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams()
    
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.groupBy) queryParams.append('groupBy', params.groupBy)
    
    const queryString = queryParams.toString()
    return this.request(`/api/admin/stats/usage${queryString ? `?${queryString}` : ''}`)
  }
  
  /**
   * 获取 token 使用统计
   */
  async getTokenStats(params: { 
    startDate?: string; 
    endDate?: string; 
    userId?: string;
  } = {}): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams()
    
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.userId) queryParams.append('userId', params.userId)
    
    const queryString = queryParams.toString()
    return this.request(`/api/admin/stats/tokens${queryString ? `?${queryString}` : ''}`)
  }
  
  // ========== 操作日志 ==========
  
  /**
   * 获取操作日志
   */
  async getLogs(params: PaginationParams & { 
    userId?: string; 
    action?: string; 
    startDate?: string; 
    endDate?: string; 
  } = {}): Promise<ApiResponse<{ logs: any[]; total: number }>> {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.action) queryParams.append('action', params.action)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    
    const queryString = queryParams.toString()
    return this.request(`/api/admin/logs${queryString ? `?${queryString}` : ''}`)
  }
  
  // ========== 系统设置 ==========
  
  /**
   * 获取系统配置
   */
  async getSystemConfig(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/config')
  }
  
  /**
   * 更新系统配置
   */
  async updateSystemConfig(config: any): Promise<ApiResponse> {
    return this.request('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    })
  }
  
  /**
   * 系统健康检查
   */
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/health')
  }
}

// 创建单例实例
export const adminApi = new AdminApiService()

// 设置 token 的便捷方法
export const setApiToken = (token: string) => {
  adminApi.setToken(token)
}