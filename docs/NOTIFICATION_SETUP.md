# 📢 通知和记录功能设置指南

## 功能概述

本项目已集成企业微信通知和图片访问功能：

- ✅ **设备识别**：自动获取内网IP地址作为设备标识
- ✅ **图片服务**：内置HTTP服务器提供图片外部访问
- ✅ **企业微信通知**：图片生成完成时自动发送通知
- ✅ **markdown_v2格式**：支持图片直接展示

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```bash
# Gemini API Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Image Server Configuration  
VITE_IMAGE_SERVER_URL=http://localhost:3001
IMAGE_SERVER_PORT=3001
IMAGE_SERVER_HOST=0.0.0.0

# WeChat Work Notification Configuration
VITE_WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_WEBHOOK_KEY_HERE
```

### 3. 获取企业微信 Webhook URL

1. 登录企业微信管理后台
2. 进入群聊设置
3. 添加"群机器人" 
4. 创建消息推送机器人
5. 获取 Webhook URL，格式如：
   ```
   https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=693a91f6-7xxx-4bc4-97a0-0ec2sifa5aaa
   ```

### 4. 启动服务

#### 开发环境（推荐）
同时启动前端和图片服务器：
```bash
npm run dev:full
```

#### 分别启动
```bash
# 终端1：启动图片服务器
npm run image-server

# 终端2：启动前端开发服务器  
npm run dev
```

## 服务地址

启动成功后：
- 🎨 **前端应用**: http://localhost:5173
- 📡 **图片服务器**: http://localhost:3001
- 🔍 **健康检查**: http://localhost:3001/health

## 通知消息示例

图片生成完成后，企业微信群会收到如下格式的通知：

```markdown
# 🎨 AI图片生成完成通知

## 📱 设备信息
- **IP地址:** `192.168.1.100`
- **设备ID:** `device_abc123`
- **生成时间:** `2024-01-15 14:30:25`

## 💬 用户提示词
```
一只可爱的小猫咪在花园里玩耍，阳光明媚，花朵盛开
```

## ⚙️ 生成参数
模型: `Gemini 2.5 Flash Image`
温度: `0.7`
种子: `12345`

## ⏱️ 处理结果
- **生成数量:** `2张`
- **处理耗时:** `8.5秒`
- **状态:** ✅ **成功**

## 🖼️ 生成结果

![生成图片1](http://192.168.1.100:3001/images/generated_20240115_143025_1.png)

![生成图片2](http://192.168.1.100:3001/images/generated_20240115_143025_2.png)

---
*🍌 Nano Banana AI Image Editor*
```

## 文件结构

```
├── server/                      # Node.js 服务器
│   └── imageServer.js          # 图片HTTP服务器
├── generated_images/           # 生成的图片存储目录（自动创建）
├── src/services/              # 前端服务
│   ├── deviceService.ts       # 设备信息服务
│   ├── imageServerService.ts  # 图片服务器接口
│   ├── notificationService.ts # 企业微信通知服务
│   └── integratedGenerationService.ts # 集成服务
└── .env                       # 环境配置文件
```

## API 接口

### 图片服务器 API

- `GET /health` - 健康检查
- `POST /api/images` - 保存图片（接收base64数据）
- `GET /images/:filename` - 访问图片
- `GET /api/images` - 获取图片列表
- `GET /api/images/:filename/info` - 获取图片信息
- `DELETE /api/images/:filename` - 删除图片

### 前端服务使用

```typescript
import { integratedGenerationService } from './services/integratedGenerationService';

// 生成图片（包含通知）
const result = await integratedGenerationService.generateImage({
  prompt: "一只可爱的小猫",
  enableNotification: true  // 启用通知
});

console.log('生成结果:', result);
```

## 配置选项

### 通知配置

```typescript
import { notificationService } from './services/notificationService';

// 更新配置
notificationService.updateConfig({
  enabled: true,
  retryAttempts: 3,
  timeout: 5000
});

// 测试通知
await notificationService.testNotification();
```

### 图片服务器配置

```typescript
import { imageServerService } from './services/imageServerService';

// 更新配置
imageServerService.updateConfig({
  baseUrl: 'http://your-server:3001',
  timeout: 10000
});
```

## 故障排除

### 1. 图片服务器无法启动
- 检查端口3001是否被占用
- 确认Node.js版本 >= 16
- 检查文件权限

### 2. 企业微信通知失败
- 验证Webhook URL格式是否正确
- 检查网络连接
- 查看控制台错误信息

### 3. 设备IP获取失败
- 检查浏览器WebRTC支持
- 查看控制台WebRTC相关错误
- 会自动降级到备用方案

## 生产环境部署

1. **构建前端应用**
   ```bash
   npm run build
   ```

2. **部署图片服务器**
   ```bash
   # 生产环境启动
   NODE_ENV=production npm run start:server
   ```

3. **反向代理配置（Nginx示例）**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           root /path/to/dist;
           try_files $uri $uri/ /index.html;
       }
       
       location /api/ {
           proxy_pass http://localhost:3001;
       }
       
       location /images/ {
           proxy_pass http://localhost:3001;
       }
   }
   ```

## 安全注意事项

1. **保护Webhook URL**：不要将企业微信Webhook URL提交到代码仓库
2. **网络安全**：生产环境建议使用HTTPS
3. **访问控制**：可考虑为图片服务器添加访问认证
4. **数据清理**：定期清理过期的生成图片

---

**需要帮助？** 请查看控制台日志或联系开发团队。