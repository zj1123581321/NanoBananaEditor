@echo off
chcp 65001 >nul
REM Docker Build Script - Windows Version (Simplified)

REM Check .env file (still needed for runtime environment variables)
if not exist "../.env" (
    echo [ERROR] .env file not found, please copy .env.docker to .env first
    exit /b 1
)

echo [INFO] Docker build using fixed multi-user mode
echo [INFO] Runtime environment variables will be loaded from .env file

REM Build Docker image
echo [INFO] Building Docker image...
docker-compose build --no-cache

if errorlevel 1 (
    echo [ERROR] Docker build failed
    exit /b 1
)

REM Start services
echo [INFO] Starting services...
docker-compose up -d

if errorlevel 1 (
    echo [ERROR] Docker start failed
    exit /b 1
)

echo [SUCCESS] Deployment completed!
echo [INFO] Access URLs:
echo    Main Frontend: http://localhost:3002/
echo    Admin Panel: http://localhost:3002/admin/