/**
 * Gemini API 代理路由
 * 负责转发 Gemini API 请求并记录使用统计
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth.cjs');
const supabaseService = require('../services/supabaseService.cjs');
const router = express.Router();

/**
 * 估算 token 使用量的简单函数
 */
function estimateTokens(text) {
  // 简单估算：假设平均 4 个字符 = 1 个 token
  return Math.ceil(text.length / 4);
}

/**
 * 调用 Gemini API
 */
async function callGeminiAPI(params) {
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  // 这里应该集成实际的 Gemini API 调用逻辑
  // 目前返回模拟数据，实际实现时需要替换
  console.log('🤖 调用 Gemini API:', { 
    prompt: params.prompt?.substring(0, 50) + '...',
    hasImages: params.images?.length > 0
  });

  // 模拟 API 响应
  return {
    candidates: [
      {
        content: {
          parts: [
            { text: `基于提示词"${params.prompt}"生成的图像` }
          ]
        }
      }
    ],
    usageMetadata: {
      promptTokenCount: estimateTokens(params.prompt || ''),
      candidatesTokenCount: 50,
      totalTokenCount: estimateTokens(params.prompt || '') + 50
    }
  };
}

/**
 * 图像生成端点
 */
router.post('/generate', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { prompt, parameters = {}, projectId } = req.body;
    const userId = req.user.id;
    const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required',
        code: 'MISSING_PROMPT'
      });
    }

    // 记录开始操作
    await supabaseService.logAction(userId, 'generate_start', {
      prompt: prompt.substring(0, 100),
      parameters,
      projectId
    }, sessionId);

    // 调用 Gemini API
    const result = await callGeminiAPI({
      prompt,
      ...parameters
    });

    const processingTime = Date.now() - startTime;
    const tokenUsed = result.usageMetadata?.totalTokenCount || estimateTokens(prompt);

    // 记录使用统计
    await supabaseService.recordUsage(userId, 'generate', tokenUsed);

    // 记录成功操作
    await supabaseService.logAction(userId, 'generate_success', {
      prompt: prompt.substring(0, 100),
      parameters,
      projectId,
      tokenUsed,
      processingTime,
      resultCount: result.candidates?.length || 0
    }, sessionId);

    // 保存聊天历史
    await supabaseService.saveChatHistory(userId, projectId, prompt, '', {
      type: 'generate',
      tokenUsed,
      processingTime,
      parameters,
      resultCount: result.candidates?.length || 0
    });

    console.log(`✅ 图像生成成功 - 用户: ${userId}, Token: ${tokenUsed}, 耗时: ${processingTime}ms`);

    res.json({ 
      success: true, 
      data: result,
      metadata: {
        tokenUsed,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ 图像生成失败:', error);
    
    // 记录错误
    await supabaseService.logAction(req.user?.id, 'generate_error', {
      error: error.message,
      processingTime,
      prompt: req.body.prompt?.substring(0, 100)
    });

    res.status(500).json({ 
      error: 'Generation failed',
      code: 'GENERATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 图像编辑端点
 */
router.post('/edit', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { instruction, imageData, maskData, parameters = {}, projectId } = req.body;
    const userId = req.user.id;
    const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;

    if (!instruction || !imageData) {
      return res.status(400).json({ 
        error: 'Instruction and image data are required',
        code: 'MISSING_EDIT_DATA'
      });
    }

    // 记录开始操作
    await supabaseService.logAction(userId, 'edit_start', {
      instruction: instruction.substring(0, 100),
      parameters,
      projectId,
      hasMask: !!maskData
    }, sessionId);

    // 调用 Gemini API 进行图像编辑
    const result = await callGeminiAPI({
      instruction,
      imageData,
      maskData,
      ...parameters
    });

    const processingTime = Date.now() - startTime;
    const tokenUsed = result.usageMetadata?.totalTokenCount || estimateTokens(instruction);

    // 记录使用统计
    await supabaseService.recordUsage(userId, 'edit', tokenUsed);

    // 记录成功操作
    await supabaseService.logAction(userId, 'edit_success', {
      instruction: instruction.substring(0, 100),
      parameters,
      projectId,
      tokenUsed,
      processingTime,
      resultCount: result.candidates?.length || 0
    }, sessionId);

    // 保存聊天历史
    await supabaseService.saveChatHistory(userId, projectId, instruction, '', {
      type: 'edit',
      tokenUsed,
      processingTime,
      parameters,
      resultCount: result.candidates?.length || 0
    });

    console.log(`✅ 图像编辑成功 - 用户: ${userId}, Token: ${tokenUsed}, 耗时: ${processingTime}ms`);

    res.json({ 
      success: true, 
      data: result,
      metadata: {
        tokenUsed,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ 图像编辑失败:', error);
    
    // 记录错误
    await supabaseService.logAction(req.user?.id, 'edit_error', {
      error: error.message,
      processingTime,
      instruction: req.body.instruction?.substring(0, 100)
    });

    res.status(500).json({ 
      error: 'Edit failed',
      code: 'EDIT_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 获取用户使用统计
 */
router.get('/usage/:userId?', authMiddleware, async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.user.id;
    
    // 用户只能查看自己的统计，管理员可以查看所有用户
    if (requestedUserId && requestedUserId !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    const userId = requestedUserId || currentUserId;
    const { startDate, endDate } = req.query;
    
    const stats = await supabaseService.getUsageStats(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate || new Date().toISOString().split('T')[0],
      userId
    );

    res.json({ 
      success: true, 
      data: stats,
      metadata: {
        userId,
        startDate,
        endDate,
        count: stats.length
      }
    });
  } catch (error) {
    console.error('❌ 获取使用统计失败:', error);
    res.status(500).json({ 
      error: 'Failed to fetch usage stats',
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;