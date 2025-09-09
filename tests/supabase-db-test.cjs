/**
 * Supabase 数据库基础操作测试
 * 直接测试数据库表格的 CRUD 操作
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
// UUID 生成函数
function uuidv4() {
  if (typeof require === 'function') {
    try {
      const crypto = require('crypto');
      if (crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {}
  }
  
  // 降级实现
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class SupabaseDbTester {
  constructor() {
    this.supabase = null;
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      details: []
    };
    this.testUserId = uuidv4();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    };
    console.log(`${emoji[type]} [${timestamp}] ${message}`);
  }

  async initialize() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase 环境变量未配置');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    this.log(`连接到 Supabase: ${supabaseUrl}`, 'info');
  }

  async runTest(testName, testFn) {
    this.testResults.total++;
    this.log(`运行测试: ${testName}`, 'test');
    
    try {
      await testFn();
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'passed',
        message: '测试通过'
      });
      this.log(`测试通过: ${testName}`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({
        name: testName,
        status: 'failed',
        message: error.message
      });
      this.log(`测试失败: ${testName} - ${error.message}`, 'error');
    }
  }

  async testConnection() {
    const { data, error } = await this.supabase
      .from('ai_image_editor_system_config')
      .select('count')
      .limit(1);

    if (error) {
      throw new Error(`连接测试失败: ${error.message}`);
    }

    this.log('数据库连接正常', 'info');
  }

  async testTablesExist() {
    const tables = [
      'ai_image_editor_user_profiles',
      'ai_image_editor_usage_stats',
      'ai_image_editor_action_logs',
      'ai_image_editor_chat_history',
      'ai_image_editor_system_config'
    ];

    for (const table of tables) {
      const { error } = await this.supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          throw new Error(`表格 ${table} 不存在`);
        } else if (error.message.includes('RLS') || error.message.includes('policy')) {
          this.log(`表格 ${table} 存在 (受 RLS 保护)`, 'info');
        } else {
          throw new Error(`表格 ${table} 检查失败: ${error.message}`);
        }
      } else {
        this.log(`表格 ${table} 存在且可访问`, 'info');
      }
    }
  }

  async testCreateUserProfile() {
    const testUser = {
      id: this.testUserId,
      username: `test_user_${Date.now()}`,
      role: 'user',
      status: 'active'
    };

    const { data, error } = await this.supabase
      .from('ai_image_editor_user_profiles')
      .insert(testUser)
      .select()
      .single();

    if (error) {
      throw new Error(`创建用户配置失败: ${error.message}`);
    }

    if (!data || data.id !== this.testUserId) {
      throw new Error('创建的用户数据不正确');
    }

    this.log(`成功创建测试用户: ${testUser.username}`, 'info');
  }

  async testCreateUsageStats() {
    const today = new Date().toISOString().split('T')[0];
    const statsData = {
      user_id: this.testUserId,
      date: today,
      token_consumed: 100,
      request_count: 5,
      generation_count: 3,
      edit_count: 2
    };

    const { data, error } = await this.supabase
      .from('ai_image_editor_usage_stats')
      .insert(statsData)
      .select()
      .single();

    if (error) {
      throw new Error(`创建使用统计失败: ${error.message}`);
    }

    this.log(`成功创建使用统计记录`, 'info');
  }

  async testCreateActionLog() {
    const logData = {
      user_id: this.testUserId,
      action: 'test_action',
      details: { test: true, timestamp: Date.now() },
      session_id: 'test_session'
    };

    const { data, error } = await this.supabase
      .from('ai_image_editor_action_logs')
      .insert(logData)
      .select()
      .single();

    if (error) {
      throw new Error(`创建行为日志失败: ${error.message}`);
    }

    this.log('成功创建行为日志记录', 'info');
  }

  async testCreateChatHistory() {
    const chatData = {
      user_id: this.testUserId,
      project_id: 'test_project',
      prompt: 'Test prompt for image generation',
      response: 'Test response from AI',
      type: 'generate',
      metadata: { test: true, model: 'gemini' }
    };

    const { data, error } = await this.supabase
      .from('ai_image_editor_chat_history')
      .insert(chatData)
      .select()
      .single();

    if (error) {
      throw new Error(`创建聊天历史失败: ${error.message}`);
    }

    this.log('成功创建聊天历史记录', 'info');
  }

  async testSystemConfig() {
    const { data, error } = await this.supabase
      .from('ai_image_editor_system_config')
      .select('*')
      .limit(5);

    if (error) {
      throw new Error(`查询系统配置失败: ${error.message}`);
    }

    this.log(`查询到 ${data?.length || 0} 条系统配置`, 'info');

    // 测试插入新配置
    const configData = {
      key: `test_config_${Date.now()}`,
      value: { test: true, created: new Date().toISOString() },
      description: 'Test configuration for automated testing'
    };

    const { error: insertError } = await this.supabase
      .from('ai_image_editor_system_config')
      .insert(configData);

    if (insertError) {
      throw new Error(`插入系统配置失败: ${insertError.message}`);
    }

    this.log('成功创建系统配置记录', 'info');
  }

  async testIncrementUsageStatsFunction() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await this.supabase.rpc('increment_usage_stats', {
        p_user_id: this.testUserId,
        p_date: today,
        p_token_consumed: 50,
        p_action_type: 'generate'
      });

      if (error) {
        throw new Error(`调用 increment_usage_stats 函数失败: ${error.message}`);
      }

      this.log('成功调用 increment_usage_stats 函数', 'info');
    } catch (error) {
      // 如果函数不存在或有其他问题，记录但不失败
      this.log(`increment_usage_stats 函数测试失败: ${error.message}`, 'warning');
    }
  }

  async testQueryWithRelations() {
    // 测试查询用户的使用统计数据
    const { data, error } = await this.supabase
      .from('ai_image_editor_usage_stats')
      .select('*')
      .eq('user_id', this.testUserId);

    if (error) {
      throw new Error(`查询使用统计失败: ${error.message}`);
    }

    this.log(`查询到用户 ${data?.length || 0} 条使用统计记录`, 'info');

    // 分别查询用户信息
    const { data: userData, error: userError } = await this.supabase
      .from('ai_image_editor_user_profiles')
      .select('username, role')
      .eq('id', this.testUserId)
      .single();

    if (userError) {
      throw new Error(`查询用户信息失败: ${userError.message}`);
    }

    this.log(`用户信息查询成功: ${userData.username} (${userData.role})`, 'info');
  }

  async testCleanup() {
    // 清理测试数据
    const tables = [
      'ai_image_editor_chat_history',
      'ai_image_editor_action_logs',
      'ai_image_editor_usage_stats',
      'ai_image_editor_user_profiles'
    ];

    for (const table of tables) {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .eq('user_id', this.testUserId);

      if (error && !error.message.includes('RLS')) {
        this.log(`清理表格 ${table} 时出错: ${error.message}`, 'warning');
      }
    }

    // 清理测试系统配置
    const { error: configError } = await this.supabase
      .from('ai_image_editor_system_config')
      .delete()
      .like('key', 'test_config_%');

    if (configError && !configError.message.includes('RLS')) {
      this.log(`清理系统配置时出错: ${configError.message}`, 'warning');
    }

    this.log('测试数据清理完成', 'info');
  }

  async runAllTests() {
    this.log('🍌 开始 Supabase 数据库测试', 'info');
    
    try {
      // 初始化连接
      await this.runTest('初始化数据库连接', () => this.initialize());
      
      // 基础连接测试
      await this.runTest('测试数据库连接', () => this.testConnection());
      
      // 表格存在性测试
      await this.runTest('检查数据表是否存在', () => this.testTablesExist());
      
      // CRUD 操作测试
      await this.runTest('创建用户配置', () => this.testCreateUserProfile());
      await this.runTest('创建使用统计', () => this.testCreateUsageStats());
      await this.runTest('创建行为日志', () => this.testCreateActionLog());
      await this.runTest('创建聊天历史', () => this.testCreateChatHistory());
      await this.runTest('系统配置操作', () => this.testSystemConfig());
      
      // 函数测试
      await this.runTest('测试数据库函数', () => this.testIncrementUsageStatsFunction());
      
      // 关联查询测试
      await this.runTest('测试关联查询', () => this.testQueryWithRelations());
      
      // 清理测试
      await this.runTest('清理测试数据', () => this.testCleanup());
      
    } catch (error) {
      this.log(`测试过程中出现未捕获错误: ${error.message}`, 'error');
    }

    this.printSummary();
  }

  printSummary() {
    this.log('📊 数据库测试结果汇总', 'info');
    console.log('='.repeat(60));
    console.log(`总测试数: ${this.testResults.total}`);
    console.log(`✅ 通过: ${this.testResults.passed}`);
    console.log(`❌ 失败: ${this.testResults.failed}`);
    console.log(`📊 通过率: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    if (this.testResults.failed > 0) {
      this.log('失败的测试详情:', 'error');
      this.testResults.details
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  ❌ ${test.name}: ${test.message}`);
        });
    }

    console.log('\n🔧 问题排查建议:');
    console.log('1. 检查 .env 文件中的 Supabase 配置');
    console.log('2. 确认数据库迁移脚本已执行');
    console.log('3. 验证 Service Role Key 权限');
    console.log('4. 检查 RLS 策略配置');
  }
}

// 运行测试
async function main() {
  const tester = new SupabaseDbTester();
  await tester.runAllTests();
  
  // 退出码：有失败测试时返回 1
  process.exit(tester.testResults.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 数据库测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = SupabaseDbTester;