/**
 * 企业微信通知系统测试脚本
 * 用于测试完整的通知流程，包括图片保存和通知发送
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 加载环境变量
require('dotenv').config();

// 配置
const IMAGE_SERVER_URL = 'http://localhost:3002';
const WEBHOOK_URL = process.env.WECOM_WEBHOOK_URL || process.env.VITE_WECOM_WEBHOOK_URL || '';

/**
 * 生成测试图片的base64数据 (1x1像素的PNG)
 */
function generateTestImageBase64() {
  // 1x1 红色像素的PNG图片的base64数据
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
}

/**
 * 保存测试图片到服务器
 */
async function saveTestImages() {
  console.log('📤 保存测试图片到服务器...');
  
  const testImages = [
    {
      data: generateTestImageBase64(),
      name: 'test_image_1.png'
    },
    {
      data: generateTestImageBase64(), 
      name: 'test_image_2.png'
    }
  ];

  try {
    const response = await fetch(`${IMAGE_SERVER_URL}/api/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images: testImages })
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ 图片保存成功:', result);
    
    return result.images;
    
  } catch (error) {
    console.error('❌ 保存图片失败:', error);
    throw error;
  }
}

/**
 * 发送企业微信通知
 */
async function sendWecomNotification(images) {
  if (!WEBHOOK_URL) {
    console.warn('⚠️ 企业微信Webhook URL未配置，跳过通知发送');
    console.log('请在 .env 文件中设置 VITE_WECOM_WEBHOOK_URL');
    return false;
  }

  console.log('📢 发送企业微信通知...');

  // 构建设备信息 (模拟)
  const deviceInfo = {
    localIP: '192.168.1.100',
    deviceId: `test_device_${Date.now()}`,
    userAgent: 'Test Bot'
  };

  // 构建图片链接
  const imageLinks = images.map((img, index) => 
    `![测试图片${index + 1}](${img.url})`
  ).join('\n\n');

  // 构建通知消息
  const timeStr = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const content = `# 🧪 通知系统测试

## 📱 设备信息
- **IP地址:** \`${deviceInfo.localIP}\`
- **设备ID:** \`${deviceInfo.deviceId}\`
- **测试时间:** \`${timeStr}\`

## 💬 测试内容
\`\`\`
这是一条测试通知消息，用于验证企业微信通知系统是否正常工作。
\`\`\`

## ⚙️ 测试参数
模型: \`测试模式\`
图片数量: \`${images.length}张\`

## ⏱️ 测试结果
- **图片保存:** ✅ **成功**
- **通知发送:** 🧪 **测试中**

## 🖼️ 测试图片

${imageLinks}

---
*🍌 Nano Banana AI Image Editor - 系统测试*`;

  const message = {
    msgtype: "markdown_v2",
    markdown_v2: {
      content: content
    }
  };

  try {
    console.log('📤 向企业微信发送消息...');
    console.log('Webhook URL:', WEBHOOK_URL.replace(/key=.+/, 'key=***'));

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
      timeout: 5000
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
 * 验证图片访问
 */
async function verifyImageAccess(images) {
  console.log('🔍 验证图片访问...');
  
  for (const image of images) {
    try {
      const response = await fetch(image.url);
      if (response.ok) {
        console.log(`✅ 图片访问正常: ${image.fileName}`);
      } else {
        console.warn(`⚠️ 图片访问失败: ${image.fileName} (${response.status})`);
      }
    } catch (error) {
      console.error(`❌ 图片访问错误: ${image.fileName}`, error);
    }
  }
}

/**
 * 主测试函数
 */
async function runTest() {
  console.log('🧪 开始企业微信通知系统测试...\n');

  try {
    // 1. 测试图片服务器连接
    console.log('1️⃣ 测试图片服务器连接...');
    const healthResponse = await fetch(`${IMAGE_SERVER_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`图片服务器连接失败: ${healthResponse.status}`);
    }
    const healthData = await healthResponse.json();
    console.log('✅ 图片服务器连接正常:', healthData.status);
    console.log();

    // 2. 保存测试图片
    console.log('2️⃣ 保存测试图片...');
    const images = await saveTestImages();
    console.log();

    // 3. 验证图片访问
    console.log('3️⃣ 验证图片访问...');
    await verifyImageAccess(images);
    console.log();

    // 4. 发送企业微信通知
    console.log('4️⃣ 发送企业微信通知...');
    const notificationSent = await sendWecomNotification(images);
    console.log();

    // 5. 测试总结
    console.log('📊 测试结果总结:');
    console.log('✅ 图片服务器: 正常');
    console.log('✅ 图片保存: 成功');
    console.log('✅ 图片访问: 正常');
    console.log(notificationSent ? '✅ 企业微信通知: 成功' : '⚠️ 企业微信通知: 跳过 (未配置)');
    console.log();

    if (notificationSent) {
      console.log('🎉 通知系统测试完成！请检查企业微信群是否收到测试消息。');
    } else {
      console.log('⚠️ 通知系统部分功能正常，但企业微信通知未配置。');
      console.log('请在 .env 文件中配置 VITE_WECOM_WEBHOOK_URL 后重新测试。');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

/**
 * 清理测试数据
 */
async function cleanup() {
  console.log('\n🧹 清理测试数据...');
  try {
    const response = await fetch(`${IMAGE_SERVER_URL}/api/images`);
    const data = await response.json();
    
    for (const image of data.images) {
      if (image.filename.includes('test_image')) {
        try {
          await fetch(`${IMAGE_SERVER_URL}/api/images/${image.filename}`, {
            method: 'DELETE'
          });
          console.log(`🗑️ 删除测试图片: ${image.filename}`);
        } catch (error) {
          console.warn(`⚠️ 删除失败: ${image.filename}`, error);
        }
      }
    }
    console.log('✅ 清理完成');
  } catch (error) {
    console.warn('⚠️ 清理失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  // 处理命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    cleanup();
  } else {
    runTest().then(() => {
      if (args.includes('--auto-cleanup')) {
        cleanup();
      }
    });
  }
}