const axios = require('axios');

async function testPasswordReset() {
    const API_BASE = 'http://localhost:3002';
    const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLXRlc3QiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU3NDAwMjQ1LCJleHAiOjE3NTc0MDM4NDV9.7mD1ZVEfb95cpPQV620q_KgPRwOyvWKBMwNbyYtWiv0';
    const USER_ID = '78c034ab-71a4-495b-904a-89ecf913e1f0';
    
    console.log('🧪 测试重置密码接口...\n');
    
    try {
        const response = await axios.post(`${API_BASE}/api/admin/users/${USER_ID}/reset-password`, {}, {
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ 重置密码成功:');
        console.log('- 用户ID:', response.data.data.userId);
        console.log('- 邮箱:', response.data.data.email);
        console.log('- 临时密码:', response.data.data.temporaryPassword);
        console.log('- 消息:', response.data.data.message);
        
    } catch (error) {
        console.log('❌ 重置密码失败:', error.response?.data || error.message);
    }
}

testPasswordReset();
