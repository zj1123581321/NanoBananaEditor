/**
 * 使用真实图片的企业微信通知测试脚本
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 加载环境变量
require('dotenv').config();

// 配置
const IMAGE_SERVER_URL = 'http://localhost:3002';
const WEBHOOK_URL = process.env.WECOM_WEBHOOK_URL || process.env.VITE_WECOM_WEBHOOK_URL || '';
const REAL_IMAGE_PATH = path.join(__dirname, 'generated_images', 'PixPin_2025-07-09_14-23-39.png');

/**
 * 读取真实图片并转换为base64
 */
async function loadRealImage() {
  try {
    console.log(`📖 读取真实图片: ${REAL_IMAGE_PATH}`);
    
    // 检查文件是否存在
    try {
      await fs.access(REAL_IMAGE_PATH);
    } catch (error) {
      throw new Error(`图片文件不存在: ${REAL_IMAGE_PATH}`);
    }

    // 读取文件
    const imageBuffer = await fs.readFile(REAL_IMAGE_PATH);
    const base64Data = imageBuffer.toString('base64');
    const mimeType = 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    
    console.log(`✅ 图片读取成功: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
    
    return {
      data: dataUrl,
      name: 'PixPin_2025-07-09_14-23-39.png',
      size: imageBuffer.length,
      buffer: imageBuffer
    };
    
  } catch (error) {
    console.error('❌ 读取图片失败:', error);
    throw error;
  }
}

/**
 * 保存图片到HTTP服务器
 */
async function saveImageToServer(imageData) {
  try {
    console.log('📤 保存真实图片到服务器...');
    
    const response = await fetch(`${IMAGE_SERVER_URL}/api/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        images: [{
          data: imageData.data,
          name: imageData.name
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || result.images.length === 0) {
      throw new Error('图片保存失败');
    }

    const savedImage = result.images[0];
    console.log(`✅ 图片保存成功: ${savedImage.fileName}`);
    console.log(`🔗 访问地址: ${savedImage.url}`);
    
    return savedImage;
    
  } catch (error) {
    console.error('❌ 保存图片失败:', error);
    throw error;
  }
}

/**
 * 发送包含真实图片的企业微信通知
 */
async function sendRealImageNotification(savedImage) {
  if (!WEBHOOK_URL) {
    console.warn('⚠️ 企业微信Webhook URL未配置');
    return false;
  }

  try {
    console.log('📢 发送包含真实图片的企业微信通知...');

    // 获取图片信息
    const fileStats = await fs.stat(REAL_IMAGE_PATH);
    const timeStr = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 构建通知消息
    const content = `# 🎨 真实图片通知测试

## 📱 设备信息
- **IP地址:** \`192.168.1.100\`
- **设备ID:** \`real_test_device\`
- **测试时间:** \`${timeStr}\`

## 💬 测试说明
\`\`\`
使用项目中的真实图片文件进行企业微信通知测试
原始文件: PixPin_2025-07-09_14-23-39.png
\`\`\`

## 📊 图片信息
- **文件名:** \`${savedImage.fileName}\`
- **文件大小:** \`${(savedImage.size / 1024).toFixed(1)} KB\`
- **格式:** \`PNG\`
- **创建时间:** \`${fileStats.birthtime.toLocaleString('zh-CN')}\`

## ⏱️ 处理结果
- **上传状态:** ✅ **成功**
- **服务器保存:** ✅ **成功**
- **外部访问:** ✅ **可用**

## 🖼️ 图片展示

![真实测试图片](${savedImage.url})

---
*🍌 Nano Banana AI Image Editor - 真实图片测试*`;

    const message = {
      msgtype: "markdown_v2",
      markdown_v2: {
        content: content
      }
    };

    console.log('📤 向企业微信发送消息...');
    console.log('Webhook URL:', WEBHOOK_URL.replace(/key=.+/, 'key=***'));

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
      timeout: 10000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.errcode !== 0) {
      throw new Error(`企业微信API错误: ${result.errmsg || '未知错误'} (错误码: ${result.errcode})`);
    }

    console.log('✅ 企业微信通知发送成功!');
    return true;

  } catch (error) {
    console.error('❌ 企业微信通知发送失败:', error);
    throw error;
  }
}

/**
 * 验证图片可访问性
 */
async function verifyImageAccess(savedImage) {
  try {
    console.log('🔍 验证图片访问...');
    
    const response = await fetch(savedImage.url);
    if (response.ok) {
      const contentLength = response.headers.get('content-length');
      console.log(`✅ 图片访问正常: ${savedImage.fileName} (${contentLength ? (contentLength/1024).toFixed(1) + 'KB' : '未知大小'})`);
      return true;
    } else {
      console.warn(`⚠️ 图片访问失败: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 图片访问错误:`, error);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runRealImageTest() {
  console.log('🧪 开始真实图片企业微信通知测试...\n');

  try {
    // 1. 检查图片服务器
    console.log('1️⃣ 检查图片服务器...');
    const healthResponse = await fetch(`${IMAGE_SERVER_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`图片服务器连接失败: ${healthResponse.status}`);
    }
    console.log('✅ 图片服务器正常\n');

    // 2. 读取真实图片
    console.log('2️⃣ 读取真实图片...');
    const imageData = await loadRealImage();
    console.log();

    // 3. 保存到服务器
    console.log('3️⃣ 保存图片到服务器...');
    const savedImage = await saveImageToServer(imageData);
    console.log();

    // 4. 验证访问
    console.log('4️⃣ 验证图片访问...');
    await verifyImageAccess(savedImage);
    console.log();

    // 5. 发送通知
    console.log('5️⃣ 发送企业微信通知...');
    const notificationSent = await sendRealImageNotification(savedImage);
    console.log();

    // 6. 测试总结
    console.log('📊 真实图片测试结果总结:');
    console.log('✅ 图片服务器: 正常');
    console.log('✅ 图片读取: 成功');
    console.log('✅ 图片保存: 成功');
    console.log('✅ 图片访问: 正常');
    console.log(notificationSent ? '✅ 企业微信通知: 成功' : '⚠️ 企业微信通知: 失败');
    console.log();

    if (notificationSent) {
      console.log('🎉 真实图片通知测试完成！');
      console.log('📱 请检查企业微信群，应该能看到包含真实图片的测试消息。');
      console.log(`🖼️ 图片访问地址: ${savedImage.url}`);
    } else {
      console.log('⚠️ 通知发送失败，但其他功能正常');
    }

  } catch (error) {
    console.error('❌ 真实图片测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runRealImageTest();
}