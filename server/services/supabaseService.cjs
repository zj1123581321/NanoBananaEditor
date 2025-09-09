/**
 * Supabase 服务
 * 负责用户管理、统计记录和数据库操作
 */
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
    
    // 只在多用户模式下初始化 Supabase
    if (this.isMultiUserMode()) {
      this.initialize();
    }
  }

  isMultiUserMode() {
    const mode = process.env.VITE_APP_MODE || process.env.APP_MODE;
    return mode === 'multi-user';
  }

  initialize() {
    if (this.initialized) return;
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️  Supabase 配置缺失，多用户功能将不可用');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    this.initialized = true;
    console.log('✅ Supabase 服务初始化成功');
  }

  /**
   * 验证用户 JWT token
   */
  async verifyUser(token) {
    if (!this.isMultiUserMode()) {
      return { user: { id: 'standalone', email: 'standalone@local' }, error: null };
    }

    if (!this.supabase) {
      return { user: null, error: new Error('Supabase not initialized') };
    }

    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      return { user: data.user, error };
    } catch (error) {
      return { user: null, error };
    }
  }

  /**
   * 记录使用统计
   */
  async recordUsage(userId, actionType, tokenUsed = 0) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await this.supabase.rpc('increment_usage_stats', {
        p_user_id: userId,
        p_date: today,
        p_token_consumed: tokenUsed,
        p_action_type: actionType
      });

      if (error) {
        console.error('❌ 记录使用统计失败:', error);
      }
    } catch (error) {
      console.error('❌ 记录使用统计异常:', error);
    }
  }

  /**
   * 记录用户行为日志
   */
  async logAction(userId, action, details = {}, sessionId = null) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return;
    }

    try {
      const { error } = await this.supabase
        .from('action_logs')
        .insert({
          user_id: userId,
          action,
          details,
          session_id: sessionId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ 记录行为日志失败:', error);
      }
    } catch (error) {
      console.error('❌ 记录行为日志异常:', error);
    }
  }

  /**
   * 保存聊天历史
   */
  async saveChatHistory(userId, projectId, prompt, response, metadata) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return;
    }

    try {
      const { error } = await this.supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          project_id: projectId,
          prompt,
          response,
          type: metadata.type || 'generate',
          metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ 保存聊天历史失败:', error);
      }
    } catch (error) {
      console.error('❌ 保存聊天历史异常:', error);
    }
  }

  /**
   * 获取用户列表 (管理员功能)
   */
  async getUsers(page = 1, limit = 50) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return { users: [], total: 0 };
    }

    try {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ 获取用户列表失败:', error);
        return { users: [], total: 0 };
      }

      return { users: data || [], total: count || 0 };
    } catch (error) {
      console.error('❌ 获取用户列表异常:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * 获取使用统计 (管理员功能)
   */
  async getUsageStats(startDate, endDate, userId = null) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return [];
    }

    try {
      let query = this.supabase
        .from('usage_stats')
        .select(`
          *,
          user_profiles!inner(username, role)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ 获取使用统计失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ 获取使用统计异常:', error);
      return [];
    }
  }
}

module.exports = new SupabaseService();