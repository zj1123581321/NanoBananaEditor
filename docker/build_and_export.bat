@echo off
chcp 65001 >nul
REM ============================================
REM Docker 镜像打包脚本 (Windows)
REM 功能：构建 Docker 镜像并导出为 tar 文件
REM ============================================

echo ======================================
echo   Nano Banana Editor - 镜像打包
echo ======================================
echo.

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行或未安装！
    echo 请先启动 Docker Desktop 后再运行此脚本。
    pause
    exit /b 1
)

REM 设置镜像名称
set IMAGE_NAME=nano-banana-editor

REM 获取当前日期时间 (格式: YYYYMMDD-HHMMSS)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%-%datetime:~8,6%

REM 设置完整镜像标签
set IMAGE_TAG=%IMAGE_NAME%:%TIMESTAMP%
set IMAGE_LATEST=%IMAGE_NAME%:latest

REM 设置导出目录和文件名
set OUTPUT_DIR=%~dp0output
set TAR_FILE=%OUTPUT_DIR%\%IMAGE_NAME%-%TIMESTAMP%.tar
set IMPORT_SCRIPT=%OUTPUT_DIR%\import_image.sh

echo [1/5] 准备输出目录...
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
echo 输出目录: %OUTPUT_DIR%
echo.

echo [2/5] 构建 Docker 镜像...
echo 镜像标签: %IMAGE_TAG%
echo.
cd /d "%~dp0.."
docker build -t %IMAGE_TAG% -t %IMAGE_LATEST% -f docker/Dockerfile .
if errorlevel 1 (
    echo [错误] Docker 镜像构建失败！
    pause
    exit /b 1
)
echo.

echo [3/5] 导出 Docker 镜像到 tar 文件...
echo 导出文件: %TAR_FILE%
echo 导出标签: %IMAGE_TAG% 和 %IMAGE_LATEST%
echo.
docker save -o "%TAR_FILE%" %IMAGE_TAG% %IMAGE_LATEST%
if errorlevel 1 (
    echo [错误] Docker 镜像导出失败！
    pause
    exit /b 1
)
echo.

echo [4/5] 生成 Linux 导入脚本...
echo 脚本文件: %IMPORT_SCRIPT%
echo.

REM 从模板生成 Linux 导入脚本
set TEMPLATE_FILE=%~dp0import_image_template.sh
if not exist "%TEMPLATE_FILE%" (
    echo [错误] 模板文件不存在: %TEMPLATE_FILE%
    pause
    exit /b 1
)

REM 使用 PowerShell 替换模板中的占位符 (使用 Unix 换行符 LF)
powershell -Command "$content = Get-Content '%TEMPLATE_FILE%' -Raw; $content = $content -replace '__IMAGE_NAME__', '%IMAGE_NAME%'; $content = $content -replace '__IMAGE_TAG__', '%IMAGE_NAME%:%TIMESTAMP%'; $content = $content -replace '__IMAGE_LATEST__', '%IMAGE_NAME%:latest'; $content = $content -replace '__TAR_FILE__', '%IMAGE_NAME%-%TIMESTAMP%.tar'; $content = $content -replace \"`r`n\", \"`n\"; [System.IO.File]::WriteAllText('%IMPORT_SCRIPT%', $content, [System.Text.UTF8Encoding]::new($false))"

if errorlevel 1 (
    echo [错误] 生成导入脚本失败！
    pause
    exit /b 1
)

REM 复制环境配置示例
copy "%~dp0.env.prod.example" "%OUTPUT_DIR%\.env.prod.example" >nul
copy "%~dp0docker-compose.prod.yml" "%OUTPUT_DIR%\docker-compose.prod.yml" >nul

echo.
echo [5/5] 清理本地镜像标签...
echo 保留 latest 标签
echo.

echo ======================================
echo   打包完成！
echo ======================================
echo.
echo 输出文件:
echo   - 镜像文件: %TAR_FILE%
echo   - 导入脚本: %IMPORT_SCRIPT%
echo   - 配置示例: %OUTPUT_DIR%\.env.prod.example
echo   - 编排文件: %OUTPUT_DIR%\docker-compose.prod.yml
echo.
echo 文件大小:
dir "%TAR_FILE%" | findstr /C:"%IMAGE_NAME%"
echo.
echo ======================================
echo   服务器部署步骤
echo ======================================
echo.
echo 1. 上传 output 目录到服务器:
echo    scp -r output/* user@server:/path/to/deploy/
echo.
echo 2. 在服务器上执行:
echo    chmod +x import_image.sh
echo    ./import_image.sh
echo.
echo 3. 配置环境变量:
echo    cp .env.prod.example .env.prod
echo    vim .env.prod  # 编辑实际配置
echo.
echo 4. 启动服务:
echo    docker-compose -f docker-compose.prod.yml up -d
echo.
pause
