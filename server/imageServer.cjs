/**
 * 图片HTTP服务器
 * 提供图片存储和访问服务，支持企业微信直接访问
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// 加载环境变量
require('dotenv').config();

const app = express();
const PORT = process.env.IMAGE_SERVER_PORT || 3002;
const HOST = process.env.IMAGE_SERVER_HOST || '0.0.0.0';
const IMAGES_DIR = path.join(__dirname, '../generated_images');

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 企业微信配置
const WECOM_WEBHOOK_URL = process.env.WECOM_WEBHOOK_URL || process.env.VITE_WECOM_WEBHOOK_URL || '';

/**
 * 确保图片目录存在
 */
async function ensureImageDir() {
  try {
    await fs.access(IMAGES_DIR);
  } catch {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    console.log(`📁 创建图片目录: ${IMAGES_DIR}`);
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
    timestamp: new Date().toISOString(),
    port: PORT,
    imagesDir: IMAGES_DIR
  });
});

/**
 * 保存图片接口 - 接收base64图片数据
 * POST /api/images
 * Body: { images: [{ data: "base64...", name?: "filename" }] }
 */
app.post('/api/images', async (req, res) => {
  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: '请提供有效的图片数据数组' });
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

    res.json({
      success: true,
      count: savedImages.filter(img => !img.error).length,
      images: savedImages
    });

  } catch (error) {
    console.error('保存图片失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 静态图片服务 - 直接访问图片
 * GET /images/:filename
 */
app.use('/images', express.static(IMAGES_DIR, {
  maxAge: '7d', // 缓存7天
  setHeaders: (res, path, stat) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=604800', // 7天缓存
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
      res.status(404).json({ error: '图片不存在' });
    }
    
  } catch (error) {
    console.error('获取图片信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取图片列表接口
 * GET /api/images
 */
app.get('/api/images', async (req, res) => {
  try {
    const files = await fs.readdir(IMAGES_DIR);
    const imageFiles = files.filter(file => 
      /\.(png|jpe?g|gif|webp)$/i.test(file)
    );
    
    const images = await Promise.all(
      imageFiles.map(async (filename) => {
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
      count: images.filter(img => img !== null).length,
      images: images.filter(img => img !== null)
    });
    
  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 删除图片接口
 * DELETE /api/images/:filename
 */
app.delete('/api/images/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(IMAGES_DIR, filename);
    
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ 删除图片: ${filename}`);
      res.json({ success: true, message: '图片删除成功' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: '图片不存在' });
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 企业微信通知接口
 * POST /api/wecom/notify
 */
app.post('/api/wecom/notify', async (req, res) => {
  try {
    if (!WECOM_WEBHOOK_URL) {
      return res.status(400).json({ 
        success: false, 
        error: '企业微信Webhook URL未配置' 
      });
    }

    const notificationData = req.body;
    console.log('📢 收到企微通知请求:', {
      deviceIP: notificationData.deviceInfo?.localIP,
      prompt: notificationData.prompt?.substring(0, 50) + '...',
      imageCount: notificationData.images?.length || 0
    });

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
    res.status(500).json({ 
      success: false, 
      error: error.message || '发送通知失败' 
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

  // 格式化时间
  const timeStr = new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // 构建参数信息
  const paramInfo = [];
  if (parameters.model) paramInfo.push(`模型: \`${parameters.model}\``);
  if (parameters.temperature !== undefined) paramInfo.push(`温度: \`${parameters.temperature}\``);
  if (parameters.seed !== undefined) paramInfo.push(`种子: \`${parameters.seed}\``);

  // 构建图片链接列表
  const imageLinks = images.map((img, index) => 
    `![生成图片${index + 1}](${img.url})`
  ).join('\n\n');

  // 构建完整消息内容
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
${paramInfo.join('\n')}

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

/**
 * 404处理
 */
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

/**
 * 错误处理中间件
 */
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

/**
 * 启动服务器
 */
async function startServer() {
  try {
    await ensureImageDir();
    
    const server = app.listen(PORT, HOST, () => {
      console.log('🎨 Nano Banana 图片服务器启动成功!');
      console.log(`📡 服务地址: http://${HOST}:${PORT}`);
      console.log(`📁 图片目录: ${IMAGES_DIR}`);
      console.log(`🔗 健康检查: http://${HOST}:${PORT}/health`);
    });

    // 优雅关闭处理
    process.on('SIGTERM', () => {
      console.log('🛑 收到关闭信号，正在优雅关闭...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 收到中断信号，正在优雅关闭...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    process.exit(1);
  }
}

// 直接启动服务器
startServer();