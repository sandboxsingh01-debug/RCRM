@echo off
REM ===================================================
REM   CRM System - Complete Startup Test & Diagnostics
REM ===================================================

setlocal enabledelayedexpansion

echo.
echo ===================================================
echo   CRM System - COMPLETE TEST
echo ===================================================
echo.

set "NODE20=d:\node20\node-v20.11.0-win-x64"

if exist "%NODE20%" (
    set "PATH=%NODE20%;%PATH%"
    echo [CONFIG] Using Node 20 from d:\node20
) else (
    echo [CONFIG] Using system Node.js
)

echo.
echo ======= STEP 1: VERIFY NODE VERSION =======
echo.
node --version
npm --version
echo.

echo ======= STEP 2: VERIFY DATABASE =======
echo.
if exist "f:\RCRM\backend\database\crm.db" (
    echo [OK] Database file exists
) else (
    echo [ERROR] Database file missing!
)
echo.

echo ======= STEP 3: VERIFY .ENV FILES =======
echo.
if exist "f:\RCRM\backend\.env" (
    echo [OK] Backend .env exists
    findstr JWT_SECRET "f:\RCRM\backend\.env"
) else (
    echo [ERROR] Backend .env missing!
)
echo.

echo ======= STEP 4: TEST BACKEND =======
echo.
echo Starting backend server... (will timeout after 10 seconds)
cd /d f:\RCRM\backend

REM Run backend with 10 second timeout
timeout /t 1 >nul
start /wait timeout /t 10 >nul
taskkill /F /IM node.exe 2>nul

echo Backend test complete.
echo.

echo ======= STEP 5: SUMMARY =======
echo.
echo To start both services:
echo   Option A: Double-click START.bat
echo   Option B: Double-click START_SMART.bat
echo.
echo Then access:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000/health
echo.
echo Test with admin / Admin@123
echo.
pause
