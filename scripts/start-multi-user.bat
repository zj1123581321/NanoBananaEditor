@echo off
echo 启动 Nano Banana 多用户模式...

REM 首先清理可能残留的进程
echo 步骤 1: 清理残留进程...
call "%~dp0cleanup.bat"

REM 等待端口完全释放
echo 步骤 2: 等待端口释放...
timeout /t 3 /nobreak >nul

REM 设置环境变量
echo 步骤 3: 设置环境变量...
set VITE_APP_MODE=multi-user

REM 启动服务 (使用 start 命令在新窗口中启动)
echo 步骤 4: 启动服务...
echo 正在启动后端服务器...
start "Nano Banana Backend" cmd /k "cd /d "%~dp0.." && node server/imageServerExtended.cjs"

REM 等待后端启动
timeout /t 5 /nobreak >nul

echo 正在启动前端应用...
start "Nano Banana Frontend" cmd /k "cd /d "%~dp0.." && npm run dev"

REM 等待前端启动
timeout /t 3 /nobreak >nul

echo 正在启动管理后台...
start "Nano Banana Admin" cmd /k "cd /d "%~dp0..\admin" && npm run dev"

echo 所有服务已启动！
echo 前端地址: http://localhost:5173/
echo 管理后台: http://localhost:3003/
echo 后端API: http://localhost:3002/

echo 按任意键关闭此窗口...
pause >nul