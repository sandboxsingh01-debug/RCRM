@echo off
SET NODE=d:\node20\node-v20.11.0-win-x64
SET PATH=%NODE%;%PATH%

echo =========================================
echo   CRM Public Setup with ngrok
echo =========================================
echo.

REM Start backend
echo [1/5] Starting backend on port 5000...
cd /d f:\RCRM\backend
start "CRM-Backend" cmd /k "set PATH=%NODE%;%PATH% && node src/server.js"
timeout /t 3 /nobreak >nul

REM Start ngrok for backend
echo [2/5] Starting ngrok tunnel for backend...
cd /d C:\Users\pvnsn\OneDrive\Desktop
start "ngrok-backend" cmd /k "ngrok http 5000 --log stdout"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo IMPORTANT MANUAL STEP:
echo.
echo 1. Look at the "ngrok-backend" window
echo 2. Copy the https://xxxx.ngrok-free.app URL
echo 3. Press ANY KEY here, then paste that URL
echo ========================================
echo.
pause

set /p BACKEND_URL="Enter backend ngrok URL (https://...): "

REM Update frontend .env
echo [3/5] Updating frontend .env with backend URL...
cd /d f:\RCRM\frontend
echo REACT_APP_API_URL=%BACKEND_URL%/api > .env

REM Start frontend
echo [4/5] Starting frontend on port 3000...
start "CRM-Frontend" cmd /k "set PATH=%NODE%;%PATH% && npm start"
timeout /t 10 /nobreak >nul

REM Start ngrok for frontend
echo [5/5] Starting ngrok tunnel for frontend...
cd /d C:\Users\pvnsn\OneDrive\Desktop
start "ngrok-frontend" cmd /k "ngrok http 3000 --log stdout"

echo.
echo ========================================
echo   CRM is now PUBLICLY accessible!
echo.
echo   Look at "ngrok-frontend" window
echo   Share that https://xxxx.ngrok-free.app URL
echo.
echo   Login: admin / Admin@123
echo ========================================
echo.
pause
