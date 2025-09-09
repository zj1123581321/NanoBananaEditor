/**
 * 管理员认证路由
 * 负责管理员登录、注销和权限验证
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT 密钥 (生产环境应该使用更安全的密钥)
const JWT_SECRET = process.env.JWT_SECRET || 'nano-banana-admin-secret-key-2024';

/**
 * 管理员登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required',
        code: 'ADMIN_LOGIN_MISSING_FIELDS'
      });
    }

    // 从环境变量获取管理员凭据
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminPasswordHash) {
      console.error('❌ ADMIN_PASSWORD_HASH not configured');
      return res.status(500).json({
        error: 'Admin authentication not configured',
        code: 'ADMIN_CONFIG_ERROR'
      });
    }

    // 验证用户名
    if (username !== adminUsername) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'ADMIN_LOGIN_INVALID'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, adminPasswordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'ADMIN_LOGIN_INVALID'
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        id: 'admin',
        username: adminUsername,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { 
        expiresIn: '24h' // token 24小时有效
      }
    );

    console.log(`✅ 管理员登录成功: ${username}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: 'admin',
          username: adminUsername,
          role: 'admin'
        },
        expiresIn: 24 * 60 * 60 * 1000 // 24小时，毫秒
      }
    });

  } catch (error) {
    console.error('❌ 管理员登录异常:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'ADMIN_LOGIN_ERROR'
    });
  }
});

/**
 * 验证管理员token
 */
router.post('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'ADMIN_TOKEN_MISSING'
      });
    }

    // 验证JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Invalid admin token',
        code: 'ADMIN_TOKEN_INVALID'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role
        },
        valid: true
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'ADMIN_TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'ADMIN_TOKEN_EXPIRED'
      });
    }

    console.error('❌ 管理员token验证异常:', error);
    res.status(500).json({
      error: 'Token verification failed',
      code: 'ADMIN_TOKEN_ERROR'
    });
  }
});

/**
 * 管理员注销 (可选，主要用于清理服务器端状态)
 */
router.post('/logout', async (req, res) => {
  try {
    // JWT是无状态的，实际注销由前端处理（删除本地token）
    // 这里可以记录注销日志或处理其他清理工作
    
    console.log('📝 管理员注销');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ 管理员注销异常:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'ADMIN_LOGOUT_ERROR'
    });
  }
});

/**
 * 获取当前管理员信息
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'ADMIN_TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Invalid admin token',
        code: 'ADMIN_TOKEN_INVALID'
      });
    }

    res.json({
      success: true,
      data: {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        loginTime: new Date(decoded.iat * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 获取管理员信息异常:', error);
    res.status(401).json({
      error: 'Unauthorized',
      code: 'ADMIN_UNAUTHORIZED'
    });
  }
});

module.exports = router;