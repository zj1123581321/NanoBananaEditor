/**
 * 企业微信通知服务
 * 负责发送图片生成完成通知到企业微信群
 */

import { SavedImage } from './imageServerService';
import { AuthUser } from './authService';

export interface GenerationNotificationData {
  user: AuthUser;
  prompt: string;
  parameters: {
    temperature?: number;
    seed?: number;
    model?: string;
  };
  images: SavedImage[];
  processingTime: number;
  timestamp: number;
}

export interface WecomConfig {
  webhookUrl: string;
  enabled: boolean;
  retryAttempts: number;
  timeout: number;
}

/**
 * 企业微信通知服务类
 */
class NotificationService {
  private config: WecomConfig;

  constructor(config?: Partial<WecomConfig>) {
    this.config = {
      webhookUrl: config?.webhookUrl || this.getWebhookUrl(),
      enabled: config?.enabled !== false, // 默认启用
      retryAttempts: config?.retryAttempts || 3,
      timeout: config?.timeout || 5000
    };
  }

  /**
   * 获取企业微信Webhook URL
   */
  private getWebhookUrl(): string {
    // 优先从环境变量获取
    const envUrl = import.meta.env.VITE_WECOM_WEBHOOK_URL;
    if (envUrl) {
      return envUrl;
    }

    // 从localStorage获取（管理员配置）
    try {
      const storedUrl = localStorage.getItem('nano_banana_wecom_webhook');
      if (storedUrl) {
        return storedUrl;
      }
    } catch (error) {
      console.warn('无法从localStorage读取Webhook URL:', error);
    }

    return '';
  }

  /**
   * 发送图片生成完成通知
   */
  async notifyImageGeneration(data: GenerationNotificationData): Promise<void> {
    console.log('📢 notifyImageGeneration 被调用');
    console.log('🔧 通知配置状态:', {
      enabled: this.config.enabled
    });
    
    if (!this.config.enabled) {
      console.log('📵 企业微信通知已禁用，跳过发送');
      return;
    }

    try {
      console.log('📤 通过后端发送企微通知...');
      await this.sendNotificationViaBackend(data);
      console.log('✅ 企业微信通知发送成功');
    } catch (error) {
      console.error('❌ 企业微信通知发送失败:', error);
      throw error;
    }
  }

  /**
   * 构建通知消息（使用markdown_v2格式）
   */
  private buildNotificationMessage(data: GenerationNotificationData): any {
    const {
      user,
      prompt,
      parameters,
      images,
      processingTime,
      timestamp
    } = data;

    // 格式化时间
    const timeStr = new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 构建参数信息
    const paramInfo = [];
    if (parameters.model) paramInfo.push(`模型: \`${parameters.model}\``);
    if (parameters.temperature !== undefined) paramInfo.push(`温度: \`${parameters.temperature}\``);
    if (parameters.seed !== undefined) paramInfo.push(`种子: \`${parameters.seed}\``);

    // 构建图片链接列表
    const imageLinks = images.map((img, index) => 
      `![生成图片${index + 1}](${img.url})`
    ).join('\n\n');

    // 构建完整消息内容
    const content = `# 🎨 AI图片生成完成通知

## 👤 用户信息
- **用户名:** \`${user.username || user.email}\`
- **邮箱:** \`${user.email}\`
- **角色:** \`${user.role === 'admin' ? '管理员' : '用户'}\`
- **生成时间:** \`${timeStr}\`

## 💬 用户提示词
\`\`\`
${prompt}
\`\`\`

## ⚙️ 生成参数
${paramInfo.join('\n')}

## ⏱️ 处理结果
- **生成数量:** \`${images.length}张\`
- **处理耗时:** \`${(processingTime / 1000).toFixed(1)}秒\`
- **状态:** ✅ **成功**

## 🖼️ 生成结果

${imageLinks}

---
*🍌 Nano Banana AI Image Editor*`;

    return {
      msgtype: "markdown_v2",
      markdown_v2: {
        content: content
      }
    };
  }

  /**
   * 发送企业微信消息 (内部方法)
   */
  private async sendWecomMessageInternal(message: any): Promise<void> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`📤 发送企业微信通知 (第${attempt}次尝试)...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.errcode !== 0) {
          throw new Error(`企业微信API错误: ${result.errmsg || '未知错误'} (错误码: ${result.errcode})`);
        }

        const duration = Date.now() - startTime;
        console.log(`✅ 企业微信通知发送成功 (耗时: ${duration}ms)`);
        return;

      } catch (error) {
        console.warn(`❌ 第${attempt}次尝试失败:`, error);

        if (attempt === this.config.retryAttempts) {
          throw new Error(`企业微信通知发送失败 (已重试${this.config.retryAttempts}次): ${error instanceof Error ? error.message : '未知错误'}`);
        }

        // 指数退避延迟
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ ${delay}ms后进行第${attempt + 1}次重试...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * 测试通知发送
   */
  async testNotification(): Promise<void> {
    const testData: GenerationNotificationData = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        username: '测试用户',
        role: 'user'
      },
      prompt: '这是一条测试通知消息',
      parameters: {
        model: 'Gemini 2.5 Flash',
        temperature: 0.7,
        seed: 12345
      },
      images: [
        {
          id: 'test-1',
          fileName: 'test_image.png',
          url: 'https://via.placeholder.com/512x512.png?text=Test+Image',
          size: 1024000,
          mimeType: 'image/png',
          md5: 'test_md5_hash',
          createdAt: new Date().toISOString()
        }
      ],
      processingTime: 5000,
      timestamp: Date.now()
    };

    await this.notifyImageGeneration(testData);
  }

  /**
   * 发送简单文本通知
   */
  async sendTextNotification(text: string): Promise<void> {
    if (!this.config.enabled || !this.config.webhookUrl) {
      console.warn('企业微信通知未配置或已禁用');
      return;
    }

    const message = {
      msgtype: "text",
      text: {
        content: text
      }
    };

    await this.sendWecomMessageInternal(message);
  }

  /**
   * 直接发送企业微信消息 (公开方法)
   */
  async sendWecomMessage(message: any): Promise<void> {
    return this.sendWecomMessageInternal(message);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<WecomConfig>): void {
    this.config = { ...this.config, ...config };

    // 保存Webhook URL到localStorage
    if (config.webhookUrl) {
      try {
        localStorage.setItem('nano_banana_wecom_webhook', config.webhookUrl);
      } catch (error) {
        console.warn('保存Webhook URL失败:', error);
      }
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): WecomConfig {
    return { ...this.config };
  }

  /**
   * 启用/禁用通知
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`${enabled ? '✅ 启用' : '❌ 禁用'}企业微信通知`);
  }

  /**
   * 通过后端发送通知
   */
  private async sendNotificationViaBackend(data: GenerationNotificationData): Promise<void> {
    const imageServerUrl = import.meta.env.VITE_IMAGE_SERVER_URL || 'http://localhost:3002';
    const notifyUrl = `${imageServerUrl}/api/wecom/notify`;
    
    console.log('📤 发送通知请求到:', notifyUrl);
    
    const response = await fetch(notifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`后端通知服务错误: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(`后端通知失败: ${result.error || 'Unknown error'}`);
    }
  }

  /**
   * 检查配置是否有效
   */
  isConfigured(): boolean {
    // 现在只需要检查是否启用，企微配置在后端
    const configured = this.config.enabled;
    console.log('🔍 NotificationService.isConfigured():', {
      enabled: this.config.enabled,
      result: configured
    });
    return configured;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证Webhook URL格式
   */
  static validateWebhookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.protocol === 'https:' &&
        urlObj.hostname === 'qyapi.weixin.qq.com' &&
        urlObj.pathname === '/cgi-bin/webhook/send' &&
        urlObj.searchParams.has('key')
      );
    } catch {
      return false;
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

// 导出单例实例
export const notificationService = new NotificationService();
export default notificationService;