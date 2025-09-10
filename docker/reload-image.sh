#!/bin/bash

# Nano Banana Editor - 镜像重新加载脚本
# 用于服务器端确保加载最新镜像

set -e

echo "🔄 Nano Banana Editor - 镜像重新加载脚本"
echo "============================================"

# 检查参数
if [ $# -eq 0 ]; then
    echo "❌ 错误: 请提供镜像文件名"
    echo "用法: $0 <image-file.tar>"
    echo "示例: $0 nano-banana-editor-20250910-1430-abc1234.tar"
    exit 1
fi

IMAGE_FILE="$1"
IMAGE_NAME="docker-ai_image_editor:latest"
CONTAINER_NAME="docker-ai_image_editor-1"
COMPOSE_FILE="docker-compose.production.yml"

# 检查镜像文件是否存在
if [ ! -f "$IMAGE_FILE" ]; then
    echo "❌ 错误: 镜像文件 '$IMAGE_FILE' 不存在"
    exit 1
fi

echo "📦 镜像文件: $IMAGE_FILE"
echo "🏷️  镜像标签: $IMAGE_NAME"
echo ""

# 步骤 1: 停止现有容器
echo "🛑 步骤 1: 停止现有服务..."
if [ -f "$COMPOSE_FILE" ]; then
    docker-compose -f "$COMPOSE_FILE" down || true
else
    echo "⚠️  未找到 $COMPOSE_FILE，尝试停止单个容器..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
fi
echo "✅ 服务已停止"

# 步骤 2: 删除旧镜像
echo ""
echo "🗑️  步骤 2: 清理旧镜像..."
if docker images -q "$IMAGE_NAME" 2>/dev/null; then
    echo "发现旧镜像，正在删除..."
    docker rmi "$IMAGE_NAME" --force || true
    echo "✅ 旧镜像已删除"
else
    echo "✅ 未发现旧镜像"
fi

# 步骤 3: 清理无用镜像
echo ""
echo "🧹 步骤 3: 清理无用镜像..."
docker system prune -f
echo "✅ 系统清理完成"

# 步骤 4: 加载新镜像
echo ""
echo "📥 步骤 4: 加载新镜像..."
echo "文件大小: $(du -h "$IMAGE_FILE" | cut -f1)"
docker load < "$IMAGE_FILE"
echo "✅ 新镜像加载完成"

# 步骤 5: 验证镜像
echo ""
echo "🔍 步骤 5: 验证镜像..."
if docker images -q "$IMAGE_NAME" >/dev/null; then
    echo "✅ 镜像验证成功:"
    docker images "$IMAGE_NAME" --format "table {{.Repository}}\\t{{.Tag}}\\t{{.CreatedAt}}\\t{{.Size}}"
else
    echo "❌ 错误: 镜像加载失败"
    exit 1
fi

echo ""
echo "🎉 镜像重新加载完成！"
echo ""
echo "📋 下一步操作:"
echo "1. 确保 .env.production 配置正确"
echo "2. 启动服务:"
echo "   docker-compose -f docker-compose.production.yml up -d"
echo ""
echo "3. 检查服务状态:"
echo "   docker-compose -f docker-compose.production.yml ps"
echo "   docker-compose -f docker-compose.production.yml logs -f"