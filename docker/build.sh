#!/bin/bash
# Docker 构建脚本 - 自动加载环境变量

# 加载 .env 文件
if [ -f "../.env" ]; then
    echo "🔧 加载环境变量..."
    export $(cat ../.env | grep -v '^#' | grep -v '^[[:space:]]*$' | xargs)
    echo "✅ 环境变量加载完成"
else
    echo "❌ 未找到 .env 文件，请先复制 .env.docker 为 .env"
    exit 1
fi

# 显示关键环境变量
echo "📋 关键环境变量："
echo "   VITE_APP_MODE=$VITE_APP_MODE"
echo "   VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY:0:20}..."
echo "   VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY:0:20}..."
echo "   VITE_ANTHROPIC_API_KEY=${VITE_ANTHROPIC_API_KEY:0:20}..."

# 构建 Docker 镜像
echo "🔨 开始构建 Docker 镜像..."
docker-compose build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

echo "✅ 完成！"
echo "🌐 访问地址："
echo "   主前端: http://localhost:${APP_PORT:-3002}/"
echo "   管理后台: http://localhost:${APP_PORT:-3002}/admin/"