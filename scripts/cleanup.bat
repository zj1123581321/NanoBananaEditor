@echo off
chcp 65001 >nul
echo 正在清理 Nano Banana 相关进程...

REM 强制终止所有 node.exe 进程
echo 终止 Node.js 进程...
taskkill /F /IM node.exe >nul 2>&1

REM 等待进程完全终止
timeout /t 2 /nobreak >nul

REM 检查端口占用并清理
echo 检查端口占用情况...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002 " ^| findstr "LISTENING"') do (
    echo 终止占用端口 3002 的进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3003 " ^| findstr "LISTENING"') do (
    echo 终止占用端口 3003 的进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo 终止占用端口 5173 的进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174 " ^| findstr "LISTENING"') do (
    echo 终止占用端口 5174 的进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo 清理完成！
timeout /t 1 /nobreak >nul