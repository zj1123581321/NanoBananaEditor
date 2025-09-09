/**
 * 扩展的图片服务器前端接口服务
 * 支持用户认证和多用户模式
 */
import { getBackendUrl, isMultiUserMode } from '../config/app';
import { authService, type AuthUser } from './authService';

export interface SavedImage {
  id: string;
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
  md5: string;
  createdAt: string;
  error?: string;
}

export interface SaveImagesResponse {
  success: boolean;
  count: number;
  images: SavedImage[];
  metadata?: {
    processingTime: number;
    timestamp: string;
  };
}

export interface ImageListResponse {
  success: boolean;
  data: SavedImage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ImageServerConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

class ImageServerServiceExtended {
  private config: ImageServerConfig;

  constructor(config?: Partial<ImageServerConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || getBackendUrl(),
      timeout: config?.timeout || 15000, // 增加超时时间
      retryAttempts: config?.retryAttempts || 3
    };
  }

  /**
   * 获取认证头部
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isMultiUserMode()) {
      const token = await authService.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * 检查图片服务器健康状态
   */
  async healthCheck(): Promise<{ status: boolean; details?: any }> {
    try {
      const response = await this.fetchWithTimeout('/health');
      const data = await response.json();
      
      return {
        status: data.status === 'ok',
        details: data
      };
    } catch (error) {
      console.warn('图片服务器健康检查失败:', error);
      return { status: false };
    }
  }

  /**
   * 保存多张图片到服务器
   */
  async saveImages(images: Array<{ data: string; name?: string }>): Promise<SavedImage[]> {
    if (!images || images.length === 0) {
      throw new Error('没有提供图片数据');
    }

    try {
      console.log(`📤 准备保存 ${images.length} 张图片到服务器...`);

      const headers = await this.getAuthHeaders();
      
      const response = await this.fetchWithTimeout('/api/images', {
        method: 'POST',
        headers,
        body: JSON.stringify({ images })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result: SaveImagesResponse = await response.json();
      
      if (!result.success) {
        throw new Error('服务器返回保存失败');
      }

      const successCount = result.images.filter(img => !img.error).length;
      console.log(`✅ 成功保存 ${successCount}/${images.length} 张图片`);

      // 记录保存失败的图片
      const failedImages = result.images.filter(img => img.error);
      if (failedImages.length > 0) {
        console.error('部分图片保存失败:', failedImages);
      }

      return result.images.filter(img => !img.error) as SavedImage[];

    } catch (error) {
      console.error('保存图片失败:', error);
      throw new Error(`保存图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 保存单张图片
   */
  async saveImage(imageData: string, fileName?: string): Promise<SavedImage> {
    const images = await this.saveImages([{ data: imageData, name: fileName }]);
    
    if (images.length === 0) {
      throw new Error('图片保存失败');
    }
    
    return images[0];
  }

  /**
   * 获取图片列表（支持分页）
   */
  async getImageList(page: number = 1, limit: number = 50): Promise<ImageListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const headers = await this.getAuthHeaders();
      delete headers['Content-Type']; // GET 请求不需要

      const response = await this.fetchWithTimeout(`/api/images?${params}`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP错误: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('获取图片列表失败:', error);
      throw new Error(`获取图片列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取图片信息
   */
  async getImageInfo(fileName: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      delete headers['Content-Type']; // GET 请求不需要

      const response = await this.fetchWithTimeout(`/api/images/${fileName}/info`, {
        headers
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('图片不存在');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP错误: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('获取图片信息失败:', error);
      throw error;
    }
  }

  /**
   * 删除图片（需要认证）
   */
  async deleteImage(fileName: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      delete headers['Content-Type']; // DELETE 请求不需要

      const response = await this.fetchWithTimeout(`/api/images/${fileName}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('图片不存在');
        }
        if (response.status === 401) {
          throw new Error('需要登录');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP错误: ${response.status}`);
      }

      console.log(`🗑️ 删除图片成功: ${fileName}`);

    } catch (error) {
      console.error('删除图片失败:', error);
      throw error;
    }
  }

  /**
   * 发送企业微信通知
   */
  async sendWecomNotification(data: {
    user: AuthUser;
    prompt: string;
    parameters: any;
    images: SavedImage[];
    processingTime: number;
    timestamp: string;
  }): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.fetchWithTimeout('/api/wecom/notify', {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `通知发送失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '通知发送失败');
      }

      console.log('✅ 企业微信通知发送成功');

    } catch (error) {
      console.error('❌ 企业微信通知发送失败:', error);
      throw error;
    }
  }

  /**
   * 构造图片访问URL
   */
  getImageUrl(fileName: string): string {
    return `${this.config.baseUrl}/images/${fileName}`;
  }

  /**
   * 带超时和认证的fetch请求
   */
  private async fetchWithTimeout(
    url: string, 
    options?: RequestInit
  ): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`请求超时 (${this.config.timeout}ms)`);
      }
      
      throw error;
    }
  }

  /**
   * 重试机制的fetch
   */
  private async fetchWithRetry(
    url: string, 
    options?: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    try {
      return await this.fetchWithTimeout(url, options);
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        console.warn(`请求失败，第 ${attempt} 次重试:`, error);
        await this.delay(1000 * attempt); // 递增延迟
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ImageServerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): ImageServerConfig {
    return { ...this.config };
  }

  /**
   * 获取服务器状态和功能
   */
  async getServerInfo(): Promise<any> {
    try {
      const response = await this.fetchWithTimeout('/health');
      return await response.json();
    } catch (error) {
      console.error('获取服务器信息失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const imageServerServiceExtended = new ImageServerServiceExtended();

// 为了向后兼容，也导出为 imageServerService
export const imageServerService = imageServerServiceExtended;
export default imageServerServiceExtended;