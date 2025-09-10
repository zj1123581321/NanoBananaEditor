# Docker 统一架构部署指南

## 🚀 统一架构优势

经过架构迁移，Docker 部署现在更加简洁高效：

- ✅ **单容器部署** - 仅需要 1 个容器 vs 原来的 3 个
- ✅ **单端口访问** - 仅占用 1 个端口 (3002) vs 原来的 3 个端口
- ✅ **资源节省** - 减少内存和CPU消耗
- ✅ **配置简化** - 减少网络配置复杂度
- ✅ **部署简单** - 一条命令完成部署

## 📋 部署前准备

### 1. 环境要求

- Docker 20.10+
- Docker Compose v2
- 至少 1GB 可用内存
- 至少 2GB 可用磁盘空间

### 2. 配置 API 密钥

在**项目根目录**复制环境变量模板：
```bash
# 确保在项目根目录（与 package.json 同级）
cp .env.docker .env
```

编辑根目录的 `.env` 文件，填入你的 API 密钥：
```bash
# 应用模式配置
VITE_APP_MODE=multi-user
APP_PORT=3002
NODE_ENV=production

# 后端 API 密钥（多用户模式）
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
GOOGLE_API_KEY=your-google-key-here

# 前端 API 密钥（Docker 部署不需要，仅用于本地开发）
# VITE_OPENAI_API_KEY=sk-your-openai-key-here
# VITE_GEMINI_API_KEY=your-google-key-here  
# VITE_ANTHROPIC_API_KEY=your-anthropic-key-here

# 管理员账户
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=使用scripts/generate-admin-password.cjs生成

# 服务器配置
IMAGE_SERVER_PORT=3002
IMAGE_SERVER_HOST=0.0.0.0
```

**⚠️ 重要说明：**
- **Docker 部署固定使用多用户模式**：前端通过后端代理访问 API
- **API 密钥仅在运行时需要**：不会打包到前端代码中，更安全

**⚠️ 重要：** .env 文件必须放在项目根目录，文件结构如下：
```
NanoBananaEditor/
├── .env              ← 这里！
├── package.json
├── docker/
│   └── docker-compose.yml
```

## 🛠️ 部署命令

### 默认多用户模式部署 (推荐)

**方法一：使用自动化脚本 (推荐)**
```bash
# 进入 docker 目录
cd docker

# Windows 用户
build.cmd

# Linux/Mac 用户
chmod +x build.sh
./build.sh
```

**方法二：手动部署**
```bash
# 进入 docker 目录
cd docker

# 手动加载环境变量并构建
export $(cat ../.env | grep -v '^#' | xargs)  # Linux/Mac
# 或者在 Windows PowerShell 中设置变量后再运行
docker-compose build --no-cache
docker-compose up -d
```

### 其他部署选项

```bash
# 从项目根目录运行
# 单用户模式
VITE_APP_MODE=standalone docker-compose -f docker/docker-compose.yml up -d

# 生产环境 (带 Nginx SSL)
docker-compose -f docker/docker-compose.yml --profile production up -d
```

**💡 提示：** 现在 `docker-compose up -d` 默认使用多用户模式，无需指定 profile！

## 🌐 访问地址

部署成功后，通过以下地址访问：

- **主前端**: http://localhost:3002/
- **管理后台**: http://localhost:3002/admin/
- **API 文档**: http://localhost:3002/health
- **健康检查**: http://localhost:3002/health

## 📊 监控和管理

### 查看服务状态

```bash
# 在 docker 目录中
cd docker

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f ai_image_editor
```

### 重启服务

```bash
# 在 docker 目录中
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart ai_image_editor
```

### 停止服务

```bash
# 在 docker 目录中
# 停止所有服务
docker-compose down

# 停止并删除数据卷 (⚠️ 会丢失生成的图片)
docker-compose down -v
```

## 🔧 故障排除

### 端口冲突

如果 3002 端口被占用，可以修改端口：

```bash
APP_PORT=3005 docker-compose -f docker/docker-compose.yml --profile multi-user up -d
```

### 构建失败

如果网络问题导致构建失败，可以使用国内镜像：

```bash
# Dockerfile 已配置国内 npm 镜像
docker-compose -f docker/docker-compose.yml build --no-cache
```

### 健康检查失败

查看容器日志确定问题：

```bash
docker-compose -f docker/docker-compose.yml logs app
```

常见原因：
- API 密钥配置错误
- 端口冲突
- 内存不足

## 📦 数据持久化

系统使用 Docker 数据卷持久化以下数据：

- `nano-banana-images`: 生成的图片文件
- `nano-banana-logs`: 应用日志

### 备份数据

```bash
# 备份生成的图片
docker run --rm -v nano-banana-images:/data -v $(pwd):/backup alpine tar czf /backup/images-backup.tar.gz /data

# 备份日志
docker run --rm -v nano-banana-logs:/data -v $(pwd):/backup alpine tar czf /backup/logs-backup.tar.gz /data
```

### 恢复数据

```bash
# 恢复图片
docker run --rm -v nano-banana-images:/data -v $(pwd):/backup alpine tar xzf /backup/images-backup.tar.gz -C /

# 恢复日志
docker run --rm -v nano-banana-logs:/data -v $(pwd):/backup alpine tar xzf /backup/logs-backup.tar.gz -C /
```

## 🔄 版本升级

### 升级到最新版本

```bash
# 停止服务
docker-compose -f docker/docker-compose.yml down

# 拉取最新代码
git pull

# 重新构建镜像
docker-compose -f docker/docker-compose.yml build --no-cache

# 启动服务
docker-compose -f docker/docker-compose.yml --profile multi-user up -d
```

## 🛡️ 生产环境建议

### SSL/HTTPS 配置

1. 将 SSL 证书放置在 `docker/ssl/` 目录
2. 修改 `config/nginx-unified.conf` 中的 SSL 配置
3. 使用生产环境 profile：

```bash
docker-compose -f docker/docker-compose.yml --profile production up -d
```

### 性能优化

1. **增加内存限制**:
```yaml
services:
  app:
    mem_limit: 2g
    memswap_limit: 2g
```

2. **配置日志轮转**:
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"
```

### 安全配置

1. **使用非 root 用户** (已配置)
2. **配置防火墙规则**
3. **定期更新镜像**
4. **配置访问限制**

## 🆚 架构对比

| 特性 | 旧架构 (3容器) | 新架构 (1容器) |
|------|---------------|---------------|
| 容器数量 | 3个 | 1个 |
| 端口占用 | 3000, 3002, 3003 | 3002 |
| 内存消耗 | ~800MB | ~400MB |
| 网络配置 | 复杂 | 简单 |
| 部署命令 | 多条 | 单条 |
| 维护难度 | 高 | 低 |

统一架构大大简化了 Docker 部署的复杂度，提升了资源利用效率！🎉