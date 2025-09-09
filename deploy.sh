#!/bin/bash
# Nano Banana AI Image Editor - 自动部署脚本
# 支持单用户模式和多用户模式的一键部署

set -e  # 遇到错误时立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# 显示帮助信息
show_help() {
    cat << EOF
🍌 Nano Banana AI Image Editor - 部署脚本

用法:
    ./deploy.sh [模式] [选项]

模式:
    standalone      部署单用户模式 (默认)
    multi-user      部署多用户模式
    production      生产环境部署 (带 Nginx)
    all             部署所有服务

选项:
    -h, --help      显示此帮助信息
    -v, --version   显示版本信息
    -d, --dev       开发模式部署
    --force         强制重新构建
    --no-cache      不使用缓存构建
    --pull          拉取最新镜像
    --logs          部署后显示日志

示例:
    ./deploy.sh                    # 单用户模式部署
    ./deploy.sh multi-user         # 多用户模式部署
    ./deploy.sh production --pull  # 生产环境部署并拉取最新镜像
    ./deploy.sh all --force        # 强制重新构建所有服务

EOF
}

# 显示版本信息
show_version() {
    echo "Nano Banana AI Image Editor v1.0.0"
    echo "部署脚本版本: 1.0.0"
}

# 检查依赖
check_dependencies() {
    log "检查系统依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        if ! docker compose version &> /dev/null; then
            error "Docker Compose 未安装，请先安装 Docker Compose"
        else
            COMPOSE_CMD="docker compose"
        fi
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    log "✅ 系统依赖检查通过"
}

# 检查环境配置
check_environment() {
    log "检查环境配置..."
    
    # 检查 .env 文件
    if [[ ! -f .env ]]; then
        if [[ -f .env.example ]]; then
            warn ".env 文件不存在，正在复制 .env.example"
            cp .env.example .env
            warn "请编辑 .env 文件并设置必要的环境变量"
        else
            error ".env 和 .env.example 文件都不存在"
        fi
    fi
    
    # 检查多用户模式的必要配置
    if [[ "$MODE" == "multi-user" ]] || [[ "$MODE" == "all" ]]; then
        if ! grep -q "VITE_SUPABASE_URL" .env || ! grep -q "SUPABASE_SERVICE_ROLE_KEY" .env; then
            warn "多用户模式需要配置 Supabase 相关环境变量"
            warn "请在 .env 文件中设置 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY"
        fi
    fi
    
    log "✅ 环境配置检查完成"
}

# 停止现有服务
stop_services() {
    log "停止现有服务..."
    
    $COMPOSE_CMD -f docker/docker-compose.yml down --remove-orphans || true
    
    # 清理悬挂的镜像和容器
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        log "清理悬挂的镜像和容器..."
        docker system prune -f || true
    fi
    
    log "✅ 服务停止完成"
}

# 构建镜像
build_images() {
    log "构建 Docker 镜像..."
    
    BUILD_ARGS=""
    
    if [[ "$NO_CACHE" == "true" ]]; then
        BUILD_ARGS="$BUILD_ARGS --no-cache"
    fi
    
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        BUILD_ARGS="$BUILD_ARGS --force-rm"
    fi
    
    # 根据模式构建不同的服务
    case $MODE in
        "standalone")
            $COMPOSE_CMD -f docker/docker-compose.yml build $BUILD_ARGS --parallel frontend backend
            ;;
        "multi-user")
            $COMPOSE_CMD -f docker/docker-compose.yml build $BUILD_ARGS --parallel frontend backend admin
            ;;
        "production"|"all")
            $COMPOSE_CMD -f docker/docker-compose.yml build $BUILD_ARGS --parallel
            ;;
        *)
            error "未知的部署模式: $MODE"
            ;;
    esac
    
    log "✅ 镜像构建完成"
}

# 拉取镜像
pull_images() {
    if [[ "$PULL_IMAGES" == "true" ]]; then
        log "拉取最新的基础镜像..."
        $COMPOSE_CMD -f docker/docker-compose.yml pull --ignore-pull-failures || true
        log "✅ 镜像拉取完成"
    fi
}

# 启动服务
start_services() {
    log "启动服务..."
    
    # 设置应用模式环境变量
    export VITE_APP_MODE=$([[ "$MODE" == "standalone" ]] && echo "standalone" || echo "multi-user")
    
    # 根据模式启动相应的服务
    case $MODE in
        "standalone")
            $COMPOSE_CMD -f docker/docker-compose.yml --profile standalone up -d
            ;;
        "multi-user")
            $COMPOSE_CMD -f docker/docker-compose.yml --profile multi-user up -d
            ;;
        "production")
            $COMPOSE_CMD -f docker/docker-compose.yml --profile production up -d
            ;;
        "all")
            $COMPOSE_CMD -f docker/docker-compose.yml --profile all up -d
            ;;
        *)
            error "未知的部署模式: $MODE"
            ;;
    esac
    
    log "✅ 服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log "等待服务启动..."
    
    # 等待后端服务
    local backend_url="http://localhost:${IMAGE_SERVER_PORT:-3002}"
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f "$backend_url/health" &>/dev/null; then
            log "✅ 后端服务已就绪"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        warn "后端服务启动超时，请检查日志"
    fi
    
    # 等待前端服务
    local frontend_url="http://localhost:${FRONTEND_PORT:-3000}"
    attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f "$frontend_url" &>/dev/null; then
            log "✅ 前端服务已就绪"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        warn "前端服务启动超时，请检查日志"
    fi
    
    echo ""  # 换行
}

# 显示部署信息
show_deployment_info() {
    log "🎉 部署完成！"
    echo ""
    echo -e "${BLUE}=== 部署信息 ===${NC}"
    echo -e "部署模式: ${GREEN}$MODE${NC}"
    echo -e "前端地址: ${GREEN}http://localhost:${FRONTEND_PORT:-3000}${NC}"
    echo -e "后端地址: ${GREEN}http://localhost:${IMAGE_SERVER_PORT:-3002}${NC}"
    
    if [[ "$MODE" == "multi-user" ]] || [[ "$MODE" == "all" ]]; then
        echo -e "管理后台: ${GREEN}http://localhost:${ADMIN_PORT:-3003}${NC}"
    fi
    
    if [[ "$MODE" == "production" ]] || [[ "$MODE" == "all" ]]; then
        echo -e "Nginx 入口: ${GREEN}http://localhost:${NGINX_PORT:-80}${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}=== 常用命令 ===${NC}"
    echo "查看服务状态: $COMPOSE_CMD -f docker/docker-compose.yml ps"
    echo "查看日志:     $COMPOSE_CMD -f docker/docker-compose.yml logs -f"
    echo "停止服务:     $COMPOSE_CMD -f docker/docker-compose.yml down"
    echo "重启服务:     $COMPOSE_CMD -f docker/docker-compose.yml restart"
    echo ""
}

# 显示日志
show_logs() {
    if [[ "$SHOW_LOGS" == "true" ]]; then
        log "显示服务日志 (Ctrl+C 退出)..."
        $COMPOSE_CMD -f docker/docker-compose.yml logs -f
    fi
}

# 清理部署
cleanup_deployment() {
    read -p "是否要清理所有容器、镜像和数据卷？(y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "清理部署环境..."
        $COMPOSE_CMD -f docker/docker-compose.yml down -v --remove-orphans
        docker system prune -af --volumes
        log "✅ 清理完成"
    fi
}

# 主函数
main() {
    # 解析命令行参数
    MODE="standalone"  # 默认模式
    DEV_MODE="false"
    FORCE_REBUILD="false"
    NO_CACHE="false"
    PULL_IMAGES="false"
    SHOW_LOGS="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            standalone|multi-user|production|all)
                MODE="$1"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--version)
                show_version
                exit 0
                ;;
            -d|--dev)
                DEV_MODE="true"
                shift
                ;;
            --force)
                FORCE_REBUILD="true"
                shift
                ;;
            --no-cache)
                NO_CACHE="true"
                shift
                ;;
            --pull)
                PULL_IMAGES="true"
                shift
                ;;
            --logs)
                SHOW_LOGS="true"
                shift
                ;;
            --cleanup)
                cleanup_deployment
                exit 0
                ;;
            *)
                error "未知参数: $1"
                ;;
        esac
    done
    
    # 加载环境变量
    if [[ -f .env ]]; then
        source .env
    fi
    
    log "🍌 开始部署 Nano Banana AI Image Editor"
    log "部署模式: $MODE"
    
    # 执行部署步骤
    check_dependencies
    check_environment
    pull_images
    stop_services
    build_images
    start_services
    wait_for_services
    show_deployment_info
    show_logs
    
    log "🎉 部署脚本执行完成！"
}

# 捕获中断信号
trap 'echo -e "\n${YELLOW}部署被中断${NC}"; exit 1' INT TERM

# 执行主函数
main "$@"