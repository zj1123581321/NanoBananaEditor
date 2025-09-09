/**
 * 认证中间件
 * 负责验证用户身份和权限
 */
const supabaseService = require('../services/supabaseService.cjs');

/**
 * 用户认证中间件
 */
async function authMiddleware(req, res, next) {
  try {
    // 单用户模式下跳过认证
    if (!supabaseService.isMultiUserMode()) {
      req.user = { 
        id: 'standalone', 
        email: 'standalone@local',
        role: 'user'
      };
      return next();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const { user, error } = await supabaseService.verifyUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ 认证中间件异常:', error);
    res.status(500).json({ 
      error: 'Authentication verification failed',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
}

/**
 * 管理员权限中间件
 */
async function adminMiddleware(req, res, next) {
  try {
    // 单用户模式下跳过认证
    if (!supabaseService.isMultiUserMode()) {
      req.user = { 
        id: 'standalone', 
        email: 'standalone@local',
        role: 'admin'
      };
      return next();
    }

    // 多用户模式下需要验证管理员JWT token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'nano-banana-admin-secret-key-2024';
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No admin token provided',
        code: 'ADMIN_TOKEN_MISSING'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Admin access required',
          code: 'ADMIN_INSUFFICIENT_PRIVILEGES'
        });
      }

      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Admin token expired',
          code: 'ADMIN_TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({ 
        error: 'Invalid admin token',
        code: 'ADMIN_TOKEN_INVALID'
      });
    }
    
  } catch (error) {
    console.error('❌ 管理员权限验证异常:', error);
    res.status(500).json({ 
      error: 'Admin verification failed',
      code: 'AUTH_ADMIN_ERROR'
    });
  }
}

/**
 * 可选认证中间件 - 不强制要求登录
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !supabaseService.isMultiUserMode()) {
      req.user = null;
      return next();
    }

    const { user } = await supabaseService.verifyUser(token);
    req.user = user;
    next();
  } catch (error) {
    // 可选认证失败时不阻止请求
    req.user = null;
    next();
  }
}

module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware
};