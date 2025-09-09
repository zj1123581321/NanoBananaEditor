/**
 * 扩展的图片HTTP服务器
 * 支持图片存储、用户认证、Gemini API代理、使用统计和企业微信通知
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// 加载环境变量
require('dotenv').config();

// 导入服务和中间件
const supabaseService = require('./services/supabaseService.cjs');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('./middleware/auth.cjs');
const geminiRouter = require('./routes/gemini.cjs');
const adminRouter = require('./routes/admin.cjs');
const adminAuthRouter = require('./routes/adminAuth.cjs');

const app = express();
const PORT = process.env.IMAGE_SERVER_PORT || 3002;
const HOST = process.env.IMAGE_SERVER_HOST || '0.0.0.0';
const IMAGES_DIR = path.join(__dirname, '../generated_images');
const APP_MODE = process.env.VITE_APP_MODE || process.env.APP_MODE || 'standalone';

// 中间件配置
const allowedOrigins = [
  'http://localhost:3000',  // 生产前端
  'http://localhost:5173',  // 开发前端 (Vite)
  'http://localhost:5174',  // 备用前端端口
  'http://localhost:3003',  // 管理后台
];

// 在开发模式下允许更多源
if (process.env.NODE_ENV === 'development' || APP_MODE === 'multi-user') {
  allowedOrigins.push('http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3003');
}

app.use(cors({
  origin: function (origin, callback) {
    // 允许无 origin 的请求（如移动应用、Postman等）
    if (!origin) return callback(null, true);
    
    // 检查是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS阻止了来自 ${origin} 的请求`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
  credentials: true  // 允许携带认证信息
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, data);
  };
  
  next();
});

// 企业微信配置
const WECOM_WEBHOOK_URL = process.env.VITE_WECOM_WEBHOOK_URL || '';

/**
 * 确保必要目录存在
 */
async function ensureDirectoriesExist() {
  const dirs = [IMAGES_DIR, path.join(__dirname, '../logs')];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 创建目录: ${dir}`);
    }
  }
}

/**
 * 生成文件名
 */
function generateFileName(originalName, index = 0) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const ext = path.extname(originalName) || '.png';
  const baseName = path.basename(originalName, ext) || 'generated';
  return `${baseName}_${timestamp}${index > 0 ? `_${index}` : ''}${ext}`;
}

/**
 * 生成图片MD5校验值
 */
function generateMD5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Base64转Buffer
 */
function base64ToBuffer(base64String) {
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 format');
  }
  
  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  return { buffer, mimeType };
}

/**
 * 健康检查接口
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mode: APP_MODE,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    port: PORT,
    imagesDir: IMAGES_DIR,
    features: {
      images: true,
      auth: APP_MODE === 'multi-user',
      gemini: APP_MODE === 'multi-user',
      admin: APP_MODE === 'multi-user',
      notifications: !!WECOM_WEBHOOK_URL,
      supabase: supabaseService.isMultiUserMode() && supabaseService.initialized
    }
  });
});

// ====== 图片相关 API ======

/**
 * 保存图片接口 - 支持可选认证
 * POST /api/images
 */
app.post('/api/images', optionalAuthMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { images } = req.body;
    const userId = req.user?.id;
    
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ 
        error: '请提供有效的图片数据数组',
        code: 'INVALID_IMAGE_DATA'
      });
    }

    // 记录操作开始
    if (userId) {
      await supabaseService.logAction(userId, 'image_save_start', {
        imageCount: images.length
      });
    }

    const savedImages = [];

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      
      if (!imageData.data) {
        console.warn(`图片 ${i} 缺少数据`);
        continue;
      }

      try {
        // 转换base64到buffer
        const { buffer, mimeType } = base64ToBuffer(imageData.data);
        
        // 生成文件名
        const fileName = generateFileName(imageData.name || 'generated', i);
        const filePath = path.join(IMAGES_DIR, fileName);
        
        // 保存文件
        await fs.writeFile(filePath, buffer);
        
        // 生成访问URL
        const serverUrl = `http://${req.get('host') || `localhost:${PORT}`}`;
        const imageUrl = `${serverUrl}/images/${fileName}`;
        
        // 计算文件信息
        const stats = await fs.stat(filePath);
        const md5 = generateMD5(buffer);
        
        savedImages.push({
          id: crypto.randomUUID(),
          fileName,
          url: imageUrl,
          size: stats.size,
          mimeType,
          md5,
          createdAt: new Date().toISOString()
        });

        console.log(`💾 保存图片: ${fileName} (${(stats.size / 1024).toFixed(1)}KB)`);
        
      } catch (error) {
        console.error(`保存图片 ${i} 失败:`, error);
        savedImages.push({
          error: `保存图片 ${i} 失败: ${error.message}`
        });
      }
    }

    const processingTime = Date.now() - startTime;
    
    // 记录操作完成
    if (userId) {
      await supabaseService.logAction(userId, 'image_save_success', {
        imageCount: images.length,
        savedCount: savedImages.filter(img => !img.error).length,
        processingTime
      });
    }

    res.json({
      success: true,
      count: savedImages.filter(img => !img.error).length,
      images: savedImages,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('保存图片失败:', error);
    
    // 记录错误
    if (req.user?.id) {
      await supabaseService.logAction(req.user.id, 'image_save_error', {
        error: error.message,
        processingTime
      });
    }
    
    res.status(500).json({ 
      error: '保存图片失败',
      code: 'IMAGE_SAVE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 静态图片服务 - 直接访问图片
 * GET /images/:filename
 */
app.use('/images', express.static(IMAGES_DIR, {
  maxAge: '7d',
  setHeaders: (res, path, stat) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=604800',
      'X-Content-Type-Options': 'nosniff'
    });
  }
}));

/**
 * 获取图片信息接口
 * GET /api/images/:filename/info
 */
app.get('/api/images/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(IMAGES_DIR, filename);
    
    try {
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      const md5 = generateMD5(buffer);
      
      res.json({
        filename,
        size: stats.size,
        md5,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      });
    } catch (error) {
      res.status(404).json({ 
        error: '图片不存在',
        code: 'IMAGE_NOT_FOUND'
      });
    }
    
  } catch (error) {
    console.error('获取图片信息失败:', error);
    res.status(500).json({ 
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * 获取图片列表接口 - 支持分页
 * GET /api/images
 */
app.get('/api/images', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const files = await fs.readdir(IMAGES_DIR);
    const imageFiles = files.filter(file => 
      /\.(png|jpe?g|gif|webp)$/i.test(file)
    ).sort((a, b) => b.localeCompare(a)); // 按文件名倒序排列
    
    // 分页
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFiles = imageFiles.slice(offset, offset + parseInt(limit));
    
    const images = await Promise.all(
      paginatedFiles.map(async (filename) => {
        try {
          const filePath = path.join(IMAGES_DIR, filename);
          const stats = await fs.stat(filePath);
          const serverUrl = `http://${req.get('host') || `localhost:${PORT}`}`;
          
          return {
            filename,
            url: `${serverUrl}/images/${filename}`,
            size: stats.size,
            createdAt: stats.birthtime.toISOString()
          };
        } catch (error) {
          console.error(`获取文件 ${filename} 信息失败:`, error);
          return null;
        }
      })
    );
    
    res.json({
      success: true,
      data: images.filter(img => img !== null),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: imageFiles.length,
        pages: Math.ceil(imageFiles.length / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({ 
      error: '获取图片列表失败',
      code: 'IMAGE_LIST_ERROR'
    });
  }
});

/**
 * 删除图片接口 - 需要认证
 * DELETE /api/images/:filename
 */
app.delete('/api/images/:filename', authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id;
    const filePath = path.join(IMAGES_DIR, filename);
    
    try {
      await fs.unlink(filePath);
      
      // 记录删除操作
      await supabaseService.logAction(userId, 'image_delete', {
        filename
      });
      
      console.log(`🗑️ 删除图片: ${filename} (用户: ${userId})`);
      
      res.json({ 
        success: true, 
        message: '图片删除成功' 
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ 
          error: '图片不存在',
          code: 'IMAGE_NOT_FOUND'
        });
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({ 
      error: '删除图片失败',
      code: 'IMAGE_DELETE_ERROR'
    });
  }
});

// ====== 企业微信通知 API ======

/**
 * 企业微信通知接口
 * POST /api/wecom/notify
 */
app.post('/api/wecom/notify', optionalAuthMiddleware, async (req, res) => {
  try {
    if (!WECOM_WEBHOOK_URL) {
      return res.status(400).json({ 
        success: false, 
        error: '企业微信Webhook URL未配置',
        code: 'WECOM_NOT_CONFIGURED'
      });
    }

    const notificationData = req.body;
    const userId = req.user?.id;
    
    console.log('📢 收到企微通知请求:', {
      userId,
      deviceIP: notificationData.deviceInfo?.localIP,
      prompt: notificationData.prompt?.substring(0, 50) + '...',
      imageCount: notificationData.images?.length || 0
    });

    // 记录通知操作
    if (userId) {
      await supabaseService.logAction(userId, 'wecom_notification', {
        deviceIP: notificationData.deviceInfo?.localIP,
        imageCount: notificationData.images?.length || 0
      });
    }

    // 构建通知消息
    const message = buildWecomMessage(notificationData);
    
    // 发送到企业微信
    const response = await fetch(WECOM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`企微 API错误: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    if (result.errcode !== 0) {
      throw new Error(`企微通知失败: ${result.errmsg} (错误码: ${result.errcode})`);
    }

    console.log('✅ 企业微信通知发送成功');
    
    res.json({ 
      success: true, 
      message: '通知发送成功' 
    });
    
  } catch (error) {
    console.error('❌ 企业微信通知发送失败:', error);
    
    // 记录错误
    if (req.user?.id) {
      await supabaseService.logAction(req.user.id, 'wecom_notification_error', {
        error: error.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || '发送通知失败',
      code: 'WECOM_SEND_ERROR'
    });
  }
});

/**
 * 构建企业微信消息格式
 */
function buildWecomMessage(data) {
  const {
    deviceInfo,
    prompt,
    parameters,
    images,
    processingTime,
    timestamp
  } = data;

  const timeStr = new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const paramInfo = [];
  if (parameters.model) paramInfo.push(`模型: \`${parameters.model}\``);
  if (parameters.temperature !== undefined) paramInfo.push(`温度: \`${parameters.temperature}\``);
  if (parameters.seed !== undefined) paramInfo.push(`种子: \`${parameters.seed}\``);

  const imageLinks = images.map((img, index) => 
    `![生成图片${index + 1}](${img.url})`
  ).join('\n\n');

  const content = `# 🎨 AI图片生成完成通知

## 📱 设备信息
- **IP地址:** \`${deviceInfo.localIP}\`
- **设备ID:** \`${deviceInfo.deviceId}\`
- **生成时间:** \`${timeStr}\`

## 💬 用户提示词
\`\`\`
${prompt}
\`\`\`

## ⚙️ 生成参数
${paramInfo.length > 0 ? paramInfo.join('\n') : '默认参数'}

## ⏱️ 处理结果
- **生成数量:** \`${images.length}张\`
- **处理耗时:** \`${(processingTime / 1000).toFixed(1)}秒\`
- **状态:** ✅ **成功**

## 🖼️ 生成结果

${imageLinks}

---
*🍌 Nano Banana AI Image Editor*`;

  return {
    msgtype: "markdown_v2",
    markdown_v2: {
      content: content
    }
  };
}

// ====== 多用户模式下的额外 API ======

if (APP_MODE === 'multi-user') {
  // Gemini API 代理路由
  app.use('/api/gemini', geminiRouter);
  
  // 管理员认证路由
  app.use('/api/admin/auth', adminAuthRouter);
  
  // 管理员路由
  app.use('/api/admin', adminRouter);
  
  console.log('✅ 多用户模式已启用');
  console.log('🔐 Gemini API 代理已启用');
  console.log('⚙️ 管理员功能已启用');
} else {
  console.log('ℹ️ 单用户模式运行');
}

// ====== 错误处理 ======

/**
 * 404处理
 */
app.use((req, res) => {
  res.status(404).json({ 
    error: '接口不存在',
    code: 'NOT_FOUND',
    path: req.path
  });
});

/**
 * 错误处理中间件
 */
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  
  res.status(500).json({ 
    error: '服务器内部错误',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ====== 服务器启动 ======

async function startServer() {
  try {
    await ensureDirectoriesExist();
    
    const server = app.listen(PORT, HOST, () => {
      console.log('🍌 Nano Banana 扩展图片服务器启动成功!');
      console.log(`📡 服务地址: http://${HOST}:${PORT}`);
      console.log(`📁 图片目录: ${IMAGES_DIR}`);
      console.log(`🔧 运行模式: ${APP_MODE}`);
      console.log(`🔗 健康检查: http://${HOST}:${PORT}/health`);
      
      if (APP_MODE === 'multi-user') {
        console.log('🔐 用户认证功能已启用');
        console.log('📊 使用统计功能已启用');
      }
      
      if (WECOM_WEBHOOK_URL) {
        console.log('📢 企业微信通知已配置');
      } else {
        console.log('⚠️ 企业微信通知未配置');
      }
    });

    // 优雅关闭处理
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 收到${signal}信号，正在优雅关闭...`);
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    process.exit(1);
  }
}

// 直接启动服务器
startServer();