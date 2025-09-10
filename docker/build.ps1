# Docker Build Script - PowerShell Version
$ErrorActionPreference = "Stop"

Write-Host "[INFO] Docker Build Script Starting..." -ForegroundColor Green

# 检查 .env 文件
if (!(Test-Path "..\.env")) {
    Write-Host "[ERROR] .env file not found" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Loading environment variables..." -ForegroundColor Yellow

# Docker 现在使用固定的 multi-user 模式，无需加载构建时环境变量
Write-Host "[INFO] Using fixed multi-user mode for Docker build" -ForegroundColor Green

# 构建 Docker
Write-Host "[INFO] Building Docker image..." -ForegroundColor Yellow
& docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker build failed" -ForegroundColor Red
    exit 1
}

# 启动服务
Write-Host "[INFO] Starting services..." -ForegroundColor Yellow
& docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker start failed" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Deployment completed!" -ForegroundColor Green
$port = if ($env:APP_PORT) { $env:APP_PORT } else { "3002" }
Write-Host "Access: http://localhost:$port/" -ForegroundColor White