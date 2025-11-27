# ============================================
# Nano Banana AI Image Editor - 统一 Dockerfile
#
# 适用场景：
#   - 开发环境：docker-compose.dev.yml (本地构建)
#   - 生产环境：docker-compose.prod.yml (使用预构建镜像)
# ============================================

# ============================================
# 阶段 1: 构建阶段
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖配置文件
COPY package*.json ./
COPY admin/package*.json ./admin/

# 安装依赖（使用国内镜像加速）
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm ci --no-audit --no-fund --maxsockets 1
RUN cd admin && \
    npm config set registry https://registry.npmmirror.com/ && \
    npm ci --no-audit --no-fund --maxsockets 1

# 复制源码
COPY . .

# 构建参数：应用模式（默认 multi-user）
ARG VITE_APP_MODE=multi-user
ENV VITE_APP_MODE=$VITE_APP_MODE
ENV NODE_ENV=production

# 显示构建信息
RUN echo "========================================" && \
    echo "构建信息:" && \
    echo "  Node.js: $(node --version)" && \
    echo "  npm: $(npm --version)" && \
    echo "  VITE_APP_MODE: $VITE_APP_MODE" && \
    echo "========================================"

# 处理环境配置文件
RUN if [ ! -f .env ] && [ -f .env.docker ]; then \
      echo "⚠️ 未找到 .env，使用 .env.docker 作为构建配置"; \
      cp .env.docker .env; \
    fi && \
    if [ "$VITE_APP_MODE" = "multi-user" ]; then \
      if [ ! -f .env ]; then \
        echo "❌ multi-user 模式需要 .env 配置文件"; exit 1; \
      fi; \
      grep -q "^VITE_SUPABASE_URL=" .env || { echo "❌ 缺少 VITE_SUPABASE_URL"; exit 1; }; \
      grep -q "^VITE_SUPABASE_ANON_KEY=" .env || { echo "❌ 缺少 VITE_SUPABASE_ANON_KEY"; exit 1; }; \
    fi

# 构建前端应用
RUN npm run build && npm run build:admin

# 验证构建结果
RUN ls -la dist/ && ls -la admin/dist/

# ============================================
# 阶段 2: 生产运行阶段
# ============================================
FROM node:20-alpine AS production

# 安装运行时依赖
RUN apk add --no-cache curl dumb-init && \
    rm -rf /var/cache/apk/*

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

# 仅安装生产依赖
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm ci --omit=dev --no-audit --no-fund --maxsockets 1 && \
    npm cache clean --force

# 复制后端代码
COPY server/ ./server/

# 从构建阶段复制前端产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/admin/dist ./admin/dist

# 创建数据目录并设置权限
RUN mkdir -p generated_images logs uploads && \
    chown -R appuser:nodejs /app

USER appuser

# 环境变量
ENV NODE_ENV=production
ENV IMAGE_SERVER_PORT=3002
ENV IMAGE_SERVER_HOST=0.0.0.0

EXPOSE 3002

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# 启动命令
CMD ["dumb-init", "node", "server/imageServerExtended.cjs"]
