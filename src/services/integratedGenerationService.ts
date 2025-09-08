/**
 * 集成的图片生成服务
 * 整合 Gemini 生成、图片保存、设备识别和企业微信通知功能
 */

import { GeminiService, GenerationRequest, EditRequest } from './geminiService';
import { deviceService, DeviceInfo } from './deviceService';
import { imageServerService, SavedImage } from './imageServerService';
import { notificationService, GenerationNotificationData } from './notificationService';

export interface IntegratedGenerationRequest extends GenerationRequest {
  enableNotification?: boolean;
  notificationTitle?: string;
}

export interface IntegratedEditRequest extends EditRequest {
  enableNotification?: boolean;
  notificationTitle?: string;
}

export interface GenerationResult {
  images: SavedImage[];
  deviceInfo: DeviceInfo;
  processingTime: number;
  timestamp: number;
  notificationSent: boolean;
}

/**
 * 集成生成服务类
 */
class IntegratedGenerationService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * 生成图片 - 完整流程（生成 + 保存 + 通知）
   */
  async generateImage(request: IntegratedGenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const timestamp = Date.now();
    
    console.log('🎨 开始图片生成流程...');

    try {
      // 1. 获取设备信息
      console.log('📱 获取设备信息...');
      const deviceInfo = await deviceService.getDeviceInfo();
      console.log(`✅ 设备信息: ${deviceInfo.localIP} (${deviceInfo.deviceId})`);

      // 2. 调用 Gemini 生成图片
      console.log('🤖 调用 AI 模型生成图片...');
      const base64Images = await this.geminiService.generateImage({
        prompt: request.prompt,
        referenceImages: request.referenceImages,
        temperature: request.temperature,
        seed: request.seed
      });
      console.log(`✅ AI 生成完成，获得 ${base64Images.length} 张图片`);

      // 3. 保存图片到HTTP服务器
      console.log('💾 保存图片到服务器...');
      const imageData = base64Images.map((base64, index) => ({
        data: `data:image/png;base64,${base64}`,
        name: `generated_${timestamp}_${index + 1}.png`
      }));

      const savedImages = await imageServerService.saveImages(imageData);
      console.log(`✅ 成功保存 ${savedImages.length} 张图片到服务器`);

      const processingTime = Date.now() - startTime;

      // 4. 发送企业微信通知 (如果启用)
      let notificationSent = false;
      if (request.enableNotification !== false && notificationService.isConfigured()) {
        try {
          console.log('📢 发送企业微信通知...');
          
          const notificationData: GenerationNotificationData = {
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

          await notificationService.notifyImageGeneration(notificationData);
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
        notificationSent
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
      // 1. 获取设备信息
      const deviceInfo = await deviceService.getDeviceInfo();

      // 2. 调用 Gemini 编辑图片
      const base64Images = await this.geminiService.editImage({
        instruction: request.instruction,
        originalImage: request.originalImage,
        referenceImages: request.referenceImages,
        maskImage: request.maskImage,
        temperature: request.temperature,
        seed: request.seed
      });

      // 3. 保存编辑结果
      const imageData = base64Images.map((base64, index) => ({
        data: `data:image/png;base64,${base64}`,
        name: `edited_${timestamp}_${index + 1}.png`
      }));

      const savedImages = await imageServerService.saveImages(imageData);
      const processingTime = Date.now() - startTime;

      // 4. 发送通知
      let notificationSent = false;
      if (request.enableNotification !== false && notificationService.isConfigured()) {
        try {
          const notificationData: GenerationNotificationData = {
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

          await notificationService.notifyImageGeneration(notificationData);
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
      status.imageServer = await imageServerService.healthCheck();
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
      imageServer: imageServerService.getConfig(),
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
      // 1. 测试设备服务
      console.log('1. 测试设备服务...');
      const deviceInfo = await deviceService.getDeviceInfo();
      console.log('✅ 设备服务正常:', deviceInfo.localIP);

      // 2. 测试图片服务器
      console.log('2. 测试图片服务器...');
      const serverHealth = await imageServerService.healthCheck();
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