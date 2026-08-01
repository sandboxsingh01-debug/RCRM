@echo off
REM ===================================================
REM    CRM System - Smart Startup with Node 20
REM ===================================================
REM
REM This batch file properly configures Node.js v20
REM and starts both backend and frontend services.
REM
REM Fixes:
REM  ✓ Auto-detects and uses Node 20 if installed
REM  ✓ Falls back to system Node if needed  
REM  ✓ Auto-installs dependencies
REM  ✓ Creates .env if missing
REM  ✓ Shows clear error messages
REM ===================================================

setlocal enabledelayedexpansion

echo.
echo ===================================================
echo   Enterprise CRM System - Smart Startup
echo ===================================================
echo.

REM Try to find Node 20 first
if exist "d:\node20\node-v20.11.0-win-x64\node.exe" (
    echo [CONFIG] Found Node 20 at d:\node20
    set "NODE_PATH=d:\node20\node-v20.11.0-win-x64"
    set "PATH=!NODE_PATH!;!NODE_PATH!\npm;!PATH!"
    echo [CONFIG] Using: Node 20.11.0
) else (
    echo [CONFIG] Using system Node.js
)

REM Verify Node
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo ❌ ERROR: Node.js not found!
    echo.
    echo Solution 1: Install Node.js from https://nodejs.org/
    echo Solution 2: Node 20 is at d:\node20 but check if paths are correct
    echo.
    pause
    exit /b 1
)

echo [CHECK] Node.js version:
node --version
echo [CHECK] npm version:
npm --version
echo.

REM Backend dependencies
echo [1/4] Checking backend dependencies...
if not exist "f:\RCRM\backend\node_modules\" (
    echo     Installing backend packages...
    cd /d f:\RCRM\backend
    call npm install --silent
    if errorlevel 1 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
    echo     ✓ Backend dependencies installed
) else (
    echo     ✓ Backend ready
)

REM Frontend dependencies
echo [2/4] Checking frontend dependencies...
if not exist "f:\RCRM\frontend\node_modules\" (
    echo     Installing frontend packages (this may take 2-3 minutes)...
    cd /d f:\RCRM\frontend
    call npm install --silent
    if errorlevel 1 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
    echo     ✓ Frontend dependencies installed
) else (
    echo     ✓ Frontend ready
)

REM Backend configuration
echo [3/4] Checking configuration...
if not exist "f:\RCRM\backend\.env" (
    echo     Creating .env file...
    (
        echo NODE_ENV=development
        echo PORT=5000
        echo DB_PATH=./database/crm.db
        echo JWT_SECRET=your_jwt_secret_key_change_in_production
        echo CORS_ORIGIN=*
    ) > "f:\RCRM\backend\.env"
    echo     ✓ Configuration created
) else (
    echo     ✓ Configuration ready
)

REM Start services
echo [4/4] Starting services...
echo.
echo Launching backend (port 5000)...
start "CRM Backend" cmd /k "cd /d f:\RCRM\backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Launching frontend (port 3000)...
start "CRM Frontend" cmd /k "cd /d f:\RCRM\frontend && npm start"

echo.
echo ===================================================
echo ✓ Services starting...
echo ===================================================
echo.
echo 📱 Frontend : http://localhost:3000
echo 🔌 Backend  : http://localhost:5000
echo 💚 Health   : http://localhost:5000/health
echo.
echo 🔐 Test Credentials:
echo    Admin    : admin / Admin@123
echo    Sales    : sales1 / Sales@123
echo    Support  : support1 / Support@123
echo.
echo 📖 For ngrok public access, run SETUP_NGROK.bat
echo.
echo ===================================================
echo.
pause
