/**
 * 测试用户创建 API 修复
 * 专门测试前端 admin 界面发送的 email/password 格式
 */

const https = require('https');
const http = require('http');

class UserCreationTester {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    // 使用正确的JWT token
    this.adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluIiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NzM5NTUxMCwiZXhwIjoxNzU3NDgxOTEwfQ._Jf6Bc2P1aWoPoPLnkQw1q7BhTlet3Sk8SMR84OY4aw';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    };
    console.log(`${emoji[type]} [${timestamp}] ${message}`);
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`,
          ...headers
        }
      };

      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: jsonData
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: { raw: responseData }
            });
          }
        });
      });

      req.on('error', reject);

      if (data && (method === 'POST' || method === 'PUT')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async testEmailPasswordFormat() {
    this.log('测试前端 admin 界面的 email/password 格式...', 'test');
    
    const testData = {
      email: "zhanglixing1688@qq.com",
      password: "jta3YVG6myp*xdm2xqt",
      metadata: { note: "" }
    };

    try {
      const response = await this.makeRequest('POST', '/api/admin/users', testData);
      
      this.log(`响应状态: ${response.status}`, 'info');
      this.log(`响应数据: ${JSON.stringify(response.data, null, 2)}`, 'info');

      if (response.status === 200 && response.data.success) {
        this.log('✅ 用户创建成功', 'success');
        return true;
      } else {
        this.log(`❌ 用户创建失败: ${response.data.error || '未知错误'}`, 'error');
        if (response.data.details) {
          this.log(`错误详情: ${response.data.details}`, 'error');
        }
        return false;
      }
    } catch (error) {
      this.log(`❌ 请求异常: ${error.message}`, 'error');
      return false;
    }
  }

  async testDirectApiFormat() {
    this.log('测试直接 API 调用的 id/username 格式...', 'test');
    
    const testData = {
      id: "test-user-123",
      username: "testuser123",
      role: "user",
      status: "active"
    };

    try {
      const response = await this.makeRequest('POST', '/api/admin/users', testData);
      
      this.log(`响应状态: ${response.status}`, 'info');
      this.log(`响应数据: ${JSON.stringify(response.data, null, 2)}`, 'info');

      if (response.status === 200 && response.data.success) {
        this.log('✅ 用户创建成功', 'success');
        return true;
      } else {
        this.log(`❌ 用户创建失败: ${response.data.error || '未知错误'}`, 'error');
        if (response.data.details) {
          this.log(`错误详情: ${response.data.details}`, 'error');
        }
        return false;
      }
    } catch (error) {
      this.log(`❌ 请求异常: ${error.message}`, 'error');
      return false;
    }
  }

  async runTests() {
    this.log('🍌 开始测试用户创建 API 修复', 'info');
    this.log(`测试目标: ${this.baseUrl}`, 'info');
    
    let results = {
      emailPassword: false,
      directApi: false
    };

    // 测试 email/password 格式 (前端 admin 界面)
    console.log('\n=== 测试 1: 前端 Admin 界面格式 ===');
    results.emailPassword = await this.testEmailPasswordFormat();
    
    // 测试直接 API 格式
    console.log('\n=== 测试 2: 直接 API 调用格式 ===');
    results.directApi = await this.testDirectApiFormat();

    // 汇总结果
    console.log('\n📊 测试结果汇总');
    console.log('='.repeat(40));
    console.log(`前端 Admin 格式 (email/password): ${results.emailPassword ? '✅ 通过' : '❌ 失败'}`);
    console.log(`直接 API 格式 (id/username): ${results.directApi ? '✅ 通过' : '❌ 失败'}`);
    
    if (results.emailPassword && results.directApi) {
      this.log('🎉 所有测试通过！API 修复成功', 'success');
    } else if (results.emailPassword) {
      this.log('✅ 前端 admin 格式修复成功', 'success');
    } else {
      this.log('❌ 仍有问题需要解决', 'error');
    }

    return results;
  }
}

// 运行测试
async function main() {
  const tester = new UserCreationTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = UserCreationTester;