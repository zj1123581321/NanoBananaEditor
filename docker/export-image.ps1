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

# Generate filename with timestamp
$timestamp = Get-Date -Format "yyyyMMdd"
$filename = "nano-banana-editor-$timestamp.tar"

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
    Write-Host "[INFO] Upload to server and run:" -ForegroundColor Yellow
    Write-Host "  docker load < $filename" -ForegroundColor White
    Write-Host "  docker run -d --name nano-banana -p 3002:3002 --env-file .env docker-ai_image_editor:latest" -ForegroundColor White
    
} catch {
    Write-Host "[ERROR] Image export failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Read-Host "Press Enter to continue"