#!/usr/bin/env node

/**
 * 安全的进程清理脚本
 * 只清理特定端口的进程，不影响其他Node.js服务
 */

const { exec } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';
const NANO_BANANA_PORTS = [3002, 3003, 5173];

console.log('🧹 开始安全清理 Nano Banana 端口...');

/**
 * 执行命令的Promise封装
 */
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf8', ...options }, (error, stdout, stderr) => {
      if (error && error.code !== 1) {
        console.warn(`警告: ${command} - ${error.message}`);
      }
      resolve({ stdout, stderr, error });
    });
  });
}

/**
 * 获取端口占用的进程ID
 */
async function getPortPid(port) {
  try {
    if (isWindows) {
      const { stdout } = await execCommand(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            return pid;
          }
        }
      }
    } else {
      const { stdout } = await execCommand(`lsof -ti:${port}`);
      const pid = stdout.trim();
      if (pid && !isNaN(pid)) {
        return pid;
      }
    }
  } catch (error) {
    // 端口未被占用或获取失败
  }
  return null;
}

/**
 * 获取进程信息
 */
async function getProcessInfo(pid) {
  try {
    if (isWindows) {
      const { stdout } = await execCommand(`tasklist /FI "PID eq ${pid}" /FO CSV`);
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const line = lines[1];
        const match = line.match(/"([^"]*)"/);
        return match ? match[1] : 'Unknown';
      }
    } else {
      const { stdout } = await execCommand(`ps -p ${pid} -o comm=`);
      return stdout.trim() || 'Unknown';
    }
  } catch (error) {
    return 'Unknown';
  }
  return 'Unknown';
}

/**
 * 终止进程
 */
async function killProcess(pid, processName) {
  if (!pid) return false;
  
  try {
    console.log(`🎯 终止进程: ${processName} (PID: ${pid})`);
    
    if (isWindows) {
      await execCommand(`taskkill /F /PID ${pid}`);
    } else {
      await execCommand(`kill -9 ${pid}`);
    }
    
    console.log(`✅ 已终止进程 PID: ${pid}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ 无法终止进程 PID ${pid}: ${error.message}`);
    return false;
  }
}

/**
 * 清理指定端口
 */
async function cleanupPort(port) {
  const pid = await getPortPid(port);
  
  if (pid) {
    const processName = await getProcessInfo(pid);
    console.log(`🔍 端口 ${port} 被进程占用: ${processName} (PID: ${pid})`);
    
    // 只清理看起来像Node.js或相关工具的进程
    const lowerProcessName = processName.toLowerCase();
    if (lowerProcessName.includes('node') || 
        lowerProcessName.includes('vite') || 
        lowerProcessName.includes('npm')) {
      
      await killProcess(pid, processName);
      return true;
    } else {
      console.log(`⚠️ 跳过清理进程 ${processName} (不是Node.js相关进程)`);
      return false;
    }
  } else {
    console.log(`✅ 端口 ${port} 未被占用`);
    return true;
  }
}

/**
 * 等待
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主清理函数
 */
async function cleanup() {
  try {
    console.log(`🎯 检查端口: ${NANO_BANANA_PORTS.join(', ')}`);
    
    let anyKilled = false;
    
    // 清理每个端口
    for (const port of NANO_BANANA_PORTS) {
      const killed = await cleanupPort(port);
      if (killed) {
        anyKilled = true;
      }
    }
    
    if (anyKilled) {
      // 等待进程完全终止
      console.log('⏳ 等待进程完全终止...');
      await sleep(2000);
      
      // 再次验证
      console.log('🔍 验证清理结果...');
      for (const port of NANO_BANANA_PORTS) {
        const pid = await getPortPid(port);
        if (pid) {
          const processName = await getProcessInfo(pid);
          console.log(`⚠️ 端口 ${port} 仍被占用: ${processName} (PID: ${pid})`);
        } else {
          console.log(`✅ 端口 ${port} 已释放`);
        }
      }
    }
    
    console.log('✅ 安全清理完成！');
    
  } catch (error) {
    console.error('❌ 清理过程中出错:', error);
    process.exit(1);
  }
}

// 执行清理
cleanup().then(() => {
  console.log('🎉 安全清理脚本执行完成');
  process.exit(0);
});