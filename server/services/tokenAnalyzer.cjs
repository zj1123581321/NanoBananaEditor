/**
 * Token 分析器和 API 提供商管理系统
 * 支持多个图像生成 API 的 token 使用统计和成本计算
 */

/**
 * Token 使用统计接口
 * @typedef {Object} TokenUsage
 * @property {number} inputTokens - 输入 tokens 数量
 * @property {number} outputTokens - 输出 tokens 数量
 * @property {number} totalTokens - 总 tokens 数量
 * @property {string} provider - 提供商名称
 * @property {string} modelName - 模型名称
 * @property {Object} [costUsd] - 成本信息 (USD)
 * @property {number} costUsd.input - 输入成本
 * @property {number} costUsd.output - 输出成本
 * @property {number} costUsd.total - 总成本
 */

/**
 * API 提供商基础接口
 */
class ApiProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * 解析 API 响应中的 token 使用信息
   * @param {Object} response - API 响应
   * @returns {TokenUsage} token 使用统计
   */
  parseTokenUsage(response) {
    throw new Error('parseTokenUsage method must be implemented');
  }

  /**
   * 计算成本
   * @param {TokenUsage} usage - token 使用统计
   * @param {Object} pricing - 定价信息
   * @returns {TokenUsage} 带成本信息的使用统计
   */
  calculateCost(usage, pricing) {
    const inputCost = (usage.inputTokens / 1000000) * pricing.input_price_per_1m_tokens;
    const outputCost = (usage.outputTokens / 1000000) * pricing.output_price_per_1m_tokens;

    return {
      ...usage,
      costUsd: {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost
      }
    };
  }
}

/**
 * Google Gemini API 提供商
 */
class GoogleGeminiProvider extends ApiProvider {
  constructor() {
    super('google');
  }

  /**
   * 解析 Google Gemini API 响应中的 token 使用信息
   * @param {Object} response - Gemini API 响应
   * @returns {TokenUsage} token 使用统计
   */
  parseTokenUsage(response) {
    const usage = response.usageMetadata || {};
    const modelVersion = response.modelVersion || 'gemini-2.5-flash-image-preview';
    
    let inputTokens = 0;
    let outputTokens = 0;
    
    // 从 promptTokensDetails 中提取输入 tokens
    if (usage.promptTokensDetails && Array.isArray(usage.promptTokensDetails)) {
      inputTokens = usage.promptTokensDetails.reduce((sum, detail) => {
        return sum + (detail.tokenCount || 0);
      }, 0);
    } else {
      // 备用方案：使用 promptTokenCount
      inputTokens = usage.promptTokenCount || 0;
    }
    
    // 从 candidatesTokensDetails 中提取输出 tokens  
    if (usage.candidatesTokensDetails && Array.isArray(usage.candidatesTokensDetails)) {
      outputTokens = usage.candidatesTokensDetails.reduce((sum, detail) => {
        return sum + (detail.tokenCount || 0);
      }, 0);
    } else {
      // 备用方案：使用 candidatesTokenCount
      outputTokens = usage.candidatesTokenCount || 0;
    }
    
    console.log(`🔍 Google Gemini Token 解析结果:`, {
      modelVersion,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      rawUsage: usage
    });

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      provider: this.name,
      modelName: modelVersion
    };
  }
}

/**
 * OpenAI DALL-E API 提供商 (预留)
 */
class OpenAIProvider extends ApiProvider {
  constructor() {
    super('openai');
  }

  parseTokenUsage(response) {
    // OpenAI DALL-E 的响应格式可能不同
    // 这里是预留实现，实际需要根据 OpenAI API 文档调整
    const usage = response.usage || {};
    
    return {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      provider: this.name,
      modelName: response.model || 'dall-e-3'
    };
  }
}

/**
 * Anthropic Claude API 提供商 (预留)
 */
class AnthropicProvider extends ApiProvider {
  constructor() {
    super('anthropic');
  }

  parseTokenUsage(response) {
    // Anthropic Claude 的响应格式
    const usage = response.usage || {};
    
    return {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      provider: this.name,
      modelName: response.model || 'claude-3-sonnet'
    };
  }
}

/**
 * 提供商管理器
 */
class ProviderManager {
  constructor() {
    this.providers = new Map();
    this.supabaseService = null;
    
    // 注册内置提供商
    this.registerProvider(new GoogleGeminiProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new AnthropicProvider());
  }

  /**
   * 设置 Supabase 服务引用
   * @param {Object} supabaseService - Supabase 服务实例
   */
  setSupabaseService(supabaseService) {
    this.supabaseService = supabaseService;
  }

  /**
   * 注册 API 提供商
   * @param {ApiProvider} provider - API 提供商实例
   */
  registerProvider(provider) {
    this.providers.set(provider.name, provider);
    console.log(`✅ 注册 API 提供商: ${provider.name}`);
  }

  /**
   * 获取提供商实例
   * @param {string} providerName - 提供商名称
   * @returns {ApiProvider} 提供商实例
   */
  getProvider(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`未知的 API 提供商: ${providerName}`);
    }
    return provider;
  }

  /**
   * 获取当前定价信息
   * @param {string} provider - 提供商名称
   * @param {string} modelName - 模型名称
   * @returns {Promise<Object>} 定价信息
   */
  async getCurrentPricing(provider, modelName) {
    if (!this.supabaseService || !this.supabaseService.supabase) {
      console.warn('⚠️ Supabase 服务不可用，使用默认定价');
      // 返回默认 Google Gemini 定价
      return {
        input_price_per_1m_tokens: 0.30,
        output_price_per_1m_tokens: 30.00
      };
    }

    try {
      const { data, error } = await this.supabaseService.supabase
        .rpc('get_current_pricing', {
          p_provider: provider,
          p_model_name: modelName
        });

      if (error) {
        console.error('❌ 获取定价信息失败:', error);
        throw error;
      }

      if (data && data.length > 0) {
        return {
          input_price_per_1m_tokens: data[0].input_price,
          output_price_per_1m_tokens: data[0].output_price
        };
      } else {
        console.warn(`⚠️ 未找到 ${provider}:${modelName} 的定价信息，使用默认定价`);
        return {
          input_price_per_1m_tokens: 0.30,
          output_price_per_1m_tokens: 30.00
        };
      }
    } catch (error) {
      console.error('❌ 获取定价信息异常:', error);
      return {
        input_price_per_1m_tokens: 0.30,
        output_price_per_1m_tokens: 30.00
      };
    }
  }

  /**
   * 记录使用统计
   * @param {string} providerName - 提供商名称
   * @param {Object} apiResponse - API 响应
   * @param {string} userId - 用户 ID
   * @param {string} actionType - 操作类型 ('generate' 或 'edit')
   * @returns {Promise<TokenUsage>} 带成本信息的使用统计
   */
  async recordUsage(providerName, apiResponse, userId, actionType = 'generate') {
    try {
      const provider = this.getProvider(providerName);
      const usage = provider.parseTokenUsage(apiResponse);
      
      console.log(`📊 记录使用统计 - 提供商: ${providerName}, 用户: ${userId}, 操作: ${actionType}`);
      
      // 获取定价信息
      const pricing = await this.getCurrentPricing(usage.provider, usage.modelName);
      
      // 计算成本
      const usageWithCost = provider.calculateCost(usage, pricing);
      
      console.log(`💰 成本计算结果:`, {
        inputTokens: usageWithCost.inputTokens,
        outputTokens: usageWithCost.outputTokens,
        inputCost: usageWithCost.costUsd.input,
        outputCost: usageWithCost.costUsd.output,
        totalCost: usageWithCost.costUsd.total
      });

      // 保存到数据库
      if (this.supabaseService && this.supabaseService.supabase) {
        await this.saveToDatabase(userId, usageWithCost, actionType);
      } else {
        console.warn('⚠️ Supabase 服务不可用，跳过数据库保存');
      }

      return usageWithCost;
    } catch (error) {
      console.error('❌ 记录使用统计失败:', error);
      throw error;
    }
  }

  /**
   * 保存统计数据到数据库
   * @param {string} userId - 用户 ID
   * @param {TokenUsage} usage - 使用统计
   * @param {string} actionType - 操作类型
   */
  async saveToDatabase(userId, usage, actionType) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await this.supabaseService.supabase
        .rpc('increment_usage_stats_v2', {
          p_user_id: userId,
          p_date: today,
          p_provider: usage.provider,
          p_model_name: usage.modelName,
          p_input_tokens: usage.inputTokens,
          p_output_tokens: usage.outputTokens,
          p_input_cost: usage.costUsd.input,
          p_output_cost: usage.costUsd.output,
          p_action_type: actionType
        });

      if (error) {
        console.error('❌ 保存使用统计到数据库失败:', error);
        throw error;
      }

      console.log('✅ 使用统计已保存到数据库');
    } catch (error) {
      console.error('❌ 数据库保存异常:', error);
      throw error;
    }
  }

  /**
   * 获取支持的提供商列表
   * @returns {string[]} 提供商名称列表
   */
  getSupportedProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * 获取提供商统计信息
   * @returns {Object} 提供商统计
   */
  getProviderStats() {
    return {
      totalProviders: this.providers.size,
      supportedProviders: this.getSupportedProviders()
    };
  }
}

// 创建全局实例
const tokenAnalyzer = new ProviderManager();

module.exports = {
  tokenAnalyzer,
  ApiProvider,
  GoogleGeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
  ProviderManager
};