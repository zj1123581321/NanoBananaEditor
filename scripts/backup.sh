#!/bin/bash
# Nano Banana AI Image Editor - 数据备份脚本
# 用于备份用户数据、配置和数据库

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

# 显示帮助信息
show_help() {
    cat << EOF
🍌 Nano Banana AI Image Editor - 备份脚本

用法:
    ./backup.sh [选项]

选项:
    -h, --help      显示此帮助信息
    -f, --full      完整备份 (包括数据库、文件、配置)
    -d, --database  仅备份数据库
    -i, --images    仅备份图片文件
    -c, --config    仅备份配置文件
    -o, --output    指定备份输出目录 (默认: ./backups)
    --compress      压缩备份文件

示例:
    ./backup.sh --full              # 完整备份
    ./backup.sh -d -o /path/backup  # 仅备份数据库到指定目录
    ./backup.sh --images --compress # 备份并压缩图片文件

EOF
}

# 创建备份目录
create_backup_dir() {
    TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
    BACKUP_DIR="${OUTPUT_DIR}/backup_${TIMESTAMP}"
    
    mkdir -p "$BACKUP_DIR"
    log "备份目录: $BACKUP_DIR"
}

# 备份配置文件
backup_config() {
    log "备份配置文件..."
    
    CONFIG_BACKUP_DIR="$BACKUP_DIR/config"
    mkdir -p "$CONFIG_BACKUP_DIR"
    
    # 备份环境配置
    if [[ -f .env ]]; then
        cp .env "$CONFIG_BACKUP_DIR/"
        log "✅ 已备份 .env 文件"
    fi
    
    # 备份 Docker 配置
    cp docker-compose.yml "$CONFIG_BACKUP_DIR/" 2>/dev/null || true
    cp Dockerfile* "$CONFIG_BACKUP_DIR/" 2>/dev/null || true
    cp nginx*.conf "$CONFIG_BACKUP_DIR/" 2>/dev/null || true
    
    # 备份 Supabase 迁移文件
    if [[ -d supabase ]]; then
        cp -r supabase "$CONFIG_BACKUP_DIR/"
        log "✅ 已备份 Supabase 配置"
    fi
    
    log "✅ 配置文件备份完成"
}

# 备份图片文件
backup_images() {
    log "备份图片文件..."
    
    IMAGES_BACKUP_DIR="$BACKUP_DIR/images"
    
    if [[ -d generated_images ]] && [[ -n "$(ls -A generated_images 2>/dev/null)" ]]; then
        mkdir -p "$IMAGES_BACKUP_DIR"
        cp -r generated_images/* "$IMAGES_BACKUP_DIR/"
        
        # 统计文件数量和大小
        FILE_COUNT=$(find "$IMAGES_BACKUP_DIR" -type f | wc -l)
        TOTAL_SIZE=$(du -sh "$IMAGES_BACKUP_DIR" | cut -f1)
        
        log "✅ 已备份 $FILE_COUNT 个图片文件，总大小: $TOTAL_SIZE"
    else
        warn "generated_images 目录为空或不存在"
    fi
}

# 备份数据库
backup_database() {
    log "备份数据库..."
    
    # 检查是否为多用户模式
    if [[ -f .env ]] && grep -q "VITE_APP_MODE=multi-user" .env; then
        log "检测到多用户模式，备份 Supabase 数据..."
        
        # 读取 Supabase 配置
        source .env
        
        if [[ -n "$SUPABASE_SERVICE_ROLE_KEY" ]] && [[ -n "$VITE_SUPABASE_URL" ]]; then
            DB_BACKUP_DIR="$BACKUP_DIR/database"
            mkdir -p "$DB_BACKUP_DIR"
            
            # 使用 pg_dump 备份数据库 (如果可用)
            if command -v pg_dump &> /dev/null; then
                # 从 Supabase URL 提取数据库连接信息
                DB_HOST=$(echo "$VITE_SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co.*|.supabase.co|')
                DB_NAME="postgres"
                
                log "正在导出数据库..."
                pg_dump -h "$DB_HOST" -U postgres -d "$DB_NAME" --no-password > "$DB_BACKUP_DIR/database_dump.sql" 2>/dev/null || {
                    warn "pg_dump 备份失败，将使用 API 方式备份数据"
                    backup_database_via_api
                }
            else
                warn "pg_dump 未安装，使用 API 方式备份数据"
                backup_database_via_api
            fi
        else
            warn "Supabase 配置不完整，跳过数据库备份"
        fi
    else
        log "单用户模式，无需备份数据库"
    fi
}

# 通过 API 备份数据库数据
backup_database_via_api() {
    DB_BACKUP_DIR="$BACKUP_DIR/database"
    mkdir -p "$DB_BACKUP_DIR"
    
    log "通过 API 导出数据..."
    
    # 备份用户数据
    if command -v curl &> /dev/null; then
        # 这里应该调用管理后台的导出 API
        # 由于这是示例，我们创建一个占位文件
        echo "# 数据库备份 - $(date)" > "$DB_BACKUP_DIR/api_backup.txt"
        echo "# 请通过管理后台的导出功能获取完整数据备份" >> "$DB_BACKUP_DIR/api_backup.txt"
        
        warn "请使用管理后台的导出功能获取完整数据备份"
    else
        warn "curl 未安装，无法通过 API 备份数据"
    fi
}

# 备份日志文件
backup_logs() {
    log "备份日志文件..."
    
    LOGS_BACKUP_DIR="$BACKUP_DIR/logs"
    
    if [[ -d logs ]] && [[ -n "$(ls -A logs 2>/dev/null)" ]]; then
        mkdir -p "$LOGS_BACKUP_DIR"
        cp -r logs/* "$LOGS_BACKUP_DIR/"
        log "✅ 已备份日志文件"
    else
        log "无日志文件需要备份"
    fi
}

# 创建备份信息文件
create_backup_info() {
    INFO_FILE="$BACKUP_DIR/backup_info.txt"
    
    cat > "$INFO_FILE" << EOF
# Nano Banana AI Image Editor 备份信息
备份时间: $(date +'%Y-%m-%d %H:%M:%S')
备份类型: $BACKUP_TYPE
主机名: $(hostname)
操作系统: $(uname -s)
用户: $(whoami)

## 备份内容:
$(if [[ "$BACKUP_CONFIG" == "true" ]]; then echo "✅ 配置文件"; else echo "❌ 配置文件"; fi)
$(if [[ "$BACKUP_IMAGES" == "true" ]]; then echo "✅ 图片文件"; else echo "❌ 图片文件"; fi)
$(if [[ "$BACKUP_DATABASE" == "true" ]]; then echo "✅ 数据库"; else echo "❌ 数据库"; fi)
$(if [[ "$BACKUP_LOGS" == "true" ]]; then echo "✅ 日志文件"; else echo "❌ 日志文件"; fi)

## 目录结构:
$(tree "$BACKUP_DIR" 2>/dev/null || find "$BACKUP_DIR" -type d | head -20)

EOF
    
    log "✅ 已创建备份信息文件: $INFO_FILE"
}

# 压缩备份文件
compress_backup() {
    if [[ "$COMPRESS" == "true" ]]; then
        log "压缩备份文件..."
        
        ARCHIVE_NAME="backup_${TIMESTAMP}.tar.gz"
        ARCHIVE_PATH="${OUTPUT_DIR}/${ARCHIVE_NAME}"
        
        tar -czf "$ARCHIVE_PATH" -C "$OUTPUT_DIR" "backup_${TIMESTAMP}"
        
        if [[ -f "$ARCHIVE_PATH" ]]; then
            ARCHIVE_SIZE=$(du -sh "$ARCHIVE_PATH" | cut -f1)
            log "✅ 备份已压缩: $ARCHIVE_PATH ($ARCHIVE_SIZE)"
            
            # 删除原始备份目录
            rm -rf "$BACKUP_DIR"
            log "已删除原始备份目录"
        else
            error "备份压缩失败"
        fi
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log "清理旧备份文件..."
    
    # 保留最近30天的备份
    find "$OUTPUT_DIR" -name "backup_*" -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null || true
    find "$OUTPUT_DIR" -name "backup_*.tar.gz" -mtime +30 -delete 2>/dev/null || true
    
    log "✅ 旧备份清理完成"
}

# 显示备份摘要
show_backup_summary() {
    log "🎉 备份完成！"
    echo ""
    echo -e "${BLUE}=== 备份摘要 ===${NC}"
    
    if [[ "$COMPRESS" == "true" ]]; then
        FINAL_PATH="${OUTPUT_DIR}/backup_${TIMESTAMP}.tar.gz"
        if [[ -f "$FINAL_PATH" ]]; then
            FINAL_SIZE=$(du -sh "$FINAL_PATH" | cut -f1)
            echo -e "备份文件: ${GREEN}$FINAL_PATH${NC}"
            echo -e "文件大小: ${GREEN}$FINAL_SIZE${NC}"
        fi
    else
        FINAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
        echo -e "备份目录: ${GREEN}$BACKUP_DIR${NC}"
        echo -e "目录大小: ${GREEN}$FINAL_SIZE${NC}"
    fi
    
    echo -e "备份时间: ${GREEN}$(date +'%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "备份类型: ${GREEN}$BACKUP_TYPE${NC}"
    echo ""
}

# 主函数
main() {
    # 解析命令行参数
    BACKUP_TYPE="custom"
    BACKUP_CONFIG="false"
    BACKUP_IMAGES="false"
    BACKUP_DATABASE="false"
    BACKUP_LOGS="false"
    OUTPUT_DIR="./backups"
    COMPRESS="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -f|--full)
                BACKUP_TYPE="full"
                BACKUP_CONFIG="true"
                BACKUP_IMAGES="true"
                BACKUP_DATABASE="true"
                BACKUP_LOGS="true"
                shift
                ;;
            -d|--database)
                BACKUP_DATABASE="true"
                shift
                ;;
            -i|--images)
                BACKUP_IMAGES="true"
                shift
                ;;
            -c|--config)
                BACKUP_CONFIG="true"
                shift
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --compress)
                COMPRESS="true"
                shift
                ;;
            *)
                error "未知参数: $1"
                ;;
        esac
    done
    
    # 如果没有指定任何备份类型，默认为完整备份
    if [[ "$BACKUP_CONFIG" == "false" ]] && [[ "$BACKUP_IMAGES" == "false" ]] && [[ "$BACKUP_DATABASE" == "false" ]]; then
        BACKUP_TYPE="full"
        BACKUP_CONFIG="true"
        BACKUP_IMAGES="true"
        BACKUP_DATABASE="true"
        BACKUP_LOGS="true"
    fi
    
    log "🍌 开始备份 Nano Banana AI Image Editor"
    log "备份类型: $BACKUP_TYPE"
    
    # 执行备份步骤
    create_backup_dir
    
    if [[ "$BACKUP_CONFIG" == "true" ]]; then
        backup_config
    fi
    
    if [[ "$BACKUP_IMAGES" == "true" ]]; then
        backup_images
    fi
    
    if [[ "$BACKUP_DATABASE" == "true" ]]; then
        backup_database
    fi
    
    if [[ "$BACKUP_LOGS" == "true" ]]; then
        backup_logs
    fi
    
    create_backup_info
    compress_backup
    cleanup_old_backups
    show_backup_summary
    
    log "🎉 备份脚本执行完成！"
}

# 执行主函数
main "$@"