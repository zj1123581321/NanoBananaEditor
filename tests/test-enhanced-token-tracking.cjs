/**
 * 测试增强的 Token 统计功能
 * 验证新的 token 分析和成本计算系统
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 模拟的 Google Gemini API 响应
 */
const mockGeminiResponse = {
  candidates: [{
    content: { parts: [{ text: "Generated image description" }] },
    finishReason: "STOP"
  }],
  usageMetadata: {
    promptTokenCount: 16,
    candidatesTokenCount: 1290,
    totalTokenCount: 1306,
    promptTokensDetails: [{
      modality: 'TEXT',
      tokenCount: 16
    }],
    candidatesTokensDetails: [{
      modality: 'IMAGE',
      tokenCount: 1290
    }]
  },
  modelVersion: 'gemini-2.5-flash-image-preview'
};

/**
 * 测试 Token 分析器
 */
async function testTokenAnalyzer() {
  console.log('🧪 测试 Token 分析器...');
  
  try {
    // 导入 Token 分析器
    const { tokenAnalyzer } = require('../server/services/tokenAnalyzer.cjs');
    
    // 分析 Google Gemini 响应
    const result = await tokenAnalyzer.recordUsage('google', mockGeminiResponse, 'test-user-123', 'generate');
    
    console.log('📊 Token 分析结果:', {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.totalTokens,
      inputCostUsd: result.costUsd?.input,
      outputCostUsd: result.costUsd?.output,
      totalCostUsd: result.costUsd?.total,
      provider: result.provider,
      modelName: result.modelName
    });
    
    // 验证计算结果
    const expectedInputCost = (16 / 1000000) * 0.3; // $0.0000048
    const expectedOutputCost = (1290 / 1000000) * 30; // $0.0387
    
    console.log('✅ 预期输入成本:', expectedInputCost.toFixed(8));
    console.log('✅ 预期输出成本:', expectedOutputCost.toFixed(8));
    console.log('✅ 预期总成本:', (expectedInputCost + expectedOutputCost).toFixed(8));
    
    if (Math.abs(result.costUsd.input - expectedInputCost) < 0.00000001 &&
        Math.abs(result.costUsd.output - expectedOutputCost) < 0.00000001) {
      console.log('✅ Token 分析器测试通过！');
      return true;
    } else {
      console.log('❌ Token 分析器成本计算错误');
      return false;
    }
  } catch (error) {
    console.error('❌ Token 分析器测试失败:', error.message);
    return false;
  }
}

/**
 * 测试数据库结构
 */
async function testDatabaseStructure() {
  console.log('🗄️ 测试数据库结构...');
  
  try {
    // 检查 usage_stats 表结构
    const { data: usageStats, error: usageError } = await supabase
      .from('ai_image_editor_usage_stats')
      .select('*')
      .limit(1);
    
    if (usageError) {
      console.log('⚠️ usage_stats 表查询错误:', usageError.message);
      console.log('📝 请运行数据库迁移: supabase/migrations/002_enhanced_token_statistics.sql');
      return false;
    }
    
    // 检查 pricing 表
    const { data: pricing, error: pricingError } = await supabase
      .from('ai_image_editor_pricing')
      .select('*')
      .eq('is_active', true)
      .limit(5);
    
    if (pricingError) {
      console.log('❌ pricing 表查询错误:', pricingError.message);
      return false;
    }
    
    console.log('✅ 数据库表结构正常');
    console.log('💰 活跃定价记录数:', pricing.length);
    
    if (pricing.length > 0) {
      console.log('💰 定价示例:', pricing[0]);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 数据库结构测试失败:', error.message);
    return false;
  }
}

/**
 * 测试存储过程
 */
async function testStoredProcedures() {
  console.log('🔧 测试存储过程...');
  
  try {
    // 测试价格获取函数
    const { data, error } = await supabase.rpc('get_current_pricing', {
      provider_name: 'google',
      model_name: 'gemini-2.5-flash-image-preview'
    });
    
    if (error) {
      console.log('❌ get_current_pricing 函数错误:', error.message);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('✅ 价格查询成功:', data[0]);
      return true;
    } else {
      console.log('⚠️ 未找到定价信息，请检查 pricing 表数据');
      return false;
    }
  } catch (error) {
    console.error('❌ 存储过程测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始增强 Token 统计功能测试\n');
  
  const results = {
    tokenAnalyzer: await testTokenAnalyzer(),
    database: await testDatabaseStructure(),
    storedProcedures: await testStoredProcedures()
  };
  
  console.log('\n📋 测试结果汇总:');
  console.log('Token 分析器:', results.tokenAnalyzer ? '✅ 通过' : '❌ 失败');
  console.log('数据库结构:', results.database ? '✅ 通过' : '❌ 失败');
  console.log('存储过程:', results.storedProcedures ? '✅ 通过' : '❌ 失败');
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 所有测试通过！增强 Token 统计功能已准备就绪');
  } else {
    console.log('⚠️ 部分测试失败，请检查上述错误信息');
  }
  console.log('='.repeat(50));
  
  process.exit(allPassed ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runTests };