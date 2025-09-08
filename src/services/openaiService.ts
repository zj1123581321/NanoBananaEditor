/**
 * OpenAI Service Integration
 * Handles all text AI processing tasks including prompt optimization
 */

// OpenAI API 配置
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const BASE_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

export interface PromptOptimizationRequest {
  originalPrompt: string;
  mode: 'generate' | 'edit';
  style?: 'photorealistic' | 'illustration' | 'artistic' | 'product' | 'minimalist' | 'comic';
  additionalContext?: string;
}

export interface PromptOptimizationResponse {
  optimizedPrompt: string;
  improvements: string[];
  reasoning: string;
}

export interface TextProcessingRequest {
  text: string;
  task: 'summarize' | 'translate' | 'analyze' | 'enhance';
  language?: string;
  context?: string;
}

export class OpenAIService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = API_KEY;
    this.baseUrl = BASE_URL;
    this.model = MODEL;

    if (!this.apiKey) {
      console.warn('OpenAI API key not configured. Prompt optimization features will be disabled.');
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Optimize user input prompts based on Google Gemini image generation best practices
   */
  async optimizePrompt(request: PromptOptimizationRequest): Promise<PromptOptimizationResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const systemPrompt = this.buildPromptOptimizationSystemPrompt(request.mode, request.style);
      const userPrompt = this.buildPromptOptimizationUserPrompt(request);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from OpenAI API');
      }

      // 解析响应内容
      return this.parseOptimizationResponse(content, request.originalPrompt);

    } catch (error) {
      console.error('Error optimizing prompt:', error);
      throw new Error('Failed to optimize prompt. Please try again.');
    }
  }

  /**
   * General text processing functionality
   */
  async processText(request: TextProcessingRequest): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const systemPrompt = this.buildTextProcessingSystemPrompt(request.task);
      const userPrompt = this.buildTextProcessingUserPrompt(request);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';

    } catch (error) {
      console.error('Error processing text:', error);
      throw new Error('Failed to process text. Please try again.');
    }
  }

  /**
   * 构建 Prompt 优化的系统提示
   */
  private buildPromptOptimizationSystemPrompt(mode: string, style?: string): string {
    const basePrompt = `你是一个专业的 AI 图像生成 prompt 优化专家。你的任务是帮助用户优化他们的 prompt，使其更适合 Google Gemini 2.5 Flash Image 模型。

请遵循以下 Google 官方最佳实践：

1. **描述场景，不要只列举关键词**：模型的核心优势是深度语言理解。叙述性的、描述性的段落几乎总是比分离的词汇列表产生更好、更连贯的图像。

2. **具体详细**：提供的细节越多，控制越精确。不要说"幻想盔甲"，而要描述："华丽的精灵板甲，雕刻着银叶图案，高领和形似猎鹰翅膀的护肩"。

3. **提供上下文和意图**：解释图像的目的。模型对上下文的理解将影响最终输出。

4. **使用摄影和电影语言**：使用如"广角镜头"、"微距拍摄"、"低角度视角"等术语来控制构图。`;

    if (mode === 'generate') {
      return basePrompt + `

对于图像生成，特别关注：
- 摄影术语（相机角度、镜头类型、照明）
- 环境和场景描述
- 主体的动作或表情
- 艺术风格和渲染技术
- 色彩方案和情绪氛围`;
    } else {
      return basePrompt + `

对于图像编辑，特别关注：
- 清晰说明要添加、移除或修改的元素，但不要修改图像中已存在的主体
- 保持原始图像风格、照明和视角的指令
- 确保编辑看起来自然和无缝集成的描述
- 避免对图像中已存在的主要对象进行描述或重新定义
- 专注于局部修改而非整体重新描述
- 如果有遮罩，说明如何在指定区域内进行更改`;
    }

    if (style) {
      const styleGuidance = this.getStyleGuidance(style);
      return basePrompt + `\n\n特定风格指导：\n${styleGuidance}`;
    }

    return basePrompt;
  }

  /**
   * 构建 Prompt 优化的用户提示
   */
  private buildPromptOptimizationUserPrompt(request: PromptOptimizationRequest): string {
    let prompt = `请优化以下 ${request.mode === 'generate' ? '图像生成' : '图像编辑'} prompt：

原始 prompt: "${request.originalPrompt}"`;

    if (request.style) {
      prompt += `\n期望风格: ${request.style}`;
    }

    if (request.additionalContext) {
      prompt += `\n额外上下文: ${request.additionalContext}`;
    }

    if (request.mode === 'edit') {
      prompt += `

特别提醒：
- 这是图像编辑模式，用户已有一张现有图像
- 请避免重新描述图像中已存在的主体或对象
- 专注于优化用户想要进行的具体修改或调整
- 不要添加新的主体描述，而是优化修改指令的表达`;
    }

    prompt += `

请以 JSON 格式返回结果：
{
  "optimizedPrompt": "优化后的详细 prompt",
  "improvements": ["改进点1", "改进点2", "改进点3"],
  "reasoning": "优化理由和说明"
}

确保优化后的 prompt 更加详细、具体，并遵循 Google Gemini 最佳实践。`;

    return prompt;
  }

  /**
   * 获取特定风格的指导
   */
  private getStyleGuidance(style: string): string {
    const styleGuides = {
      photorealistic: '使用摄影术语，提及相机角度、镜头类型、照明和精细细节，以引导模型产生逼真的结果。',
      illustration: '强调艺术风格、线条质量、色彩调色板和渲染技术。',
      artistic: '描述特定的艺术运动、技法或艺术家风格，如"梵高星空风格"或"印象派技法"。',
      product: '专注于干净、专业的产品拍摄，包括照明设置、背景和相机角度。',
      minimalist: '强调负空间、简单构图和微妙的照明。',
      comic: '描述面板布局、艺术风格（如黑色电影、漫画）和对话框。'
    };

    return styleGuides[style as keyof typeof styleGuides] || '';
  }

  /**
   * 构建文本处理的系统提示
   */
  private buildTextProcessingSystemPrompt(task: string): string {
    const prompts = {
      summarize: '你是一个专业的文本摘要专家。请提供简洁、准确的摘要。',
      translate: '你是一个专业的翻译专家。请提供准确、自然的翻译。',
      analyze: '你是一个专业的文本分析专家。请提供深入的分析和见解。',
      enhance: '你是一个专业的文本优化专家。请改进文本的清晰度和表达力。'
    };

    return prompts[task as keyof typeof prompts] || '你是一个专业的文本处理助手。';
  }

  /**
   * 构建文本处理的用户提示
   */
  private buildTextProcessingUserPrompt(request: TextProcessingRequest): string {
    let prompt = `请${request.task === 'summarize' ? '总结' : 
                     request.task === 'translate' ? '翻译' : 
                     request.task === 'analyze' ? '分析' : '优化'}以下文本：

${request.text}`;

    if (request.language) {
      prompt += `\n目标语言: ${request.language}`;
    }

    if (request.context) {
      prompt += `\n上下文: ${request.context}`;
    }

    return prompt;
  }

  /**
   * 解析优化响应
   */
  private parseOptimizationResponse(content: string, originalPrompt: string): PromptOptimizationResponse {
    try {
      // 尝试解析 JSON 响应
      const parsed = JSON.parse(content);
      
      return {
        optimizedPrompt: parsed.optimizedPrompt || originalPrompt,
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        reasoning: parsed.reasoning || '已优化提示词以提高生成质量'
      };
    } catch {
      // 如果 JSON 解析失败，尝试从文本中提取信息
      const lines = content.split('\n').filter(line => line.trim());
      
      return {
        optimizedPrompt: content.includes('优化后') ? 
          lines.find(line => line.includes('优化后'))?.replace(/^[^:]+:/, '').trim() || originalPrompt :
          originalPrompt,
        improvements: ['已根据 Google Gemini 最佳实践进行优化'],
        reasoning: '优化提示词以提高图像生成质量和准确性'
      };
    }
  }
}

export const openaiService = new OpenAIService();