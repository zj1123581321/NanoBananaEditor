/**
 * 快速检查 Supabase 数据库表格是否存在
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function quickCheck() {
  console.log('🔍 快速检查 Supabase 数据库状态...');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Supabase 环境变量未配置');
    console.log('需要配置:');
    console.log('- VITE_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  console.log('🔗 连接到:', supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 检查每个表格
  const tables = ['ai_image_editor_user_profiles', 'ai_image_editor_usage_stats', 'ai_image_editor_action_logs', 'ai_image_editor_chat_history', 'ai_image_editor_system_config'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ 表格 ${table} 不存在`);
        } else if (error.message.includes('RLS') || error.message.includes('policy')) {
          console.log(`✅ 表格 ${table} 存在 (RLS 保护)`);
        } else {
          console.log(`⚠️  表格 ${table}: ${error.message}`);
        }
      } else {
        console.log(`✅ 表格 ${table} 存在且可访问`);
      }
    } catch (err) {
      console.log(`❌ 表格 ${table} 检查失败: ${err.message}`);
    }
  }
}

quickCheck().catch(console.error);