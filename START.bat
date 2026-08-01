@echo off
setlocal enabledelayedexpansion

echo.
echo =========================================
echo   Enterprise CRM System - STARTUP
echo =========================================
echo.

REM Set Node 20 path
set "NODE20=d:\node20\node-v20.11.0-win-x64"

REM Check if Node 20 exists, fallback to system Node
if exist "%NODE20%" (
    set "PATH=%NODE20%;%PATH%"
    echo [CONFIG] Using Node 20 from %NODE20%
) else (
    echo [CONFIG] Using system Node.js
)

REM Verify Node installation
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ ERROR: Node.js not found
    echo    Install from: https://nodejs.org/
    pause
    exit /b 1
)

echo [CHECK] Node version:
node --version
echo [CHECK] npm version:
npm --version
echo.

REM Backend dependencies
echo [1/4] Backend dependencies...
if not exist "f:\RCRM\backend\node_modules\" (
    echo     Installing backend packages...
    cd /d f:\RCRM\backend
    call npm install --silent
    if errorlevel 1 (
        echo ❌ Failed to install backend
        pause
        exit /b 1
    )
    echo     ✓ Backend ready
) else (
    echo     ✓ Backend ready
)

REM Frontend dependencies
echo [2/4] Frontend dependencies...
if not exist "f:\RCRM\frontend\node_modules\" (
    echo     Installing frontend packages (2-3 minutes)...
    cd /d f:\RCRM\frontend
    call npm install --silent
    if errorlevel 1 (
        echo ❌ Failed to install frontend
        pause
        exit /b 1
    )
    echo     ✓ Frontend ready
) else (
    echo     ✓ Frontend ready
)

REM Backend configuration
echo [3/4] Configuration...
if not exist "f:\RCRM\backend\.env" (
    echo     Creating .env...
    (
        echo NODE_ENV=development
        echo PORT=5000
        echo DB_PATH=./database/crm.db
        echo JWT_SECRET=your_jwt_secret_key_change_in_production
    ) > "f:\RCRM\backend\.env"
    echo     ✓ Created
) else (
    echo     ✓ Configured
)

REM Start services
echo [4/4] Starting services...
echo.

start "CRM Backend" cmd /k "cd /d f:\RCRM\backend && npm run dev"
timeout /t 3 /nobreak >nul

start "CRM Frontend" cmd /k "cd /d f:\RCRM\frontend && npm start"

echo.
echo =========================================
echo  LOCAL ACCESS:
echo  Frontend : http://localhost:3000
echo  Backend  : http://localhost:5000
echo  Health   : http://localhost:5000/health
echo.
echo  LOGIN CREDENTIALS:
echo  Admin    : admin / Admin@123
echo  Sales    : sales1 / Sales@123
echo  Support  : support1 / Support@123
echo.
echo  PUBLIC ACCESS via ngrok:
echo  Open 3rd terminal and run:
echo    ngrok http 3000
echo  Then run SETUP_NGROK.bat to configure
echo =========================================
echo.
pause
