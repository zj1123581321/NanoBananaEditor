/**
 * 集成的图片生成服务
 * 整合 Gemini 生成、图片保存、设备识别和企业微信通知功能
 * 支持单用户和多用户模式
 */

import { geminiServiceExtended, type GenerationRequest, type EditRequest } from './geminiServiceExtended';
import { imageServerServiceExtended, SavedImage } from './imageServerServiceExtended';
import { notificationService, GenerationNotificationData } from './notificationService';
import { authService, AuthUser } from './authService';
import { isFeatureEnabled } from '../config/app';
import { MODEL_CONFIG } from '../store/useAppStore';

export interface IntegratedGenerationRequest extends GenerationRequest {
  enableNotification?: boolean;
  notificationTitle?: string;
  projectId?: string;
}

export interface IntegratedEditRequest extends EditRequest {
  enableNotification?: boolean;
  notificationTitle?: string;
  projectId?: string;
}

export interface GenerationResult {
  images: SavedImage[];
  user: AuthUser;
  processingTime: number;
  timestamp: number;
  notificationSent: boolean;
  metadata?: {
    tokenUsed: number;
    modelVersion: string;
  };
}

/**
 * 集成生成服务类
 */
class IntegratedGenerationService {
  constructor() {
    // 使用扩展的服务，支持双模式
  }

  /**
   * 生成图片 - 完整流程（生成 + 保存 + 通知）
   */
  async generateImage(request: IntegratedGenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const timestamp = Date.now();
    
    console.log('🎨 开始图片生成流程...');

    try {
      // 1. 获取用户信息
      console.log('👤 获取用户信息...');
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('用户未登录');
      }
      console.log(`✅ 用户信息: ${currentUser.username} (${currentUser.email})`);

      // 2. 调用扩展的 Gemini 服务生成图片
      console.log('🤖 调用 AI 模型生成图片...');
      const result = await geminiServiceExtended.generateImage({
        prompt: request.prompt,
        referenceImages: request.referenceImages,
        temperature: request.temperature,
        seed: request.seed,
        projectId: request.projectId,
        model: request.model // 传递模型参数
      });
      
      // 检查生成结果是否有效
      if (!result || !result.images || result.images.length === 0) {
        console.error('❌ Gemini API 返回的图片数据为空:', result);
        throw new Error('AI 模型未能生成图片，请检查网络连接和 API 配置');
      }
      
      console.log(`✅ AI 生成完成，获得 ${result.images.length} 张图片`);

      // 3. 保存图片到HTTP服务器
      console.log('💾 保存图片到服务器...');
      const imageData = result.images.map((img, index) => ({
        data: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
        name: `generated_${timestamp}_${index + 1}.png`
      }));

      const savedImages = await imageServerServiceExtended.saveImages(imageData);
      console.log(`✅ 成功保存 ${savedImages.length} 张图片到服务器`);

      const processingTime = Date.now() - startTime;

      // 4. 发送企业微信通知 (如果启用)
      let notificationSent = false;
      if (request.enableNotification !== false && isFeatureEnabled('notifications')) {
        try {
          console.log('📢 发送企业微信通知...');
          
          const modelType = request.model || 'flash';
          const modelDisplayName = MODEL_CONFIG[modelType].displayName;
          const notificationData = {
            user: currentUser,
            prompt: request.prompt,
            parameters: {
              temperature: request.temperature,
              seed: request.seed,
              model: `Gemini ${modelDisplayName}`
            },
            images: savedImages,
            processingTime,
            timestamp: new Date().toISOString()
          };

          await imageServerServiceExtended.sendWecomNotification(notificationData);
          notificationSent = true;
          console.log('✅ 企业微信通知发送成功');
        } catch (error) {
          console.warn('⚠️ 企业微信通知发送失败，但不影响主流程:', error);
        }
      } else {
        console.log('📵 企业微信通知已禁用或未配置');
      }

      console.log(`🎉 图片生成流程完成！耗时: ${processingTime}ms`);

      return {
        images: savedImages,
        user: currentUser,
        processingTime,
        timestamp,
        notificationSent,
        metadata: {
          tokenUsed: result.metadata.tokenUsed || this.estimateTokens(request.prompt),
          modelVersion: 'Gemini 2.5 Flash Image'
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ 图片生成流程失败 (耗时: ${processingTime}ms):`, error);
      
      // 发送错误通知 (如果可能)
      if (request.enableNotification !== false && notificationService.isConfigured()) {
        try {
          await this.sendErrorNotification(request.prompt, error as Error);
        } catch (notifyError) {
          console.warn('发送错误通知失败:', notifyError);
        }
      }
      
      throw error;
    }
  }

  /**
   * 编辑图片 - 完整流程
   */
  async editImage(request: IntegratedEditRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const timestamp = Date.now();
    
    console.log('✏️ 开始图片编辑流程...');

    try {
      // 1. 获取用户信息
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      // 2. 调用 Gemini 编辑图片
      const result = await geminiServiceExtended.editImage({
        instruction: request.instruction,
        originalImage: request.originalImage,
        referenceImages: request.referenceImages,
        maskImage: request.maskImage,
        temperature: request.temperature,
        seed: request.seed,
        model: request.model // 传递模型参数
      });

      // 检查编辑结果是否有效
      if (!result || !result.images || result.images.length === 0) {
        console.error('❌ Gemini API 返回的编辑图片数据为空:', result);
        throw new Error('AI 模型未能编辑图片，请检查网络连接和 API 配置');
      }

      // 3. 保存编辑结果
      const imageData = result.images.map((base64, index) => ({
        data: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
        name: `edited_${timestamp}_${index + 1}.png`
      }));

      const savedImages = await imageServerServiceExtended.saveImages(imageData);
      const processingTime = Date.now() - startTime;

      // 4. 发送通知
      let notificationSent = false;
      if (request.enableNotification !== false && notificationService.isConfigured()) {
        try {
          const modelType = request.model || 'flash';
          const modelDisplayName = MODEL_CONFIG[modelType].displayName;
          const notificationData: GenerationNotificationData = {
            user: currentUser,
            prompt: `[图片编辑] ${request.instruction}`,
            parameters: {
              temperature: request.temperature,
              seed: request.seed,
              model: `Gemini ${modelDisplayName} (Edit)`
            },
            images: savedImages,
            processingTime,
            timestamp
          };

          await notificationService.notifyImageGeneration(notificationData);
          notificationSent = true;
        } catch (error) {
          console.warn('企业微信通知发送失败:', error);
        }
      }

      console.log(`✅ 图片编辑流程完成！耗时: ${processingTime}ms`);

      return {
        images: savedImages,
        user: currentUser,
        processingTime,
        timestamp,
        notificationSent
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ 图片编辑流程失败 (耗时: ${processingTime}ms):`, error);
      throw error;
    }
  }

  /**
   * 发送错误通知
   */
  private async sendErrorNotification(prompt: string, error: Error): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      const timeStr = new Date().toLocaleString('zh-CN');

      const errorMessage = `# ❌ AI图片生成失败

## 👤 用户信息
- **用户名:** \`${currentUser?.username || 'Unknown'}\`
- **邮箱:** \`${currentUser?.email || 'Unknown'}\`
- **角色:** \`${currentUser?.role === 'admin' ? '管理员' : '用户'}\`
- **时间:** \`${timeStr}\`

## 💬 用户提示词
\`\`\`
${prompt}
\`\`\`

## ⚠️ 错误信息
\`\`\`
${error.message}
\`\`\`

---
*🍌 Nano Banana AI Image Editor - 错误通知*`;

      await notificationService.sendWecomMessage({
        msgtype: "markdown_v2",
        markdown_v2: {
          content: errorMessage
        }
      });

    } catch (notifyError) {
      console.error('发送错误通知失败:', notifyError);
    }
  }

  /**
   * 检查所有服务状态
   */
  async checkServicesStatus(): Promise<{
    imageServer: boolean;
    notification: boolean;
    device: boolean;
  }> {
    const status = {
      imageServer: false,
      notification: false,
      device: false
    };

    try {
      status.imageServer = await imageServerServiceExtended.healthCheck();
    } catch (error) {
      console.warn('图片服务器健康检查失败:', error);
    }

    try {
      status.notification = notificationService.isConfigured();
    } catch (error) {
      console.warn('通知服务检查失败:', error);
    }

    try {
      await deviceService.getDeviceInfo();
      status.device = true;
    } catch (error) {
      console.warn('设备服务检查失败:', error);
    }

    return status;
  }

  /**
   * 获取配置信息
   */
  getConfiguration() {
    return {
      imageServer: imageServerServiceExtended.getConfig(),
      notification: notificationService.getConfig(),
      device: 'Device service configured'
    };
  }

  /**
   * 测试完整流程
   */
  async testIntegration(): Promise<void> {
    console.log('🧪 开始集成测试...');

    try {
      // 1. 测试用户认证服务
      console.log('1. 测试用户认证服务...');
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('用户未登录');
      }
      console.log('✅ 用户认证服务正常:', currentUser.username);

      // 2. 测试图片服务器
      console.log('2. 测试图片服务器...');
      const serverHealth = await imageServerServiceExtended.healthCheck();
      console.log('✅ 图片服务器状态:', serverHealth ? '正常' : '异常');

      // 3. 测试通知服务
      console.log('3. 测试通知服务...');
      if (notificationService.isConfigured()) {
        await notificationService.testNotification();
        console.log('✅ 通知服务测试完成');
      } else {
        console.log('⚠️ 通知服务未配置');
      }

      console.log('🎉 集成测试完成！');

    } catch (error) {
      console.error('❌ 集成测试失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const integratedGenerationService = new IntegratedGenerationService();
export default integratedGenerationService;