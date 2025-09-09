# 🚀 Nano Banana 项目命令指南

## 📋 开发命令

### 🔄 一键启动命令

| 命令 | 功能 | 启动服务 |
|------|------|----------|
| `npm run dev` | 默认开发模式 (单用户) | 前端 + 单用户后端 |
| `npm run dev:standalone` | 单用户模式 | 前端 + 单用户后端 |
| `npm run dev:multi-user` | 多用户模式 | 前端 + 多用户后端 + 管理后台 |

### 🔧 单独服务命令

| 命令 | 功能 | 端口 |
|------|------|------|
| `npm run dev:vite-only` | 仅启动前端 | 5173 |
| `npm run dev:server-standalone` | 仅启动单用户后端 | 3002 |
| `npm run dev:server-multi` | 仅启动多用户后端 | 3002 |
| `npm run dev:admin-only` | 仅启动管理后台 | 3003 |

## 🏗️ 构建命令

| 命令 | 功能 |
|------|------|
| `npm run build` | 构建前端 |
| `npm run build:admin` | 构建管理后台 |
| `npm run build:all` | 构建前端 + 管理后台 |

## 🚦 生产环境命令

| 命令 | 功能 |
|------|------|
| `npm start` | 启动单用户生产服务 |
| `npm run start:standalone` | 启动单用户生产服务 |
| `npm run start:multi-user` | 启动多用户生产服务 |

## 🧪 测试命令

| 命令 | 功能 |
|------|------|
| `npm run test:notification` | 测试企业微信通知 |
| `npm run test:real-image` | 测试真实图片处理 |

## 📱 快速开始

### 单用户模式 (推荐新手)
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，设置 VITE_GEMINI_API_KEY

# 3. 一键启动
npm run dev:standalone

# 访问: http://localhost:5173
```

### 多用户模式
```bash
# 1. 安装依赖
npm install
cd admin && npm install && cd ..

# 2. 配置环境变量 (包括 Supabase 配置)
cp .env.example .env
# 编辑 .env，设置所有必要变量

# 3. 一键启动 (前端 + 后端 + 管理后台)
npm run dev:multi-user

# 访问:
# - 前端: http://localhost:5173  
# - 管理后台: http://localhost:3003
```

## 🔗 服务端口

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| Vite 前端 | 5173 | React 开发服务器 |
| 后端 API | 3002 | 图片服务器 + API |
| 管理后台 | 3003 | Vue 3 管理界面 |

## 💡 使用技巧

1. **Windows 推荐**: 使用 `npm run dev:standalone` 或 `npm run dev:multi-user`
2. **开发调试**: 每个服务都有独立启动命令，方便单独调试
3. **环境变量**: 命令会自动设置 `VITE_APP_MODE`，无需手动修改
4. **热重载**: 所有开发模式都支持代码修改后自动刷新
5. **并发控制**: 使用 `Ctrl+C` 可以同时停止所有启动的服务

## 🧹 进程管理命令

| 命令 | 功能 | 说明 |
|------|------|------|
| `npm run cleanup` | 安全清理残留进程 | 只清理占用 Nano Banana 端口的进程，不影响其他服务 |

### 自动清理功能
- `npm run dev:standalone` 和 `npm run dev:multi-user` 现在会自动先清理残留进程
- 解决了频繁的端口冲突问题
- 安全清理，不会误杀 Claude Code 等其他 Node.js 服务

## 🚨 常见问题

**Q: 端口被占用怎么办？**
```bash
# 使用安全清理命令 (推荐)
npm run cleanup

# 或手动查看端口占用
netstat -ano | findstr :5173
netstat -ano | findstr :3002
netstat -ano | findstr :3003
```

**Q: 进程残留怎么办？**
- 现在启动命令会自动清理残留进程
- 如需手动清理：`npm run cleanup`
- 该脚本会智能识别并只清理 Nano Banana 相关进程

**Q: 多用户模式启动失败？**
- 检查是否配置了 Supabase 环境变量
- 确保 admin 目录已安装依赖: `cd admin && npm install`
- 尝试先运行 `npm run cleanup`

**Q: 管理后台登录问题？**
- 默认用户名: `admin`
- 默认密码: `admin`
- 访问地址: http://localhost:3003/

**Q: 企业微信通知不工作？**
- 检查 `VITE_WECOM_WEBHOOK_URL` 是否正确配置
- 运行 `npm run test:notification` 测试