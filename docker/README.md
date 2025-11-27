# Docker 部署指南

本目录包含 Nano Banana Editor 的 Docker 部署配置。

## 文件说明

```
docker/
├── Dockerfile                  # 统一的构建文件
├── docker-compose.dev.yml      # 开发环境配置
├── docker-compose.prod.yml     # 生产环境配置
├── build_and_export.bat        # Windows 构建导出脚本
├── import_image_template.sh    # Linux 导入脚本模板
├── .env.prod.example           # 生产环境配置示例
└── README.md                   # 本文档
```

## 两种部署模式

### 1. 开发环境（本地构建）

适用于开发调试，需要在本地构建镜像。

```bash
# 1. 配置环境变量
cp .env.dev.example .env

# 2. 构建并启动
cd docker
docker-compose -f docker-compose.dev.yml up -d --build

# 3. 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 4. 停止服务
docker-compose -f docker-compose.dev.yml down
```

### 2. 生产环境（预构建镜像）

适用于服务器部署，使用预构建的镜像文件。

#### Windows 端（构建导出）

```batch
# 双击运行或命令行执行
docker\build_and_export.bat
```

输出目录 `docker/output/` 包含：
- `nano-banana-editor-YYYYMMDD-HHMMSS.tar` - 镜像文件
- `import_image.sh` - 导入脚本
- `.env.prod.example` - 配置示例
- `docker-compose.prod.yml` - 编排文件

#### Linux 端（导入部署）

```bash
# 1. 上传文件到服务器
scp -r output/* user@server:/path/to/deploy/

# 2. 导入镜像
chmod +x import_image.sh
./import_image.sh

# 3. 配置环境变量
cp .env.prod.example .env.prod
vim .env.prod  # 编辑实际配置

# 4. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 5. 带 Nginx（可选）
docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
```

## 环境变量

### 必需配置

| 变量名 | 说明 |
|--------|------|
| `VITE_GEMINI_API_KEY` | Gemini API 密钥 |
| `VITE_APP_MODE` | 应用模式 (standalone/multi-user) |

### multi-user 模式额外配置

| 变量名 | 说明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务密钥 |

### 可选配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `APP_PORT` | 3002 | 服务端口 |
| `VITE_OPENAI_API_KEY` | - | OpenAI API 密钥 |
| `VITE_WECOM_WEBHOOK_URL` | - | 企微通知 URL |

## 常用命令

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 停止并清理
docker-compose -f docker-compose.prod.yml down

# 更新镜像后重启
docker-compose -f docker-compose.prod.yml down
./import_image.sh
docker-compose -f docker-compose.prod.yml up -d
```

## 数据持久化

以下目录通过 Docker Volume 持久化：

- `nano-banana-*-images` - 生成的图片
- `nano-banana-*-logs` - 应用日志

## 访问地址

- 主应用: http://localhost:3002/
- 管理后台: http://localhost:3002/admin/
- API 接口: http://localhost:3002/api/
- 健康检查: http://localhost:3002/health
