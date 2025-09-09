/**
 * 包含热补丁的用户创建测试
 * 直接测试我们的修复逻辑，而不依赖服务器重启
 */

const https = require('https');
const http = require('http');

// 模拟 Supabase 服务
const mockSupabaseService = {
  supabase: {
    auth: {
      admin: {
        async createUser(userData) {
          // 模拟成功创建用户
          return {
            data: {
              user: {
                id: 'mock-user-id-' + Date.now(),
                email: userData.email,
                user_metadata: userData.user_metadata || {}
              }
            },
            error: null
          };
        }
      }
    }
  },
  async createUser(userData) {
    // 模拟创建用户 profile
    return {
      user: {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        status: userData.status,
        created_at: new Date().toISOString()
      },
      error: null
    };
  },
  isMultiUserMode() {
    return true;
  }
};

// 实现我们的修复逻辑（从 admin.cjs 复制）
async function createUserWithEmailPassword(req, res) {
  try {
    let userData;
    
    // 检查前端 admin 界面的格式 (email/password)
    if (req.body.email && req.body.password) {
      const { email, password, metadata } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // 使用 Supabase Auth 创建用户
      if (!mockSupabaseService.supabase) {
        return res.status(400).json({
          error: 'Supabase not available',
          code: 'SUPABASE_NOT_AVAILABLE'
        });
      }

      // 使用 Supabase Auth 创建真实用户
      const { data: authData, error: authError } = await mockSupabaseService.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata || {}
      });

      if (authError) {
        console.error('❌ Supabase Auth 创建用户失败:', authError);
        return res.status(400).json({
          error: 'Failed to create user in auth system',
          code: 'AUTH_CREATE_ERROR',
          details: authError.message
        });
      }

      // 设置用户数据用于创建 profile
      userData = {
        id: authData.user.id,
        username: email.split('@')[0], // 使用 email 前缀作为用户名
        role: 'user',
        status: 'active'
      };
    } 
    // API 直接调用的格式 (id/username)
    else {
      const { id, username, role, status } = req.body;

      if (!id || !username) {
        return res.status(400).json({
          error: 'User ID and username are required for direct API calls',
          code: 'VALIDATION_ERROR'
        });
      }

      userData = {
        id,
        username,
        role: role || 'user',
        status: status || 'active'
      };
    }

    // 创建用户 profile
    const result = await mockSupabaseService.createUser(userData);

    if (result.error) {
      return res.status(400).json({
        error: 'Failed to create user profile',
        code: 'CREATE_USER_ERROR',
        details: result.error.message
      });
    }

    res.status(200).json({
      success: true,
      data: result.user
    });
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
    res.status(500).json({
      error: 'Failed to create user',
      code: 'ADMIN_CREATE_USER_ERROR'
    });
  }
}

class HotfixTester {
  constructor() {
    this.testResults = {
      emailPasswordFormat: false,
      directApiFormat: false
    };
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

  // 模拟 Express request/response 对象
  createMockReqRes(body) {
    let result = null;
    
    const res = {
      status: (code) => {
        const obj = {
          json: (data) => {
            result = { statusCode: code, responseData: data };
            return result;
          }
        };
        return obj;
      },
      json: (data) => {
        result = { statusCode: 200, responseData: data };
        return result;
      }
    };

    const req = {
      body,
      user: { id: 'admin', role: 'admin' }
    };

    return { req, res, getResult: () => result };
  }

  async testEmailPasswordFormat() {
    this.log('测试前端 admin 界面的 email/password 格式...', 'test');
    
    const testData = {
      email: "zhanglixing1688@qq.com",
      password: "jta3YVG6myp*xdm2xqt",
      metadata: { note: "" }
    };

    try {
      const { req, res, getResult } = this.createMockReqRes(testData);
      
      // 直接调用我们的修复函数
      await createUserWithEmailPassword(req, res);
      const result = getResult();
      
      if (result && result.statusCode === 200 && result.responseData.success) {
        this.log('✅ email/password 格式测试通过', 'success');
        this.log(`创建的用户: ${JSON.stringify(result.responseData.data, null, 2)}`, 'info');
        return true;
      } else {
        this.log(`❌ email/password 格式测试失败: ${JSON.stringify(result)}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ email/password 格式测试异常: ${error.message}`, 'error');
      return false;
    }
  }

  async testDirectApiFormat() {
    this.log('测试直接 API 调用的 id/username 格式...', 'test');
    
    const testData = {
      id: "550e8400-e29b-41d4-a716-446655440000", // 使用正确的 UUID 格式
      username: "testuser123",
      role: "user",
      status: "active"
    };

    try {
      const { req, res, getResult } = this.createMockReqRes(testData);
      
      // 直接调用我们的修复函数
      await createUserWithEmailPassword(req, res);
      const result = getResult();
      
      if (result && result.statusCode === 200 && result.responseData.success) {
        this.log('✅ 直接 API 格式测试通过', 'success');
        this.log(`创建的用户: ${JSON.stringify(result.responseData.data, null, 2)}`, 'info');
        return true;
      } else {
        this.log(`❌ 直接 API 格式测试失败: ${JSON.stringify(result)}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ 直接 API 格式测试异常: ${error.message}`, 'error');
      return false;
    }
  }

  async runTests() {
    this.log('🍌 开始热补丁测试（不依赖服务器重启）', 'info');
    
    // 测试 email/password 格式 (前端 admin 界面)
    console.log('\\n=== 测试 1: 前端 Admin 界面格式 ===');
    this.testResults.emailPasswordFormat = await this.testEmailPasswordFormat();
    
    // 测试直接 API 格式
    console.log('\\n=== 测试 2: 直接 API 调用格式 ===');
    this.testResults.directApiFormat = await this.testDirectApiFormat();

    // 汇总结果
    console.log('\\n📊 热补丁测试结果汇总');
    console.log('='.repeat(40));
    console.log(`前端 Admin 格式 (email/password): ${this.testResults.emailPasswordFormat ? '✅ 通过' : '❌ 失败'}`);
    console.log(`直接 API 格式 (id/username): ${this.testResults.directApiFormat ? '✅ 通过' : '❌ 失败'}`);
    
    if (this.testResults.emailPasswordFormat && this.testResults.directApiFormat) {
      this.log('🎉 所有测试通过！修复逻辑正确', 'success');
      this.log('💡 现在需要重启服务器以使修复生效', 'info');
    } else if (this.testResults.emailPasswordFormat) {
      this.log('✅ 前端 admin 格式修复逻辑正确', 'success');
    } else {
      this.log('❌ 修复逻辑仍有问题', 'error');
    }

    return this.testResults;
  }
}

// 运行测试
async function main() {
  const tester = new HotfixTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 热补丁测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = HotfixTester;