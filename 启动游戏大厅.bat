@echo off
setlocal EnableExtensions
title PLAYROOM Game Hall

cd /d "%~dp0"
set "PLAYROOM_URL=http://localhost:3003/"
set "PLAYROOM_PORT=3003"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js 22 or newer.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Repair the Node.js installation.
  pause
  exit /b 1
)

if not exist "portal\package.json" (
  echo [ERROR] portal\package.json was not found.
  echo [ERROR] Run this file from the AI-Game workspace root.
  pause
  exit /b 1
)

powershell.exe -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PLAYROOM_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo [PLAYROOM] Port %PLAYROOM_PORT% is already listening. Opening the game hall...
  start "" "%PLAYROOM_URL%"
  exit /b 0
)

if not exist "portal\node_modules\.bin\vinext.cmd" (
  echo [PLAYROOM] Installing portal dependencies...
  call npm --prefix portal install
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [PLAYROOM] Starting the game hall...
echo [PLAYROOM] Local URL: %PLAYROOM_URL%
echo [PLAYROOM] Keep this window open. Closing it stops the server.
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "$deadline=(Get-Date).AddSeconds(45); do { try { $response=Invoke-WebRequest -UseBasicParsing '%PLAYROOM_URL%' -TimeoutSec 1; if ($response.StatusCode -eq 200) { Start-Process '%PLAYROOM_URL%'; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 } while ((Get-Date) -lt $deadline)"

set "PLAYROOM_SKIP_GAME_BUILD=1"
call npm --prefix portal run dev
set "PLAYROOM_EXIT_CODE=%ERRORLEVEL%"

echo.
if "%PLAYROOM_EXIT_CODE%"=="0" (
  echo [PLAYROOM] The game hall has stopped.
) else (
  echo [ERROR] The game hall stopped with exit code %PLAYROOM_EXIT_CODE%.
)
pause
exit /b %PLAYROOM_EXIT_CODE%
