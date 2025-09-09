/**
 * Supabase 数据库初始化验证脚本
 * 检查所有必要的表格、索引、函数是否已正确创建
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class SupabaseInitVerifier {
  constructor() {
    this.supabase = null;
    this.results = {
      tables: {},
      indexes: {},
      functions: {},
      policies: {},
      config: {},
      overall: false
    };
  }

  async initialize() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase 配置缺失');
      console.error('请确保设置了以下环境变量:');
      console.error('- VITE_SUPABASE_URL');
      console.error('- SUPABASE_SERVICE_ROLE_KEY');
      return false;
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔗 连接 Supabase:', supabaseUrl);
    return true;
  }

  async verifyTables() {
    console.log('\n📋 检查数据表...');
    
    const expectedTables = [
      'ai_image_editor_user_profiles',
      'ai_image_editor_usage_stats', 
      'ai_image_editor_action_logs',
      'ai_image_editor_chat_history',
      'ai_image_editor_system_config'
    ];

    for (const table of expectedTables) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`  ❌ ${table}: ${error.message}`);
          this.results.tables[table] = false;
        } else {
          console.log(`  ✅ ${table}: 表存在`);
          this.results.tables[table] = true;
        }
      } catch (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
        this.results.tables[table] = false;
      }
    }
  }

  async verifyFunctions() {
    console.log('\n🔧 检查数据库函数...');
    
    const expectedFunctions = [
      'increment_usage_stats',
      'get_user_stats_overview', 
      'cleanup_old_logs'
    ];

    for (const func of expectedFunctions) {
      try {
        // 尝试调用函数检查是否存在
        if (func === 'increment_usage_stats') {
          // 使用测试数据调用
          const { error } = await this.supabase.rpc(func, {
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_date: '2025-01-01',
            p_token_consumed: 0,
            p_action_type: 'test'
          });
          
          if (error && !error.message.includes('foreign key')) {
            console.log(`  ❌ ${func}: ${error.message}`);
            this.results.functions[func] = false;
          } else {
            console.log(`  ✅ ${func}: 函数存在`);
            this.results.functions[func] = true;
          }
        } else if (func === 'get_user_stats_overview') {
          const { error } = await this.supabase.rpc(func, {
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_days: 30
          });
          
          if (error && !error.message.includes('foreign key')) {
            console.log(`  ❌ ${func}: ${error.message}`);
            this.results.functions[func] = false;
          } else {
            console.log(`  ✅ ${func}: 函数存在`);
            this.results.functions[func] = true;
          }
        } else if (func === 'cleanup_old_logs') {
          const { error } = await this.supabase.rpc(func, {
            p_days: 90
          });
          
          if (error && error.message.includes('function') && error.message.includes('does not exist')) {
            console.log(`  ❌ ${func}: 函数不存在`);
            this.results.functions[func] = false;
          } else {
            console.log(`  ✅ ${func}: 函数存在`);
            this.results.functions[func] = true;
          }
        }
      } catch (error) {
        console.log(`  ❌ ${func}: ${error.message}`);
        this.results.functions[func] = false;
      }
    }
  }

  async verifySystemConfig() {
    console.log('\n⚙️  检查系统配置...');
    
    const expectedConfigs = [
      'max_daily_tokens',
      'max_daily_requests',
      'log_retention_days',
      'notification_enabled',
      'maintenance_mode'
    ];

    try {
      const { data, error } = await this.supabase
        .from('ai_image_editor_system_config')
        .select('key, value')
        .in('key', expectedConfigs);

      if (error) {
        console.log(`  ❌ 系统配置表查询失败: ${error.message}`);
        return;
      }

      const foundConfigs = data.map(item => item.key);
      
      for (const config of expectedConfigs) {
        if (foundConfigs.includes(config)) {
          console.log(`  ✅ ${config}: 配置存在`);
          this.results.config[config] = true;
        } else {
          console.log(`  ❌ ${config}: 配置缺失`);
          this.results.config[config] = false;
        }
      }
    } catch (error) {
      console.log(`  ❌ 系统配置检查失败: ${error.message}`);
    }
  }

  async verifyRLSPolicies() {
    console.log('\n🔐 检查行级安全策略...');
    
    try {
      // 检查 RLS 是否启用
      const { data, error } = await this.supabase
        .from('ai_image_editor_user_profiles')
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('RLS') || error.message.includes('policy')) {
          console.log('  ✅ RLS 策略已启用 (需要认证访问)');
          this.results.policies.rls_enabled = true;
        } else {
          console.log(`  ❌ RLS 检查失败: ${error.message}`);
          this.results.policies.rls_enabled = false;
        }
      } else {
        console.log('  ⚠️  RLS 策略可能未启用 (可以无认证访问)');
        this.results.policies.rls_enabled = false;
      }
    } catch (error) {
      console.log(`  ❌ RLS 策略检查异常: ${error.message}`);
      this.results.policies.rls_enabled = false;
    }
  }

  async testConnection() {
    console.log('\n🔌 测试数据库连接...');
    
    try {
      const { data, error } = await this.supabase
        .from('ai_image_editor_system_config')
        .select('count')
        .limit(1);

      if (error && !error.message.includes('RLS')) {
        console.log(`  ❌ 数据库连接失败: ${error.message}`);
        return false;
      } else {
        console.log('  ✅ 数据库连接正常');
        return true;
      }
    } catch (error) {
      console.log(`  ❌ 数据库连接异常: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    console.log('\n📊 验证报告');
    console.log('='.repeat(50));
    
    // 统计结果
    const tableCount = Object.values(this.results.tables).filter(Boolean).length;
    const functionCount = Object.values(this.results.functions).filter(Boolean).length;
    const configCount = Object.values(this.results.config).filter(Boolean).length;
    
    console.log(`📋 数据表: ${tableCount}/5 个表格创建成功`);
    console.log(`🔧 函数: ${functionCount}/3 个函数创建成功`);
    console.log(`⚙️  系统配置: ${configCount}/5 个配置项存在`);
    console.log(`🔐 RLS 策略: ${this.results.policies.rls_enabled ? '已启用' : '未启用'}`);
    
    // 整体状态
    const allTablesOk = Object.values(this.results.tables).every(Boolean);
    const allFunctionsOk = Object.values(this.results.functions).every(Boolean);
    const mostConfigOk = configCount >= 3; // 至少3个配置项
    
    this.results.overall = allTablesOk && allFunctionsOk && mostConfigOk;
    
    console.log('\n🎯 总体状态:');
    if (this.results.overall) {
      console.log('✅ Supabase 数据库初始化 完整且正确!');
    } else {
      console.log('❌ Supabase 数据库初始化 不完整，需要执行迁移脚本!');
      console.log('💡 请执行以下命令:');
      console.log('   1. 在 Supabase Dashboard 的 SQL 编辑器中');
      console.log('   2. 执行 supabase/migrations/001_initial_setup.sql');
    }
    
    return this.results.overall;
  }

  async run() {
    console.log('🍌 Nano Banana - Supabase 数据库初始化验证');
    console.log('='.repeat(50));
    
    if (!await this.initialize()) {
      return false;
    }

    const isConnected = await this.testConnection();
    if (!isConnected) {
      return false;
    }

    await this.verifyTables();
    await this.verifyFunctions();
    await this.verifySystemConfig();
    await this.verifyRLSPolicies();
    
    return this.generateReport();
  }
}

// 运行验证
async function main() {
  const verifier = new SupabaseInitVerifier();
  const success = await verifier.run();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SupabaseInitVerifier;