@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo   CRM Unified Startup via ngrok
echo ===================================================
echo.

REM Set local Node path
set "NODE_DIR=%~dp0.tools\node"
if exist "%NODE_DIR%\node.exe" (
    set "PATH=%NODE_DIR%;%PATH%"
    echo [CONFIG] Using local Node.js from %NODE_DIR%
) else (
    echo [CONFIG] Using system Node.js
)

node start-public-ngrok-unified.js
pause

