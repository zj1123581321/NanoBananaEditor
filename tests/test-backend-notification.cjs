/**
 * 测试后端企微通知API
 */

const fs = require('fs').promises;
const path = require('path');

// 加载环境变量
require('dotenv').config();

// 配置
const IMAGE_SERVER_URL = 'http://localhost:3002';

/**
 * 测试后端企微通知API
 */
async function testBackendNotification() {
  console.log('🧪 开始测试后端企微通知API...\n');

  try {
    // 构建测试通知数据
    const testNotificationData = {
      deviceInfo: {
        localIP: '192.168.1.100',
        deviceId: 'test_device_backend_123',
        userAgent: 'Test Browser - Backend API',
        timestamp: Date.now()
      },
      prompt: '这是通过后端API发送的测试通知消息',
      parameters: {
        model: 'Gemini 2.5 Flash - Backend',
        temperature: 0.8,
        seed: 54321
      },
      images: [
        {
          id: 'test-backend-1',
          fileName: 'backend_test_image.png',
          url: 'http://localhost:3002/images/test_backend.png',
          size: 2048,
          mimeType: 'image/png',
          md5: 'backend_test_md5_hash',
          createdAt: new Date().toISOString()
        }
      ],
      processingTime: 3500,
      timestamp: Date.now()
    };

    console.log('📤 发送通知请求到后端API...');
    console.log('请求URL:', `${IMAGE_SERVER_URL}/api/wecom/notify`);

    const response = await fetch(`${IMAGE_SERVER_URL}/api/wecom/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testNotificationData)
    });

    console.log('响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP错误 ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ 响应结果:', result);

    if (result.success) {
      console.log('\n🎉 后端企微通知API测试成功！');
      console.log('📱 请检查企业微信群是否收到来自后端的测试消息。');
    } else {
      console.log('❌ 后端API返回失败:', result.error);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testBackendNotification();
}