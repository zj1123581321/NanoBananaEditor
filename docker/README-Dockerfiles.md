# Dockerfile 使用指南

## 📋 可用的 Dockerfile

项目提供了两个 Dockerfile，分别适用于不同的使用场景：

### 1. `Dockerfile.simple.unified` - 简化统一架构 (推荐)

**使用场景：**
- ✅ 本地开发和测试
- ✅ 快速部署
- ✅ CI/CD 流水线中的快速构建

**特点：**
- ⚡ 构建速度快 (约 2-3 分钟)
- 📦 体积小
- 🔧 需要预构建前端文件

**使用方法：**
```bash
# 1. 预构建前端文件
npm run build:all

# 2. Docker 部署 (默认使用此 Dockerfile)
cd docker
docker-compose up -d
```

**优点：**
- 构建快速，适合频繁构建
- 减少网络依赖
- 可以预先验证构建结果

**缺点：**
- 需要本地 Node.js 环境
- 需要手动构建前端

### 2. `Dockerfile.full.unified` - 完整统一架构

**使用场景：**
- 🏭 生产环境部署
- 🤖 CI/CD 全自动化
- ☁️ 云端构建

**特点：**
- 🔄 完整的多阶段构建
- 📱 包含前端构建过程
- 🌐 需要良好的网络环境

**使用方法：**
```bash
# 修改 docker-compose.yml 使用完整版
cd docker

# 编辑 docker-compose.yml，修改以下行：
# dockerfile: docker/Dockerfile.full.unified

docker-compose up -d
```

**优点：**
- 完全自包含，无需本地环境
- 适合生产环境
- 一步部署

**缺点：**
- 构建时间长 (15-30 分钟)
- 需要稳定的网络连接
- 占用更多构建资源

## 🔄 如何切换 Dockerfile

### 切换到完整版构建

1. **修改 docker-compose.yml**：
```yaml
ai_image_editor:
  build:
    dockerfile: docker/Dockerfile.full.unified  # 修改这行
```

2. **重新构建**：
```bash
cd docker
docker-compose build --no-cache
docker-compose up -d
```

### 切换回简化版构建

1. **修改 docker-compose.yml**：
```yaml
ai_image_editor:
  build:
    dockerfile: docker/Dockerfile.simple.unified  # 修改这行
```

2. **预构建前端**：
```bash
npm run build:all
```

3. **重新构建**：
```bash
cd docker
docker-compose build --no-cache
docker-compose up -d
```

## 📊 构建对比

| 特性 | 简化版 | 完整版 |
|------|--------|--------|
| 构建时间 | 2-3 分钟 | 15-30 分钟 |
| 镜像大小 | 较小 | 较大 |
| 网络依赖 | 低 | 高 |
| 本地要求 | 需要 Node.js | 无要求 |
| 适用环境 | 开发/测试 | 生产 |
| 构建稳定性 | 高 | 中等 |

## 🛠️ 故障排除

### 简化版构建问题

**问题：** "COPY failed: no source files were found"
**解决：** 确保先运行 `npm run build:all`

```bash
# 检查构建文件是否存在
ls -la dist/
ls -la admin/dist/

# 如果不存在，重新构建
npm run build:all
```

### 完整版构建问题

**问题：** 构建超时或网络错误
**解决方案：**
1. 检查网络连接
2. 使用代理或 VPN
3. 改用简化版构建

**问题：** "npm ci" 失败
**解决方案：**
```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
docker-compose build --no-cache
```

## 💡 最佳实践

### 开发环境推荐
- 使用 `Dockerfile.simple.unified`
- 设置别名简化命令：
```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias build-frontend="npm run build:all"
alias docker-up="cd docker && docker-compose up -d"
alias docker-down="cd docker && docker-compose down"
```

### 生产环境推荐
- 使用 `Dockerfile.full.unified`
- 配置 CI/CD 流水线
- 添加健康检查监控

### 性能优化
- 定期清理 Docker 镜像：`docker system prune`
- 使用 `.dockerignore` 减少构建上下文
- 考虑使用多阶段构建缓存