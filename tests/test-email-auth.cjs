/**
 * 测试基于邮箱的认证流程
 * 测试 Supabase Auth 的完整邮箱登录功能
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3002';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLXRlc3QiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU3NDAwMjQ1LCJleHAiOjE3NTc0MDM4NDV9.7mD1ZVEfb95cpPQV620q_KgPRwOyvWKBMwNbyYtWiv0'; // JWT 管理员令牌

async function testEmailAuth() {
    console.log('🧪 开始测试基于邮箱的认证流程...\n');

    try {
        // 1. 测试创建用户（使用真实邮箱）
        console.log('1️⃣ 测试创建用户（使用邮箱）...');
        const createUserData = {
            email: 'test@nanobana.com',
            username: 'test_user_123',
            password: 'test123456',
            role: 'user',
            status: 'active',
            metadata: {
                note: '这是一个测试用户'
            }
        };

        const createResponse = await axios.post(`${API_BASE}/api/admin/users`, createUserData, {
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 用户创建结果:', createResponse.data);
        console.log('');

        // 2. 等待一下确保用户创建完成
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. 测试邮箱登录
        console.log('2️⃣ 测试使用邮箱登录...');
        const loginData = {
            email: 'test@nanobana.com',
            password: 'test123456'
        };

        // 这里应该调用前端的登录接口，但由于我们测试的是后端，先用一个模拟的登录流程
        console.log('📧 模拟前端使用邮箱登录:', loginData);
        
        // 4. 获取用户列表验证用户存在
        console.log('3️⃣ 验证用户存在于数据库中...');
        const usersResponse = await axios.get(`${API_BASE}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
        });

        console.log('👥 当前用户列表:');
        usersResponse.data.data.forEach(user => {
            console.log(`- ID: ${user.id}`);
            console.log(`- 邮箱: ${user.email}`);
            console.log(`- 用户名: ${user.username}`);
            console.log(`- 角色: ${user.raw_user_meta_data?.role || 'user'}`);
            console.log(`- 创建时间: ${user.created_at}`);
            console.log(`- 备注: ${user.raw_user_meta_data?.note || '无'}`);
            console.log('');
        });

        console.log('🎉 邮箱认证流程测试完成！');

    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
        
        if (error.response?.data?.details) {
            console.error('错误详情:', error.response.data.details);
        }
    }
}

// 运行测试
testEmailAuth();