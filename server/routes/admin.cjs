/**
 * 管理员路由
 * 负责用户管理和系统统计
 */
const express = require('express');
const crypto = require('crypto');
const { adminMiddleware } = require('../middleware/auth.cjs');
const supabaseService = require('../services/supabaseService.cjs');
const router = express.Router();

/**
 * 获取所有用户列表
 */
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    const result = await supabaseService.getUsers(
      parseInt(page),
      parseInt(limit),
      search
    );

    res.json({
      success: true,
      data: result.users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ 获取用户列表失败:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      code: 'ADMIN_USERS_ERROR'
    });
  }
});

/**
 * 创建新用户
 * 支持两种数据格式：
 * 1. 前端 admin 界面发送: {username, password, role, status, metadata}
 * 2. API 直接调用: {id, username, role, status}
 */
router.post('/users', adminMiddleware, async (req, res) => {
  try {
    let userData;
    
    // 检查前端 admin 界面的格式 (email/username/password)
    if (req.body.username && req.body.password) {
      const { email, username, password, role, status, metadata } = req.body;
      
      if (!email || !username || !password) {
        return res.status(400).json({
          error: 'Email, username and password are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // 验证用户名格式
      if (!/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
        return res.status(400).json({
          error: 'Username must be 3-50 characters long and contain only letters, numbers, underscores, and hyphens',
          code: 'VALIDATION_ERROR'
        });
      }

      // 生成唯一ID
      const userId = crypto.randomUUID();

      // 设置用户数据用于创建 profile
      userData = {
        id: userId,
        username,
        role: role || 'user',
        status: status || 'active'
      };

      // 可以选择使用 Supabase Auth 创建用户（如果需要认证功能）
      if (supabaseService.supabase && supabaseService.isMultiUserMode()) {
        try {
          // 使用真实邮箱地址进行 Supabase Auth 创建
          const { data: authData, error: authError } = await supabaseService.supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { 
              username,
              ...metadata 
            }
          });

          if (authError) {
            // 检查是否是邮箱已存在的错误
            if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
              // 邮箱已存在，尝试获取现有用户信息
              console.log('📧 邮箱已存在，尝试获取现有用户信息...');
              
              try {
                const { data: existingUsers } = await supabaseService.supabase.auth.admin.listUsers();
                const existingUser = existingUsers.users.find(u => u.email === email);
                
                if (existingUser) {
                  userData.id = existingUser.id;
                  console.log('✅ 找到现有用户，使用其 ID:', existingUser.id);
                } else {
                  return res.status(400).json({
                    error: 'Email already registered but user not found',
                    code: 'USER_LOOKUP_ERROR'
                  });
                }
              } catch (lookupError) {
                console.error('❌ 查找现有用户失败:', lookupError);
                return res.status(400).json({
                  error: 'Failed to lookup existing user',
                  code: 'USER_LOOKUP_ERROR'
                });
              }
            } else {
              // 其他 Auth 错误，停止创建
              console.error('❌ Supabase Auth 创建失败:', authError.message);
              return res.status(400).json({
                error: 'Failed to create user authentication',
                code: 'AUTH_CREATE_ERROR',
                details: authError.message
              });
            }
          } else {
            // 使用 Supabase 生成的 ID
            userData.id = authData.user.id;
            console.log('✅ Supabase Auth 用户创建成功，ID:', authData.user.id);
          }
        } catch (error) {
          console.error('❌ Supabase Auth 创建过程异常:', error.message);
          return res.status(500).json({
            error: 'Authentication service error',
            code: 'AUTH_SERVICE_ERROR',
            details: error.message
          });
        }
      }
    } 
    // API 直接调用的格式 (id/username)
    else {
      const { id, username, role, status } = req.body;

      if (!id || !username) {
        return res.status(400).json({
          error: 'User ID and username are required for direct API calls',
          code: 'VALIDATION_ERROR'
        });
      }

      userData = {
        id,
        username,
        role: role || 'user',
        status: status || 'active'
      };
    }

    // 创建用户 profile
    const result = await supabaseService.createUser(userData);

    if (result.error) {
      return res.status(400).json({
        error: 'Failed to create user profile',
        code: 'CREATE_USER_ERROR',
        details: result.error.message
      });
    }

    res.json({
      success: true,
      data: result.user
    });
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
    res.status(500).json({
      error: 'Failed to create user',
      code: 'ADMIN_CREATE_USER_ERROR'
    });
  }
});

/**
 * 更新用户信息
 */
router.put('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await supabaseService.updateUser(id, updateData);

    if (result.error) {
      return res.status(400).json({
        error: 'Failed to update user',
        code: 'UPDATE_USER_ERROR',
        details: result.error.message
      });
    }

    res.json({
      success: true,
      data: result.user
    });
  } catch (error) {
    console.error('❌ 更新用户失败:', error);
    res.status(500).json({
      error: 'Failed to update user',
      code: 'ADMIN_UPDATE_USER_ERROR'
    });
  }
});

/**
 * 删除用户
 */
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await supabaseService.deleteUser(id);

    if (result.error) {
      return res.status(400).json({
        error: 'Failed to delete user',
        code: 'DELETE_USER_ERROR',
        details: result.error.message
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('❌ 删除用户失败:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      code: 'ADMIN_DELETE_USER_ERROR'
    });
  }
});

/**
 * 重置用户密码
 */
router.post('/users/:id/reset-password', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabaseService.supabase || !supabaseService.isMultiUserMode()) {
      return res.status(400).json({
        error: 'Password reset not available in standalone mode',
        code: 'FEATURE_NOT_AVAILABLE'
      });
    }

    // 生成临时密码
    const tempPassword = generateTemporaryPassword();
    
    try {
      // 使用 Supabase Auth Admin API 重置用户密码
      const { data: userData, error: resetError } = await supabaseService.supabase.auth.admin.updateUserById(
        id,
        {
          password: tempPassword,
          email_confirm: true // 确保不需要邮箱确认
        }
      );

      if (resetError) {
        console.error('❌ Supabase 重置密码失败:', resetError);
        return res.status(400).json({
          error: 'Failed to reset user password',
          code: 'PASSWORD_RESET_ERROR',
          details: resetError.message
        });
      }

      // 记录密码重置操作
      await supabaseService.logAction(req.user?.id || 'admin', 'password_reset', {
        targetUserId: id,
        targetUserEmail: userData.user.email,
        resetBy: req.user?.username || 'admin'
      });

      console.log(`✅ 用户密码重置成功 - ID: ${id}, 临时密码已生成`);

      res.json({
        success: true,
        data: {
          message: 'Password reset successfully',
          temporaryPassword: tempPassword,
          userId: id,
          email: userData.user.email
        }
      });
    } catch (authError) {
      console.error('❌ 密码重置过程异常:', authError);
      return res.status(500).json({
        error: 'Password reset service error',
        code: 'AUTH_RESET_ERROR',
        details: authError.message
      });
    }
  } catch (error) {
    console.error('❌ 重置用户密码失败:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      code: 'ADMIN_PASSWORD_RESET_ERROR'
    });
  }
});

/**
 * 生成临时密码
 */
function generateTemporaryPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  
  // 确保包含至少一个大写字母、小写字母和数字
  password += chars.charAt(Math.floor(Math.random() * 26)); // 小写字母
  password += chars.charAt(26 + Math.floor(Math.random() * 26)); // 大写字母  
  password += chars.charAt(52 + Math.floor(Math.random() * 10)); // 数字
  
  // 添加其余字符至8位
  for (let i = 3; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // 打乱顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 获取系统统计概览
 */
router.get('/stats/overview', adminMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // 获取基础统计数据
    const stats = await supabaseService.getUsageStats(startDate, endDate);
    
    // 获取用户总数
    const { total: totalUsers } = await supabaseService.getUsers(1, 1);
    
    // 计算汇总统计 (支持新的数据库结构)
    const totals = stats.reduce((acc, stat) => {
      acc.totalTokens += stat.total_tokens || stat.token_consumed || 0;
      acc.totalRequests += stat.request_count || 0;
      acc.totalGenerations += stat.generation_count || 0;
      acc.totalEdits += stat.edit_count || 0;
      acc.totalCost += parseFloat(stat.total_cost_usd || 0);
      return acc;
    }, {
      totalTokens: 0,
      totalRequests: 0,
      totalGenerations: 0,
      totalEdits: 0,
      totalCost: 0
    });

    // 计算活跃用户数（最近7天内有操作的用户）
    const activeDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const recentStats = await supabaseService.getUsageStats(activeDate, endDate);
    const activeUsers = new Set(recentStats.map(stat => stat.user_id)).size;

    // 生成使用趋势数据（前端期望的格式）
    const usageTrendMap = {};
    stats.forEach(stat => {
      const date = stat.date;
      if (!usageTrendMap[date]) {
        usageTrendMap[date] = {
          date,
          generations: 0,
          tokens: 0
        };
      }
      usageTrendMap[date].generations += (stat.generation_count || 0) + (stat.edit_count || 0);
      usageTrendMap[date].tokens += stat.total_tokens || 0;
    });
    
    const usageTrend = Object.values(usageTrendMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // 最近14天

    // Token使用分布（按用户）
    const tokenDistributionMap = {};
    stats.forEach(stat => {
      const username = stat.ai_image_editor_user_profiles?.username || 'Unknown';
      if (!tokenDistributionMap[username]) {
        tokenDistributionMap[username] = {
          name: username,
          value: 0
        };
      }
      tokenDistributionMap[username].value += stat.total_tokens || 0;
    });
    
    const tokenDistribution = Object.values(tokenDistributionMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10

    // 最近活动（模拟数据，可以从action_logs表获取）
    const recentActivities = [
      {
        id: 1,
        userName: 'admin',
        action: 'generate',
        description: '生成了新图片',
        createdAt: new Date().toISOString(),
        userAvatar: null
      }
    ];

    // 按前端期望的格式返回数据
    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalGenerations: totals.totalGenerations + totals.totalEdits,
          totalTokens: totals.totalTokens,
          totalCost: totals.totalCost,
          activeUsers
        },
        usageTrend,
        tokenDistribution,
        recentActivities,
        period: {
          startDate,
          endDate,
          days: parseInt(days)
        }
      }
    });
  } catch (error) {
    console.error('❌ 获取统计概览失败:', error);
    res.status(500).json({
      error: 'Failed to fetch stats overview',
      code: 'ADMIN_STATS_ERROR'
    });
  }
});

/**
 * 获取详细使用统计
 */
router.get('/stats/detailed', adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, userId, page = 1, limit = 100 } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const stats = await supabaseService.getUsageStats(start, end, userId);

    // 分页
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedStats = stats.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: paginatedStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stats.length,
        pages: Math.ceil(stats.length / parseInt(limit))
      },
      filter: {
        startDate: start,
        endDate: end,
        userId
      }
    });
  } catch (error) {
    console.error('❌ 获取详细统计失败:', error);
    res.status(500).json({
      error: 'Failed to fetch detailed stats',
      code: 'ADMIN_DETAILED_STATS_ERROR'
    });
  }
});

/**
 * 获取使用统计（新路由，符合前端期望）
 */
router.get('/stats/usage', adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const stats = await supabaseService.getUsageStats(start, end);

    // 根据 groupBy 参数重新组织数据
    const groupedStats = stats.reduce((acc, stat) => {
      const key = stat.date; // 可以根据 groupBy 调整
      if (!acc[key]) {
        acc[key] = {
          date: key,
          generations: 0,
          tokens: 0,
          requests: 0,
          activeUsers: new Set()
        };
      }
      acc[key].generations += (stat.generation_count || 0) + (stat.edit_count || 0);
      acc[key].tokens += stat.total_tokens || 0;
      acc[key].requests += stat.request_count || 0;
      acc[key].activeUsers.add(stat.user_id);
      return acc;
    }, {});

    // 转换为前端期望的格式
    const chartData = Object.values(groupedStats).map(item => ({
      date: item.date,
      generations: item.generations,
      tokens: item.tokens,
      activeUsers: item.activeUsers.size
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 生成用户排行数据
    const userStats = {};
    stats.forEach(stat => {
      const username = stat.ai_image_editor_user_profiles?.username || 'Unknown';
      if (!userStats[username]) {
        userStats[username] = {
          email: username,
          tokens: 0,
          generations: 0,
          lastActive: stat.date
        };
      }
      userStats[username].tokens += stat.total_tokens || 0;
      userStats[username].generations += (stat.generation_count || 0) + (stat.edit_count || 0);
      if (stat.date > userStats[username].lastActive) {
        userStats[username].lastActive = stat.date;
      }
    });

    const userRanking = Object.values(userStats)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);

    // 用户活跃度数据
    const userActivity = Object.values(userStats)
      .map(user => ({
        name: user.email,
        value: user.generations
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        chartData,
        userRanking,
        userActivity
      }
    });
  } catch (error) {
    console.error('❌ 获取使用统计失败:', error);
    res.status(500).json({
      error: 'Failed to fetch usage stats',
      code: 'ADMIN_USAGE_STATS_ERROR'
    });
  }
});

/**
 * 获取Token统计（新路由，符合前端期望）
 */
router.get('/stats/tokens', adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const stats = await supabaseService.getUsageStats(start, end);

    // 按用户分组Token使用情况
    const tokensByUser = stats.reduce((acc, stat) => {
      const username = stat.ai_image_editor_user_profiles?.username || 'Unknown';
      if (!acc[username]) {
        acc[username] = { name: username, value: 0 };
      }
      acc[username].value += stat.total_tokens || 0;
      return acc;
    }, {});

    // 转换为前端期望的饼图数据格式
    const distribution = Object.values(tokensByUser)
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 用户

    res.json({
      success: true,
      data: {
        distribution
      }
    });
  } catch (error) {
    console.error('❌ 获取Token统计失败:', error);
    res.status(500).json({
      error: 'Failed to fetch token stats',
      code: 'ADMIN_TOKEN_STATS_ERROR'
    });
  }
});

/**
 * 获取操作日志（新路由，符合前端期望）
 */
router.get('/logs', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, action } = req.query;
    
    if (!supabaseService.isMultiUserMode() || !supabaseService.initialized) {
      // 非多用户模式返回模拟数据
      const mockLogs = [
        {
          id: 1,
          userName: 'admin',
          action: 'login',
          description: '管理员登录系统',
          createdAt: new Date().toISOString(),
          userAvatar: null
        }
      ];

      return res.json({
        success: true,
        data: {
          logs: mockLogs,
          total: mockLogs.length
        }
      });
    }

    // 从 Supabase 获取实际日志数据
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let logsQuery = supabaseService.supabase
      .from('ai_image_editor_action_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (startDate) {
      logsQuery = logsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      logsQuery = logsQuery.lte('created_at', endDate);
    }
    if (action) {
      logsQuery = logsQuery.eq('action', action);
    }

    const { data: logsData, error: logsError, count } = await logsQuery;

    if (logsError) {
      console.error('❌ 获取操作日志失败:', logsError);
      return res.status(500).json({
        error: 'Failed to fetch logs',
        code: 'ADMIN_LOGS_ERROR'
      });
    }

    // 获取用户信息以便显示用户名
    const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean) || [])];
    let usersMap = {};
    
    if (userIds.length > 0) {
      const { data: usersData } = await supabaseService.supabase
        .from('ai_image_editor_user_profiles')
        .select('id, username')
        .in('id', userIds);

      if (usersData) {
        usersData.forEach(user => {
          usersMap[user.id] = user;
        });
      }
    }

    // 转换日志格式以匹配前端期望
    const formattedLogs = (logsData || []).map(log => ({
      id: log.id,
      user_email: usersMap[log.user_id]?.username || 'Unknown',
      userName: usersMap[log.user_id]?.username || 'Unknown',
      action: log.action,
      description: log.details?.description || log.action,
      created_at: log.created_at,
      createdAt: log.created_at,
      userAvatar: null,
      details: log.details,
      tokens_used: log.details?.tokenUsed || log.details?.tokens_used,
      processing_time: log.details?.processingTime || log.details?.processing_time,
      ip_address: log.ip_address
    }));

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        total: count || formattedLogs.length
      }
    });
  } catch (error) {
    console.error('❌ 获取操作日志失败:', error);
    res.status(500).json({
      error: 'Failed to fetch logs',
      code: 'ADMIN_LOGS_ERROR'
    });
  }
});

/**
 * 获取系统配置（新路由，符合前端期望）
 */
router.get('/config', adminMiddleware, async (req, res) => {
  try {
    const config = {
      appMode: process.env.VITE_APP_MODE || 'standalone',
      features: {
        multiUser: process.env.VITE_APP_MODE === 'multi-user',
        notifications: !!process.env.VITE_WECOM_WEBHOOK_URL,
        supabase: supabaseService.isMultiUserMode() && supabaseService.initialized
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ 获取系统配置失败:', error);
    res.status(500).json({
      error: 'Failed to fetch system config',
      code: 'ADMIN_CONFIG_ERROR'
    });
  }
});

/**
 * 获取系统健康状态
 */
router.get('/health', adminMiddleware, async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      mode: process.env.VITE_APP_MODE || 'standalone',
      features: {
        supabase: supabaseService.isMultiUserMode() && supabaseService.initialized,
        imageServer: true,
        notifications: !!process.env.VITE_WECOM_WEBHOOK_URL
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('❌ 获取系统健康状态失败:', error);
    res.status(500).json({
      error: 'Failed to fetch system health',
      code: 'ADMIN_HEALTH_ERROR'
    });
  }
});

module.exports = router;