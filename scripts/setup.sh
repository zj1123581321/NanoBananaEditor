#!/bin/bash
# Nano Banana AI Image Editor - 初始化设置脚本
# 用于首次部署时的环境初始化

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查系统环境
check_system() {
    log "检查系统环境..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        warn "未识别的操作系统: $OSTYPE"
        OS="unknown"
    fi
    
    log "操作系统: $OS"
    
    # 检查架构
    ARCH=$(uname -m)
    log "系统架构: $ARCH"
    
    log "✅ 系统环境检查完成"
}

# 创建必要的目录
create_directories() {
    log "创建必要的目录..."
    
    mkdir -p logs
    mkdir -p generated_images
    mkdir -p admin/dist
    mkdir -p ssl
    
    # 设置权限
    chmod 755 logs generated_images
    
    log "✅ 目录创建完成"
}

# 初始化环境配置
init_environment() {
    log "初始化环境配置..."
    
    # 复制环境配置文件
    if [[ ! -f .env ]]; then
        if [[ -f .env.example ]]; then
            cp .env.example .env
            log "已创建 .env 文件"
        else
            error ".env.example 文件不存在"
        fi
    else
        log ".env 文件已存在，跳过创建"
    fi
    
    # 生成随机密钥
    if command -v openssl &> /dev/null; then
        RANDOM_KEY=$(openssl rand -hex 32)
        log "生成随机密钥: ${RANDOM_KEY:0:8}..."
    else
        RANDOM_KEY=$(date +%s | sha256sum | head -c 32)
        log "生成随机密钥: ${RANDOM_KEY:0:8}..."
    fi
    
    log "✅ 环境配置初始化完成"
}

# 生成 SSL 证书 (自签名，用于开发)
generate_ssl_cert() {
    if [[ ! -f ssl/cert.pem ]] || [[ ! -f ssl/key.pem ]]; then
        log "生成自签名 SSL 证书..."
        
        if command -v openssl &> /dev/null; then
            openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
            log "✅ SSL 证书生成完成"
            warn "这是自签名证书，仅用于开发环境"
        else
            warn "OpenSSL 未安装，跳过 SSL 证书生成"
        fi
    else
        log "SSL 证书已存在，跳过生成"
    fi
}

# 检查 Supabase 配置
check_supabase_config() {
    log "检查 Supabase 配置..."
    
    read -p "是否要配置多用户模式？(y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "请提供 Supabase 配置信息："
        
        read -p "Supabase URL: " SUPABASE_URL
        read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
        read -p "Supabase Service Role Key: " SUPABASE_SERVICE_KEY
        
        if [[ -n "$SUPABASE_URL" ]] && [[ -n "$SUPABASE_ANON_KEY" ]] && [[ -n "$SUPABASE_SERVICE_KEY" ]]; then
            # 更新 .env 文件
            sed -i.bak "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SUPABASE_URL|g" .env
            sed -i.bak "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|g" .env
            sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY|g" .env
            sed -i.bak "s|VITE_APP_MODE=.*|VITE_APP_MODE=multi-user|g" .env
            
            log "✅ Supabase 配置已更新"
        else
            warn "Supabase 配置信息不完整，将使用单用户模式"
        fi
    else
        log "将使用单用户模式"
        sed -i.bak "s|VITE_APP_MODE=.*|VITE_APP_MODE=standalone|g" .env
    fi
}

# 配置企业微信通知 (可选)
configure_wecom_notification() {
    read -p "是否要配置企业微信通知？(y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "请提供企业微信配置信息："
        
        read -p "企业微信 Webhook URL: " WEBHOOK_URL
        
        if [[ -n "$WEBHOOK_URL" ]]; then
            sed -i.bak "s|VITE_WECOM_WEBHOOK_URL=.*|VITE_WECOM_WEBHOOK_URL=$WEBHOOK_URL|g" .env
            log "✅ 企业微信通知配置已更新"
        else
            log "跳过企业微信通知配置"
        fi
    fi
}

# 配置 Gemini API
configure_gemini_api() {
    log "配置 Gemini API..."
    
    read -p "Gemini API Key: " GEMINI_API_KEY
    
    if [[ -n "$GEMINI_API_KEY" ]]; then
        sed -i.bak "s|VITE_GEMINI_API_KEY=.*|VITE_GEMINI_API_KEY=$GEMINI_API_KEY|g" .env
        log "✅ Gemini API 配置已更新"
    else
        warn "Gemini API Key 未设置，应用可能无法正常工作"
    fi
}

# 初始化数据库 (多用户模式)
init_database() {
    if grep -q "VITE_APP_MODE=multi-user" .env; then
        log "初始化数据库..."
        
        echo "请确保 Supabase 实例正在运行，然后执行以下 SQL 脚本："
        echo "文件位置: ./supabase/migrations/001_initial_setup.sql"
        echo ""
        read -p "按 Enter 继续..." -r
        
        log "✅ 数据库初始化提示完成"
    fi
}

# 设置文件权限
set_permissions() {
    log "设置文件权限..."
    
    # 设置脚本可执行权限
    chmod +x deploy.sh
    chmod +x scripts/*.sh 2>/dev/null || true
    
    # 设置日志和图片目录权限
    chmod 755 logs generated_images
    
    log "✅ 文件权限设置完成"
}

# 显示设置摘要
show_setup_summary() {
    log "🎉 初始化设置完成！"
    echo ""
    echo -e "${BLUE}=== 设置摘要 ===${NC}"
    echo -e "操作系统: ${GREEN}$OS${NC}"
    echo -e "系统架构: ${GREEN}$ARCH${NC}"
    
    if grep -q "VITE_APP_MODE=multi-user" .env; then
        echo -e "运行模式: ${GREEN}多用户模式${NC}"
    else
        echo -e "运行模式: ${GREEN}单用户模式${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}=== 下一步 ===${NC}"
    echo "1. 检查并编辑 .env 文件中的配置"
    echo "2. 如果使用多用户模式，请运行 Supabase 数据库迁移"
    echo "3. 运行部署脚本: ./deploy.sh"
    echo ""
    echo -e "${BLUE}=== 部署命令示例 ===${NC}"
    echo "单用户模式: ./deploy.sh standalone"
    echo "多用户模式: ./deploy.sh multi-user"
    echo "生产环境:   ./deploy.sh production"
    echo ""
}

# 主函数
main() {
    log "🍌 Nano Banana AI Image Editor - 初始化设置"
    echo ""
    
    check_system
    create_directories
    init_environment
    generate_ssl_cert
    configure_gemini_api
    check_supabase_config
    configure_wecom_notification
    init_database
    set_permissions
    show_setup_summary
    
    log "🎉 初始化设置完成！"
}

# 执行主函数
main "$@"