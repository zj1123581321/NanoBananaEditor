/**
 * 生成管理员密码哈希工具
 * 用于生成 ADMIN_PASSWORD_HASH 环境变量的值
 */
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generatePasswordHash() {
  console.log('🔐 管理员密码哈希生成工具\n');
  
  rl.question('请输入管理员密码: ', async (password) => {
    if (!password || password.trim().length === 0) {
      console.log('❌ 密码不能为空');
      rl.close();
      return;
    }

    try {
      // 生成盐值和哈希
      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);
      
      console.log('\n✅ 密码哈希生成成功!');
      console.log('📋 请将以下内容添加到 .env 文件中:\n');
      console.log(`ADMIN_PASSWORD_HASH=${hash}`);
      console.log('\n🔍 验证信息:');
      console.log(`- 原始密码: ${password}`);
      console.log(`- 哈希值: ${hash}`);
      console.log(`- 盐轮数: ${saltRounds}`);
      
      // 验证哈希是否正确
      const isValid = await bcrypt.compare(password, hash);
      console.log(`- 验证结果: ${isValid ? '✅ 通过' : '❌ 失败'}`);
      
    } catch (error) {
      console.error('❌ 生成密码哈希时出错:', error.message);
    }
    
    rl.close();
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  generatePasswordHash();
}

module.exports = { generatePasswordHash };