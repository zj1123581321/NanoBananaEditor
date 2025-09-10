# Nginx 配置说明

## 🎯 精简后的配置文件

经过统一架构迁移，Nginx 配置已大幅精简：

### ✅ 保留的配置文件

1. **`nginx.conf`** - 标准配置（推荐）
   - 包含基础性能优化
   - Gzip 压缩
   - 基础安全头
   - 适合大多数生产环境

2. **`nginx.minimal.conf`** - 最小化配置（可选）
   - 仅包含核心反向代理功能
   - 适合资源受限环境
   - 体积最小

### ❌ 已删除的配置文件

- `nginx-unified.conf` - 重命名为 `nginx.conf`
- `nginx.frontend.conf` - 旧的前端容器配置
- `nginx.admin.conf` - 旧的管理后台配置

## 📋 配置对比

| 特性 | nginx.conf | nginx.minimal.conf |
|------|------------|-------------------|
| 文件大小 | ~2KB | ~0.5KB |
| Gzip 压缩 | ✅ | ❌ |
| 安全头 | ✅ | ❌ |
| 缓存优化 | ✅ | ❌ |
| 详细路由 | ✅ | ❌ |
| 健康检查 | ✅ | ❌ |

## 🔄 如何切换配置

### 使用标准配置（默认）
```yaml
# docker-compose.yml 中
volumes:
  - ../config/nginx.conf:/etc/nginx/nginx.conf:ro
```

### 使用最小化配置
```yaml
# docker-compose.yml 中
volumes:
  - ../config/nginx.minimal.conf:/etc/nginx/nginx.conf:ro
```

## ⚡ 精简带来的优势

1. **更易维护**
   - 配置文件从 4 个减少到 2 个
   - 去掉了复杂的多容器路由逻辑

2. **更好理解**
   - 简化的路由规则
   - 清晰的上游服务配置

3. **更快启动**
   - 减少了不必要的配置项
   - 降低了 Nginx 内存占用

4. **减少错误**
   - 更少的配置意味着更少的出错机会
   - 统一的配置管理

## 🛠️ 自定义配置

如果需要添加自定义功能，可以基于现有配置修改：

### 添加 SSL/HTTPS
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... 其他配置
}
```

### 添加速率限制
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            # ... 其他配置
        }
    }
}
```

### 添加更多安全头
```nginx
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'";
```

## 💡 推荐使用场景

- **开发/测试环境**: 使用 `nginx.minimal.conf`
- **生产环境**: 使用 `nginx.conf`
- **高并发场景**: 基于 `nginx.conf` 添加更多优化
- **安全敏感**: 基于 `nginx.conf` 添加更多安全头

精简后的 Nginx 配置更加清晰、易维护，同时保持了必要的功能！