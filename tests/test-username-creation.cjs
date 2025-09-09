/**
 * 测试基于用户名的用户创建功能
 */

const https = require('https');
const http = require('http');

class UsernameCreationTester {
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

  async testUsernamePasswordFormat() {
    this.log('测试前端 admin 界面的 username/password 格式...', 'test');
    
    const testData = {
      username: "testuser123",
      password: "password123",
      role: "user",
      status: "active",
      metadata: { note: "Test user created via username" }
    };

    try {
      const response = await this.makeRequest('POST', '/api/admin/users', testData);
      
      this.log(`响应状态: ${response.status}`, 'info');
      this.log(`响应数据: ${JSON.stringify(response.data, null, 2)}`, 'info');

      if (response.status === 200 && response.data.success) {
        this.log('✅ 用户名模式用户创建成功', 'success');
        return { success: true, data: response.data };
      } else {
        this.log(`❌ 用户名模式用户创建失败: ${response.data.error || '未知错误'}`, 'error');
        if (response.data.details) {
          this.log(`错误详情: ${response.data.details}`, 'error');
        }
        return { success: false, error: response.data };
      }
    } catch (error) {
      this.log(`❌ 请求异常: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testInvalidUsernameFormats() {
    this.log('测试无效用户名格式验证...', 'test');
    
    const invalidCases = [
      { username: "ab", password: "password123", expected: "太短" },
      { username: "a".repeat(51), password: "password123", expected: "太长" },
      { username: "test@user", password: "password123", expected: "包含@符号" },
      { username: "test user", password: "password123", expected: "包含空格" },
      { username: "test.user", password: "password123", expected: "包含点号" }
    ];

    let passedTests = 0;
    for (const testCase of invalidCases) {
      try {
        const response = await this.makeRequest('POST', '/api/admin/users', {
          username: testCase.username,
          password: testCase.password,
          role: "user",
          status: "active"
        });
        
        if (response.status === 400) {
          this.log(`✅ 正确拒绝了无效用户名 "${testCase.username}" (${testCase.expected})`, 'success');
          passedTests++;
        } else {
          this.log(`❌ 错误接受了无效用户名 "${testCase.username}" (${testCase.expected})`, 'error');
        }
      } catch (error) {
        this.log(`❌ 测试异常: ${error.message}`, 'error');
      }
    }

    return { passedTests, totalTests: invalidCases.length };
  }

  async testDirectApiFormat() {
    this.log('测试直接 API 调用的 id/username 格式...', 'test');
    
    const testData = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      username: "directapi123",
      role: "user",
      status: "active"
    };

    try {
      const response = await this.makeRequest('POST', '/api/admin/users', testData);
      
      this.log(`响应状态: ${response.status}`, 'info');
      this.log(`响应数据: ${JSON.stringify(response.data, null, 2)}`, 'info');

      if (response.status === 200 && response.data.success) {
        this.log('✅ 直接 API 格式测试通过', 'success');
        return { success: true, data: response.data };
      } else {
        this.log(`❌ 直接 API 格式测试失败: ${response.data.error || '未知错误'}`, 'error');
        if (response.data.details) {
          this.log(`错误详情: ${response.data.details}`, 'error');
        }
        return { success: false, error: response.data };
      }
    } catch (error) {
      this.log(`❌ 请求异常: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async runTests() {
    this.log('🍌 开始测试基于用户名的用户创建功能', 'info');
    this.log(`测试目标: ${this.baseUrl}`, 'info');
    
    let results = {
      usernamePassword: false,
      validation: { passedTests: 0, totalTests: 0 },
      directApi: false
    };

    // 测试 username/password 格式
    console.log('\n=== 测试 1: 前端 Admin 用户名模式 ===');
    const usernameTest = await this.testUsernamePasswordFormat();
    results.usernamePassword = usernameTest.success;
    
    // 测试用户名格式验证
    console.log('\n=== 测试 2: 用户名格式验证 ===');
    results.validation = await this.testInvalidUsernameFormats();
    
    // 测试直接 API 格式
    console.log('\n=== 测试 3: 直接 API 调用格式 ===');
    const directTest = await this.testDirectApiFormat();
    results.directApi = directTest.success;

    // 汇总结果
    console.log('\n📊 测试结果汇总');
    console.log('='.repeat(50));
    console.log(`前端用户名模式: ${results.usernamePassword ? '✅ 通过' : '❌ 失败'}`);
    console.log(`用户名格式验证: ${results.validation.passedTests}/${results.validation.totalTests} 通过`);
    console.log(`直接 API 格式: ${results.directApi ? '✅ 通过' : '❌ 失败'}`);
    
    const totalSuccess = results.usernamePassword && 
                        (results.validation.passedTests === results.validation.totalTests) && 
                        results.directApi;
    
    if (totalSuccess) {
      this.log('🎉 所有测试通过！用户名模式用户创建功能正常', 'success');
    } else {
      this.log('❌ 部分测试失败，需要检查问题', 'error');
    }

    return results;
  }
}

// 运行测试
async function main() {
  const tester = new UsernameCreationTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = UsernameCreationTester;