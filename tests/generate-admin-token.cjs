/**
 * 生成管理员JWT token用于测试
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nano-banana-admin-secret-key-2024';

function generateAdminToken() {
  const payload = {
    id: 'admin',
    username: 'admin',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时有效期
  };

  const token = jwt.sign(payload, JWT_SECRET);
  
  console.log('🔑 生成的管理员JWT Token:');
  console.log(token);
  console.log('\n📋 Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n💡 使用方法:');
  console.log('Authorization: Bearer ' + token);
  
  return token;
}

if (require.main === module) {
  generateAdminToken();
}

module.exports = { generateAdminToken };