#!/usr/bin/env node

/**
 * 进程清理脚本
 * 清理所有 Nano Banana 相关的进程和端口占用
 */

const { spawn, exec } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';
const PORTS = [3002, 3003, 5173];

console.log('🧹 开始清理 Nano Banana 相关进程...');

/**
 * 执行命令的Promise封装
 */
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf8', ...options }, (error, stdout, stderr) => {
      if (error && error.code !== 1) {
        // 忽略 code 1 错误（通常表示没有找到进程）
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
      const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
      if (lines.length > 0) {
        const match = lines[0].trim().split(/\s+/);
        return match[match.length - 1];
      }
    } else {
      const { stdout } = await execCommand(`lsof -ti:${port}`);
      return stdout.trim();
    }
  } catch (error) {
    return null;
  }
  return null;
}

/**
 * 终止进程
 */
async function killProcess(pid) {
  if (!pid) return false;
  
  try {
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
 * 清理所有Node.js进程
 */
async function cleanupNodeProcesses() {
  console.log('🔍 清理 Node.js 进程...');
  
  try {
    if (isWindows) {
      // 获取所有 node.exe 进程
      const { stdout } = await execCommand('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
      const lines = stdout.split('\n').slice(1); // 跳过标题行
      
      for (const line of lines) {
        if (line.trim()) {
          const match = line.match(/"([^"]*)","/);
          if (match && match[1] === 'node.exe') {
            const pidMatch = line.match(/,"(\d+)",/);
            if (pidMatch) {
              const pid = pidMatch[1];
              await killProcess(pid);
            }
          }
        }
      }
    } else {
      const { stdout } = await execCommand('pgrep node');
      const pids = stdout.split('\n').filter(pid => pid.trim());
      for (const pid of pids) {
        await killProcess(pid.trim());
      }
    }
  } catch (error) {
    console.warn('⚠️ 清理Node.js进程时出错:', error.message);
  }
}

/**
 * 清理特定端口
 */
async function cleanupPorts() {
  console.log('🔍 检查端口占用...');
  
  for (const port of PORTS) {
    const pid = await getPortPid(port);
    if (pid) {
      console.log(`🎯 发现端口 ${port} 被进程 ${pid} 占用`);
      await killProcess(pid);
    }
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
    // 第一步：清理Node.js进程
    await cleanupNodeProcesses();
    
    // 等待进程完全终止
    console.log('⏳ 等待进程完全终止...');
    await sleep(2000);
    
    // 第二步：检查并清理端口占用
    await cleanupPorts();
    
    // 再次等待确保清理完成
    await sleep(1000);
    
    console.log('✅ 清理完成！');
    
    // 验证清理结果
    console.log('🔍 验证清理结果...');
    for (const port of PORTS) {
      const pid = await getPortPid(port);
      if (pid) {
        console.log(`⚠️ 端口 ${port} 仍被占用 (PID: ${pid})`);
      } else {
        console.log(`✅ 端口 ${port} 已释放`);
      }
    }
    
  } catch (error) {
    console.error('❌ 清理过程中出错:', error);
    process.exit(1);
  }
}

// 执行清理
cleanup().then(() => {
  console.log('🎉 清理脚本执行完成');
  process.exit(0);
});