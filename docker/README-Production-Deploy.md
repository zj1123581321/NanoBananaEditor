# 🚀 Nano Banana Editor - 生产环境部署指南

确保每次都加载最新的 Docker 镜像，避免缓存问题。

## 🎯 核心问题解决

**问题**: 同名镜像文件可能导致 Docker 加载旧缓存  
**解决**: 版本化文件名 + 强制清理旧镜像

## 📦 步骤 1: 导出镜像 (本地)

```powershell
cd docker
./export-image.ps1
```

导出的镜像现在包含：
- 时间戳（精确到分钟）
- Git 提交哈希
- 示例：`nano-banana-editor-20250910-1430-abc1234.tar`

## 🚀 步骤 2: 服务器部署

### 方法 A: 使用自动化脚本 (推荐)

```bash
# 上传文件
scp nano-banana-editor-*.tar user@server:/path/
scp docker/reload-image.sh user@server:/path/
scp docker/docker-compose.production.yml user@server:/path/
scp docker/.env.production.example user@server:/path/

# 服务器端执行
chmod +x reload-image.sh
./reload-image.sh nano-banana-editor-20250910-1430-abc1234.tar

# 首次部署时配置环境
cp .env.production.example .env.production
# 编辑 .env.production，填入实际 API 密钥

# 启动服务
docker-compose -f docker-compose.production.yml up -d
```

### 方法 B: 手动操作

```bash
# 1. 完全停止现有服务
docker-compose -f docker-compose.production.yml down

# 2. 强制删除旧镜像
docker rmi docker-ai_image_editor:latest || true

# 3. 清理系统
docker system prune -f

# 4. 加载新镜像
docker load < nano-banana-editor-20250910-1430-abc1234.tar

# 5. 验证镜像
docker images | grep docker-ai_image_editor

# 6. 启动服务
docker-compose -f docker-compose.production.yml up -d
```

## 🔍 步骤 3: 验证部署

```bash
# 检查服务状态
docker-compose -f docker-compose.production.yml ps

# 查看日志
docker-compose -f docker-compose.production.yml logs -f

# 健康检查
curl -f http://localhost:3002/health
```

## 🛠️ 故障排查

### 问题 1: 镜像仍然是旧版本
```bash
# 检查镜像创建时间
docker images docker-ai_image_editor --format "table {{.Repository}}\\t{{.Tag}}\\t{{.CreatedAt}}\\t{{.Size}}"

# 如果时间不对，重新执行清理步骤
docker-compose down
docker rmi docker-ai_image_editor:latest --force
docker system prune -f
docker load < 新镜像文件.tar
```

### 问题 2: 容器启动失败
```bash
# 检查详细日志
docker-compose -f docker-compose.production.yml logs ai_image_editor

# 检查环境变量配置
docker exec -it docker-ai_image_editor-1 env | grep VITE_
```

### 问题 3: API 密钥错误
编辑 `.env.production`，确保：
- `VITE_SUPABASE_URL` 正确
- `VITE_SUPABASE_ANON_KEY` 正确  
- `SUPABASE_SERVICE_ROLE_KEY` 正确
- `VITE_GEMINI_API_KEY` 有效

## 📋 检查清单

部署前确认：
- [ ] 导出脚本生成了唯一文件名
- [ ] 镜像文件已上传到服务器
- [ ] 配置文件已上传并编辑
- [ ] 旧容器已完全停止
- [ ] 旧镜像已删除
- [ ] 新镜像成功加载
- [ ] 服务正常启动
- [ ] 健康检查通过

这样可以 **100% 确保** 每次部署都使用最新的镜像版本！