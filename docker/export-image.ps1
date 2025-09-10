# Docker Image Export Script - PowerShell Version
$ErrorActionPreference = "Stop"

Write-Host "[INFO] Docker Image Export Script" -ForegroundColor Green

# Check if image exists
$images = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -match "docker-ai_image_editor" }
if (-not $images) {
    Write-Host "[ERROR] Image docker-ai_image_editor not found" -ForegroundColor Red
    Write-Host "[INFO] Please run build.ps1 first to build the image" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[INFO] Found docker-ai_image_editor image" -ForegroundColor Green

# Generate unique filename with timestamp and time
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$gitCommit = ""
try {
    $gitCommit = (git rev-parse --short HEAD 2>$null)
    if ($gitCommit) {
        $gitCommit = "-$gitCommit"
    }
} catch {
    # Git not available or not in a repo, continue without commit hash
}

$filename = "nano-banana-editor-$timestamp$gitCommit.tar"

Write-Host "[INFO] Exporting to file: $filename" -ForegroundColor Yellow

try {
    # Export image
    & docker save docker-ai_image_editor:latest -o $filename
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker save failed with exit code $LASTEXITCODE"
    }
    
    # Check file and show size
    if (Test-Path $filename) {
        $fileSize = (Get-Item $filename).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Host "[INFO] File size: $fileSizeMB MB ($fileSize bytes)" -ForegroundColor Cyan
    } else {
        throw "Export file not created"
    }
    
    Write-Host "[SUCCESS] Image exported successfully!" -ForegroundColor Green
    Write-Host "[INFO] File location: $(Get-Location)\$filename" -ForegroundColor White
    Write-Host ""
    Write-Host "[INFO] 云端部署步骤 (确保加载最新镜像):" -ForegroundColor Yellow
    Write-Host "  1. 上传镜像文件到服务器:" -ForegroundColor Cyan
    Write-Host "     scp $filename user@server:/path/" -ForegroundColor White
    Write-Host ""
    Write-Host "  2. 服务器端清理旧镜像并加载新镜像:" -ForegroundColor Cyan
    Write-Host "     # 停止现有容器" -ForegroundColor Gray
    Write-Host "     docker-compose down" -ForegroundColor White
    Write-Host "     # 删除旧镜像 (强制)" -ForegroundColor Gray
    Write-Host "     docker rmi docker-ai_image_editor:latest || true" -ForegroundColor White
    Write-Host "     # 加载新镜像" -ForegroundColor Gray
    Write-Host "     docker load < $filename" -ForegroundColor White
    Write-Host ""
    Write-Host "  3. 验证镜像加载成功:" -ForegroundColor Cyan
    Write-Host "     docker images | grep docker-ai_image_editor" -ForegroundColor White
    Write-Host ""
    Write-Host "  4. 上传配置文件并启动:" -ForegroundColor Cyan
    Write-Host "     cp .env.production.example .env.production" -ForegroundColor White
    Write-Host "     # 编辑 .env.production，填入实际配置" -ForegroundColor Gray
    Write-Host "     docker-compose -f docker-compose.production.yml up -d" -ForegroundColor White
    Write-Host ""
    Write-Host "  镜像信息: $filename" -ForegroundColor Green
    
} catch {
    Write-Host "[ERROR] Image export failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Read-Host "Press Enter to continue"