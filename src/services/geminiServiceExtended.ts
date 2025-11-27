/**
 * 扩展的 Gemini 服务
 * 支持单用户和多用户模式，包含使用统计和通知功能
 */
import { GoogleGenAI } from '@google/genai';
import { appConfig, getBackendUrl, isMultiUserMode } from '../config/app';
import { authService } from './authService';

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[]; // base64 array
  temperature?: number;
  seed?: number;
  projectId?: string;
}

export interface EditRequest {
  instruction: string;
  originalImage: string; // base64
  referenceImages?: string[]; // base64 array
  maskImage?: string; // base64
  temperature?: number;
  seed?: number;
  projectId?: string;
}

export interface SegmentationRequest {
  image: string; // base64
  query: string; // "the object at pixel (x,y)" or "the red car"
}

export interface GenerationResult {
  images: string[];
  metadata: {
    tokenUsed: number;
    processingTime: number;
    timestamp: string;
  };
}

class GeminiServiceExtended {
  private directClient: GoogleGenAI | null = null;

  constructor() {
    // 单用户模式下初始化直接客户端
    if (!isMultiUserMode()) {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        this.directClient = new GoogleGenAI({ apiKey });
      }
    }
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
      
      // 添加会话ID用于跟踪
      headers['X-Session-ID'] = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return headers;
  }

  /**
   * 调用后端 API
   */
  private async callBackendAPI(endpoint: string, data: any): Promise<any> {
    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/api/gemini${endpoint}`;
    const headers = await this.getAuthHeaders();

    console.log('🚀 Gemini API 请求详情:', {
      backendUrl,
      fullUrl: url,
      endpoint,
      method: 'POST'
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API 请求失败: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 直接调用 Gemini API (单用户模式)
   */
  private async callDirectAPI(type: 'generate' | 'edit' | 'segment', request: any): Promise<string[]> {
    if (!this.directClient) {
      throw new Error('Gemini API 客户端未初始化');
    }

    switch (type) {
      case 'generate':
        return this.directGenerateImage(request);
      case 'edit':
        return this.directEditImage(request);
      case 'segment':
        return this.directSegmentImage(request);
      default:
        throw new Error(`不支持的操作类型: ${type}`);
    }
  }

  /**
   * 直接图像生成 (单用户模式)
   */
  private async directGenerateImage(request: GenerationRequest): Promise<string[]> {
    const contents: any[] = [{ text: request.prompt }];
    
    // 添加参考图像
    if (request.referenceImages && request.referenceImages.length > 0) {
      request.referenceImages.forEach(image => {
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: image,
          },
        });
      });
    }

    const response = await this.directClient!.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    });

    const images: string[] = [];
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        images.push(part.inlineData.data);
      }
    }

    return images;
  }

  /**
   * 直接图像编辑 (单用户模式)
   */
  private async directEditImage(request: EditRequest): Promise<string[]> {
    const contents = [
      { text: this.buildEditPrompt(request) },
      {
        inlineData: {
          mimeType: "image/png",
          data: request.originalImage,
        },
      },
    ];

    // 添加参考图像
    if (request.referenceImages && request.referenceImages.length > 0) {
      request.referenceImages.forEach(image => {
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: image,
          },
        });
      });
    }

    // 添加遮罩图像
    if (request.maskImage) {
      contents.push({
        inlineData: {
          mimeType: "image/png",
          data: request.maskImage,
        },
      });
    }

    const response = await this.directClient!.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    });

    const images: string[] = [];
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        images.push(part.inlineData.data);
      }
    }

    return images;
  }

  /**
   * 直接图像分割 (单用户模式)
   */
  private async directSegmentImage(request: SegmentationRequest): Promise<any> {
    const prompt = [
      { text: `Analyze this image and create a segmentation mask for: ${request.query}

Return a JSON object with this exact structure:
{
  "masks": [
    {
      "label": "description of the segmented object",
      "box_2d": [x, y, width, height],
      "mask": "base64-encoded binary mask image"
    }
  ]
}

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.` },
      {
        inlineData: {
          mimeType: "image/png",
          data: request.image,
        },
      },
    ];

    const response = await this.directClient!.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: prompt,
    });

    const responseText = response.candidates[0].content.parts[0].text;
    return JSON.parse(responseText);
  }

  /**
   * 生成图像
   */
  async generateImage(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      let images: string[];
      
      if (isMultiUserMode()) {
        // 多用户模式：通过后端 API
        const result = await this.callBackendAPI('/generate', {
          prompt: request.prompt,
          parameters: {
            temperature: request.temperature,
            seed: request.seed,
            referenceImages: request.referenceImages
          },
          projectId: request.projectId
        });
        
        console.log('🔍 后端 API 返回的完整数据:', JSON.stringify(result, null, 2));
        
        // 检查数据结构并尝试多种解析方式
        if (result.data && result.data.candidates && result.data.candidates[0] && result.data.candidates[0].content && result.data.candidates[0].content.parts) {
          images = result.data.candidates[0].content.parts
            .filter((part: any) => part.inlineData)
            .map((part: any) => part.inlineData.data);
          console.log('✅ 使用 result.data.candidates 路径解析到图片:', images.length, '张');
        } else if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
          // 尝试直接从 result 解析
          images = result.candidates[0].content.parts
            .filter((part: any) => part.inlineData)
            .map((part: any) => part.inlineData.data);
          console.log('✅ 使用 result.candidates 路径解析到图片:', images.length, '张');
        } else if (result.images && Array.isArray(result.images)) {
          // 如果后端直接返回 images 数组
          images = result.images;
          console.log('✅ 使用 result.images 路径解析到图片:', images.length, '张');
        } else {
          console.error('❌ 未能找到图片数据，尝试的路径都失败了');
          console.error('可用的字段:', Object.keys(result));
          images = [];
        }
        
        return {
          images,
          metadata: result.metadata
        };
      } else {
        // 单用户模式：直接调用 API
        images = await this.directGenerateImage(request);
        
        const processingTime = Date.now() - startTime;
        
        return {
          images,
          metadata: {
            tokenUsed: this.estimateTokens(request.prompt),
            processingTime,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error('图像生成失败:', error);
      throw new Error(error instanceof Error ? error.message : '图像生成失败');
    }
  }

  /**
   * 编辑图像
   */
  async editImage(request: EditRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      let images: string[];
      
      if (isMultiUserMode()) {
        // 多用户模式：通过后端 API
        const result = await this.callBackendAPI('/edit', {
          instruction: request.instruction,
          imageData: request.originalImage,
          maskData: request.maskImage,
          parameters: {
            temperature: request.temperature,
            seed: request.seed,
            referenceImages: request.referenceImages
          },
          projectId: request.projectId
        });
        
        console.log('🔍 编辑 API 返回的完整数据:', JSON.stringify(result, null, 2));
        
        // 检查数据结构并尝试多种解析方式
        if (result.data && result.data.candidates && result.data.candidates[0] && result.data.candidates[0].content && result.data.candidates[0].content.parts) {
          images = result.data.candidates[0].content.parts
            .filter((part: any) => part.inlineData)
            .map((part: any) => part.inlineData.data);
          console.log('✅ 使用 result.data.candidates 路径解析到编辑图片:', images.length, '张');
        } else if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
          images = result.candidates[0].content.parts
            .filter((part: any) => part.inlineData)
            .map((part: any) => part.inlineData.data);
          console.log('✅ 使用 result.candidates 路径解析到编辑图片:', images.length, '张');
        } else if (result.images && Array.isArray(result.images)) {
          images = result.images;
          console.log('✅ 使用 result.images 路径解析到编辑图片:', images.length, '张');
        } else {
          console.error('❌ 未能找到编辑图片数据，尝试的路径都失败了');
          console.error('可用的字段:', Object.keys(result));
          images = [];
        }
        
        return {
          images,
          metadata: result.metadata
        };
      } else {
        // 单用户模式：直接调用 API
        images = await this.directEditImage(request);
        
        const processingTime = Date.now() - startTime;
        
        return {
          images,
          metadata: {
            tokenUsed: this.estimateTokens(request.instruction),
            processingTime,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error('图像编辑失败:', error);
      throw new Error(error instanceof Error ? error.message : '图像编辑失败');
    }
  }

  /**
   * 分割图像
   */
  async segmentImage(request: SegmentationRequest): Promise<any> {
    try {
      if (isMultiUserMode()) {
        // 多用户模式暂不支持分割
        throw new Error('多用户模式下暂不支持图像分割功能');
      } else {
        // 单用户模式：直接调用 API
        return await this.directSegmentImage(request);
      }
    } catch (error) {
      console.error('图像分割失败:', error);
      throw new Error(error instanceof Error ? error.message : '图像分割失败');
    }
  }

  /**
   * 获取使用统计 (多用户模式)
   */
  async getUsageStats(startDate?: string, endDate?: string): Promise<any> {
    if (!isMultiUserMode()) {
      return { message: '单用户模式下无使用统计' };
    }

    try {
      const url = `${getBackendUrl()}/api/gemini/usage`;
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const headers = await this.getAuthHeaders();
      delete headers['Content-Type']; // GET 请求不需要

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`获取统计失败: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('获取使用统计失败:', error);
      throw error;
    }
  }

  /**
   * 估算 Token 使用量
   */
  private estimateTokens(text: string): number {
    // 简单估算：假设平均 4 个字符 = 1 个 token
    return Math.ceil(text.length / 4);
  }

  /**
   * 构建编辑提示词
   */
  private buildEditPrompt(request: EditRequest): string {
    const maskInstruction = request.maskImage 
      ? "\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges."
      : "";

    return `Edit this image according to the following instruction: ${request.instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks professional and realistic.`;
  }
}

export const geminiServiceExtended = new GeminiServiceExtended();

// 为了向后兼容，也导出为 geminiService
export const geminiService = geminiServiceExtended;