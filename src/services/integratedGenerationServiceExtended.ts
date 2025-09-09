/**
 * 扩展的集成图片生成服务
 * 整合 Gemini 生成、图片保存、设备识别和企业微信通知功能
 * 支持单用户和多用户模式
 */

import { geminiServiceExtended, type GenerationRequest, type EditRequest } from './geminiServiceExtended';
import { deviceService, DeviceInfo } from './deviceService';
import { imageServerServiceExtended, SavedImage } from './imageServerServiceExtended';
import { isFeatureEnabled } from '../config/app';

export interface IntegratedGenerationRequest extends GenerationRequest {
  enableNotification?: boolean;
  notificationTitle?: string;
}

export interface IntegratedEditRequest extends EditRequest {
  enableNotification?: boolean;
  notificationTitle?: string;
}

export interface IntegratedGenerationResult {
  images: SavedImage[];
  deviceInfo: DeviceInfo;
  processingTime: number;
  timestamp: string;
  notificationSent: boolean;
  metadata?: {
    tokenUsed: number;
    modelVersion: string;
  };
}

/**
 * 扩展的集成生成服务类
 */
class IntegratedGenerationServiceExtended {
  /**
   * 生成图片 - 完整流程（生成 + 保存 + 通知）
   */
  async generateImage(request: IntegratedGenerationRequest): Promise<IntegratedGenerationResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log('🎨 开始集成图片生成流程...');
    console.log('💬 提示词:', request.prompt.substring(0, 100) + '...');

    try {
      // 1. 获取设备信息
      console.log('📱 获取设备信息...');
      const deviceInfo = await deviceService.getDeviceInfo();
      console.log(`✅ 设备信息: ${deviceInfo.localIP} (${deviceInfo.deviceId})`);

      // 2. 调用扩展的 Gemini 服务生成图片
      console.log('🤖 调用 AI 模型生成图片...');
      const result = await geminiServiceExtended.generateImage({
        prompt: request.prompt,
        referenceImages: request.referenceImages,
        temperature: request.temperature,
        seed: request.seed,
        projectId: request.projectId
      });
      console.log(`✅ AI 生成完成，获得 ${result.images.length} 张图片`);

      // 3. 保存图片到HTTP服务器
      console.log('💾 保存图片到服务器...');
      const imageData = result.images.map((img, index) => ({
        data: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
        name: `generated_${Date.now()}_${index + 1}.png`
      }));

      const savedImages = await imageServerServiceExtended.saveImages(imageData);
      console.log(`✅ 成功保存 ${savedImages.length} 张图片到服务器`);

      const processingTime = Date.now() - startTime;

      // 4. 发送企业微信通知 (如果启用)
      let notificationSent = false;
      if (request.enableNotification !== false && isFeatureEnabled('notifications')) {
        try {
          console.log('📢 发送企业微信通知...');
          
          const notificationData = {
            deviceInfo,
            prompt: request.prompt,
            parameters: {
              temperature: request.temperature,
              seed: request.seed,
              model: 'Gemini 2.5 Flash Image'
            },
            images: savedImages,
            processingTime,
            timestamp
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
        deviceInfo,
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
      if (request.enableNotification !== false && isFeatureEnabled('notifications')) {
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
  async editImage(request: IntegratedEditRequest): Promise<IntegratedGenerationResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log('✏️ 开始图片编辑流程...');
    console.log('💬 编辑指令:', request.instruction.substring(0, 100) + '...');

    try {
      // 1. 获取设备信息
      console.log('📱 获取设备信息...');
      const deviceInfo = await deviceService.getDeviceInfo();

      // 2. 调用扩展的 Gemini 服务编辑图片
      console.log('🤖 调用 AI 模型编辑图片...');
      const result = await geminiServiceExtended.editImage({
        instruction: request.instruction,
        originalImage: request.originalImage,
        referenceImages: request.referenceImages,
        maskImage: request.maskImage,
        temperature: request.temperature,
        seed: request.seed,
        projectId: request.projectId
      });
      console.log(`✅ AI 编辑完成，获得 ${result.images.length} 张图片`);

      // 3. 保存编辑结果
      console.log('💾 保存图片到服务器...');
      const imageData = result.images.map((img, index) => ({
        data: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
        name: `edited_${Date.now()}_${index + 1}.png`
      }));

      const savedImages = await imageServerServiceExtended.saveImages(imageData);
      const processingTime = Date.now() - startTime;

      // 4. 发送通知
      let notificationSent = false;
      if (request.enableNotification !== false && isFeatureEnabled('notifications')) {
        try {
          const notificationData = {
            deviceInfo,
            prompt: `[图片编辑] ${request.instruction}`,
            parameters: {
              temperature: request.temperature,
              seed: request.seed,
              model: 'Gemini 2.5 Flash Image (Edit)'
            },
            images: savedImages,
            processingTime,
            timestamp
          };

          await imageServerServiceExtended.sendWecomNotification(notificationData);
          notificationSent = true;
        } catch (error) {
          console.warn('企业微信通知发送失败:', error);
        }
      }

      console.log(`✅ 图片编辑流程完成！耗时: ${processingTime}ms`);

      return {
        images: savedImages,
        deviceInfo,
        processingTime,
        timestamp,
        notificationSent,
        metadata: {
          tokenUsed: result.metadata.tokenUsed || this.estimateTokens(request.instruction),
          modelVersion: 'Gemini 2.5 Flash Image'
        }
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
      const deviceInfo = await deviceService.getDeviceInfo();
      const timeStr = new Date().toLocaleString('zh-CN');

      const errorMessage = `# ❌ AI图片生成失败

## 📱 设备信息
- **IP地址:** \`${deviceInfo.localIP}\`
- **设备ID:** \`${deviceInfo.deviceId}\`
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

      await imageServerServiceExtended.sendWecomNotification({
        deviceInfo,
        prompt: `[错误] ${prompt}`,
        parameters: { error: error.message },
        images: [],
        processingTime: 0,
        timestamp: new Date().toISOString()
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
    auth: boolean;
    details?: any;
  }> {
    const status = {
      imageServer: false,
      notification: false,
      device: false,
      auth: false,
      details: undefined
    };

    try {
      const healthResult = await imageServerServiceExtended.healthCheck();
      status.imageServer = healthResult.status;
      status.details = healthResult.details;
    } catch (error) {
      console.warn('图片服务器健康检查失败:', error);
    }

    try {
      status.notification = isFeatureEnabled('notifications');
    } catch (error) {
      console.warn('通知服务检查失败:', error);
    }

    try {
      await deviceService.getDeviceInfo();
      status.device = true;
    } catch (error) {
      console.warn('设备服务检查失败:', error);
    }

    try {
      status.auth = isFeatureEnabled('auth');
    } catch (error) {
      console.warn('认证服务检查失败:', error);
    }

    return status;
  }

  /**
   * 获取配置信息
   */
  getConfiguration() {
    return {
      imageServer: imageServerServiceExtended.getConfig(),
      features: {
        auth: isFeatureEnabled('auth'),
        notifications: isFeatureEnabled('notifications'),
        statistics: isFeatureEnabled('statistics'),
        multiUser: isFeatureEnabled('multiUser')
      }
    };
  }

  /**
   * 测试完整流程
   */
  async testIntegration(): Promise<void> {
    console.log('🧪 开始集成测试...');

    try {
      // 1. 测试设备服务
      console.log('1. 测试设备服务...');
      const deviceInfo = await deviceService.getDeviceInfo();
      console.log('✅ 设备服务正常:', deviceInfo.localIP);

      // 2. 测试图片服务器
      console.log('2. 测试图片服务器...');
      const healthResult = await imageServerServiceExtended.healthCheck();
      console.log('✅ 图片服务器状态:', healthResult.status ? '正常' : '异常');
      if (healthResult.details) {
        console.log('  服务器信息:', healthResult.details);
      }

      // 3. 测试通知服务
      console.log('3. 测试通知服务...');
      if (isFeatureEnabled('notifications')) {
        console.log('✅ 通知服务已启用');
      } else {
        console.log('⚠️ 通知服务未启用');
      }

      // 4. 测试认证服务
      console.log('4. 测试认证服务...');
      if (isFeatureEnabled('auth')) {
        console.log('✅ 认证服务已启用');
      } else {
        console.log('ℹ️ 单用户模式运行');
      }

      console.log('🎉 集成测试完成！');

    } catch (error) {
      console.error('❌ 集成测试失败:', error);
      throw error;
    }
  }

  /**
   * 估算 Token 使用量
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * 获取使用统计 (多用户模式)
   */
  async getUsageStats(startDate?: string, endDate?: string): Promise<any> {
    if (!isFeatureEnabled('statistics')) {
      return { message: '统计功能未启用' };
    }

    try {
      return await geminiServiceExtended.getUsageStats(startDate, endDate);
    } catch (error) {
      console.error('获取使用统计失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const integratedGenerationServiceExtended = new IntegratedGenerationServiceExtended();

// 为了向后兼容，也导出为 integratedGenerationService
export const integratedGenerationService = integratedGenerationServiceExtended;
export default integratedGenerationServiceExtended;