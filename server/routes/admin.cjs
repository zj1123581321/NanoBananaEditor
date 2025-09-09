/**
 * 管理员路由
 * 负责用户管理和系统统计
 */
const express = require('express');
const { adminMiddleware } = require('../middleware/auth.cjs');
const supabaseService = require('../services/supabaseService.cjs');
const router = express.Router();

/**
 * 获取所有用户列表
 */
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const result = await supabaseService.getUsers(
      parseInt(page),
      parseInt(limit)
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
 * 获取系统统计概览
 */
router.get('/stats/overview', adminMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const stats = await supabaseService.getUsageStats(startDate, endDate);

    // 计算汇总统计
    const overview = stats.reduce((acc, stat) => {
      acc.totalTokens += stat.token_consumed || 0;
      acc.totalRequests += stat.request_count || 0;
      acc.totalGenerations += stat.generation_count || 0;
      acc.totalEdits += stat.edit_count || 0;
      return acc;
    }, {
      totalTokens: 0,
      totalRequests: 0,
      totalGenerations: 0,
      totalEdits: 0
    });

    // 按用户统计
    const userStats = stats.reduce((acc, stat) => {
      const username = stat.user_profiles?.username || 'Unknown';
      if (!acc[username]) {
        acc[username] = {
          username,
          tokens: 0,
          requests: 0,
          generations: 0,
          edits: 0
        };
      }
      acc[username].tokens += stat.token_consumed || 0;
      acc[username].requests += stat.request_count || 0;
      acc[username].generations += stat.generation_count || 0;
      acc[username].edits += stat.edit_count || 0;
      return acc;
    }, {});

    // 按日期统计
    const dailyStats = stats.reduce((acc, stat) => {
      const date = stat.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          tokens: 0,
          requests: 0,
          generations: 0,
          edits: 0
        };
      }
      acc[date].tokens += stat.token_consumed || 0;
      acc[date].requests += stat.request_count || 0;
      acc[date].generations += stat.generation_count || 0;
      acc[date].edits += stat.edit_count || 0;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        overview,
        userStats: Object.values(userStats),
        dailyStats: Object.values(dailyStats).sort((a, b) => b.date.localeCompare(a.date)),
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
          requests: 0
        };
      }
      acc[key].generations += stat.generation_count || 0;
      acc[key].tokens += stat.token_consumed || 0;
      acc[key].requests += stat.request_count || 0;
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(groupedStats).sort((a, b) => a.date.localeCompare(b.date))
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
      const username = stat.user_profiles?.username || 'Unknown';
      if (!acc[username]) {
        acc[username] = { name: username, value: 0 };
      }
      acc[username].value += stat.token_consumed || 0;
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(tokensByUser)
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
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    // 这里应该从实际的日志存储获取数据
    // 暂时返回模拟数据
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

    res.json({
      success: true,
      data: {
        logs: mockLogs,
        total: mockLogs.length
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
      appMode: process.env.VITE_APP_MODE || process.env.APP_MODE || 'standalone',
      features: {
        multiUser: (process.env.VITE_APP_MODE || process.env.APP_MODE) === 'multi-user',
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
      mode: process.env.VITE_APP_MODE || process.env.APP_MODE || 'standalone',
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