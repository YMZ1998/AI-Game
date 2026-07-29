@echo off
setlocal
chcp 65001 >nul
title PLAYROOM 游戏大厅

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js，请先安装 Node.js 22 或更高版本。
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 npm，请检查 Node.js 安装是否完整。
  pause
  exit /b 1
)

powershell.exe -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3003 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo [PLAYROOM] 游戏大厅已经在运行，正在打开浏览器……
  start "" "http://localhost:3003/"
  exit /b 0
)

echo [PLAYROOM] 正在启动游戏大厅……
echo [PLAYROOM] 本机地址：http://localhost:3003/
echo [PLAYROOM] 请保持此窗口开启；关闭窗口会停止大厅服务。
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "$deadline=(Get-Date).AddSeconds(30); do { try { $response=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3003/' -TimeoutSec 1; if ($response.StatusCode -eq 200) { Start-Process 'http://localhost:3003/'; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 } while ((Get-Date) -lt $deadline)"

set "PLAYROOM_SKIP_GAME_BUILD=1"
call npm run dev

echo.
echo [PLAYROOM] 游戏大厅已停止。
pause
