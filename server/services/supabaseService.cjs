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
    const mode = process.env.VITE_APP_MODE;
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
        .from('ai_image_editor_action_logs')
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
        .from('ai_image_editor_chat_history')
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
   * 创建用户配置信息 (管理员功能)
   */
  async createUser(userData) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return { user: null, error: new Error('Supabase not available') };
    }

    try {
      const { data, error } = await this.supabase
        .from('ai_image_editor_user_profiles')
        .insert({
          id: userData.id,
          username: userData.username,
          role: userData.role || 'user',
          status: userData.status || 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ 创建用户失败:', error);
        return { user: null, error };
      }

      return { user: data, error: null };
    } catch (error) {
      console.error('❌ 创建用户异常:', error);
      return { user: null, error };
    }
  }

  /**
   * 更新用户信息 (管理员功能)
   */
  async updateUser(userId, updateData) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return { user: null, error: new Error('Supabase not available') };
    }

    try {
      const { data, error } = await this.supabase
        .from('ai_image_editor_user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ 更新用户失败:', error);
        return { user: null, error };
      }

      return { user: data, error: null };
    } catch (error) {
      console.error('❌ 更新用户异常:', error);
      return { user: null, error };
    }
  }

  /**
   * 删除用户 (管理员功能)
   */
  async deleteUser(userId) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return { success: false, error: new Error('Supabase not available') };
    }

    try {
      const { error } = await this.supabase
        .from('ai_image_editor_user_profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('❌ 删除用户失败:', error);
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('❌ 删除用户异常:', error);
      return { success: false, error };
    }
  }

  /**
   * 获取用户列表 (管理员功能)
   */
  async getUsers(page = 1, limit = 50, search = '') {
    if (!this.isMultiUserMode() || !this.supabase) {
      return { users: [], total: 0 };
    }

    try {
      const offset = (page - 1) * limit;
      
      // 先获取用户 profiles
      let query = this.supabase
        .from('ai_image_editor_user_profiles')
        .select('*', { count: 'exact' });
      
      // 添加搜索条件（仅在 username 中搜索）
      if (search) {
        query = query.ilike('username', `%${search}%`);
      }
      
      const { data: profiles, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ 获取用户列表失败:', error);
        return { users: [], total: 0 };
      }

      // 获取对应的 auth.users 信息
      const userIds = profiles?.map(p => p.id) || [];
      let authUsers = [];
      
      if (userIds.length > 0) {
        try {
          const { data: authData } = await this.supabase.auth.admin.listUsers();
          authUsers = authData.users.filter(user => userIds.includes(user.id));
        } catch (authError) {
          console.warn('⚠️ 获取 Auth 用户信息失败:', authError);
        }
      }

      // 合并 profile 和 auth 信息，并获取统计数据
      const usersWithStats = await Promise.all((profiles || []).map(async (profile) => {
        const authUser = authUsers.find(u => u.id === profile.id);
        const userStats = await this.getUserStats(profile.id);
        
        return {
          ...profile,
          // 从 auth.users 中提取信息到顶层，以匹配前端期望
          email: authUser?.email || `${profile.username}@unknown`,
          created_at: authUser?.created_at || profile.created_at,
          last_sign_in_at: authUser?.last_sign_in_at,
          raw_user_meta_data: authUser?.raw_user_meta_data,
          // 添加用户统计信息
          user_stats: userStats
        };
      }));

      return { users: usersWithStats || [], total: count || 0 };
    } catch (error) {
      console.error('❌ 获取用户列表异常:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * 获取单个用户统计信息
   */
  async getUserStats(userId) {
    if (!this.isMultiUserMode() || !this.supabase) {
      return {
        generation_count: 0,
        total_tokens: 0,
        edit_count: 0,
        request_count: 0
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('ai_image_editor_usage_stats')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ 获取用户统计失败:', error);
        return {
          generation_count: 0,
          total_tokens: 0,
          edit_count: 0,
          request_count: 0
        };
      }

      // 汇总所有统计数据
      const stats = (data || []).reduce((acc, stat) => {
        acc.generation_count += stat.generation_count || 0;
        acc.total_tokens += stat.token_consumed || 0;
        acc.edit_count += stat.edit_count || 0;
        acc.request_count += stat.request_count || 0;
        return acc;
      }, {
        generation_count: 0,
        total_tokens: 0,
        edit_count: 0,
        request_count: 0
      });

      return stats;
    } catch (error) {
      console.error('❌ 获取用户统计异常:', error);
      return {
        generation_count: 0,
        total_tokens: 0,
        edit_count: 0,
        request_count: 0
      };
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
      // 分别获取统计数据和用户信息，然后手动关联
      let statsQuery = this.supabase
        .from('ai_image_editor_usage_stats')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (userId) {
        statsQuery = statsQuery.eq('user_id', userId);
      }

      const { data: statsData, error: statsError } = await statsQuery;

      if (statsError) {
        console.error('❌ 获取使用统计失败:', statsError);
        return [];
      }

      if (!statsData || statsData.length === 0) {
        return [];
      }

      // 获取相关的用户信息
      const userIds = [...new Set(statsData.map(stat => stat.user_id))];
      const { data: usersData, error: usersError } = await this.supabase
        .from('ai_image_editor_user_profiles')
        .select('id, username, role')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ 获取用户信息失败:', usersError);
        // 即使用户信息获取失败，也返回统计数据
        return statsData;
      }

      // 手动关联用户信息
      const usersMap = {};
      if (usersData) {
        usersData.forEach(user => {
          usersMap[user.id] = user;
        });
      }

      const enrichedStats = statsData.map(stat => ({
        ...stat,
        ai_image_editor_user_profiles: usersMap[stat.user_id] || null
      }));

      return enrichedStats;
    } catch (error) {
      console.error('❌ 获取使用统计异常:', error);
      return [];
    }
  }
}

module.exports = new SupabaseService();