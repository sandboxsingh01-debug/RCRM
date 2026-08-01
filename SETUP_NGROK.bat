@echo off
SETLOCAL EnableDelayedExpansion

echo.
echo ========================================
echo   ngrok Configuration Setup
echo ========================================
echo.
echo NOTE: Get your ngrok URL from the ngrok window
echo       It looks like: https://abc123.ngrok.io
echo.
echo Example: You see in ngrok window:
echo   "Forwarding                    https://4c8f5db45678.ngrok.io -> http://localhost:3000"
echo.
set /p NGROK_URL="Enter your ngrok URL (without /api): "

IF "!NGROK_URL!"=="" (
    echo ERROR: ngrok URL is required!
    pause
    exit /b 1
)

REM Remove trailing slash if present
IF "!NGROK_URL:~-1!"=="/" SET "NGROK_URL=!NGROK_URL:~0,-1!"

echo.
echo Configuring environment files...
echo.

REM Update backend .env
echo Updating backend/.env...
(
    echo PORT=5000
    echo NODE_ENV=development
    echo.
    echo # CORS Configuration - ngrok URL
    echo CORS_ORIGIN=http://localhost:3000,http://localhost:5000,!NGROK_URL!
    echo.
    echo JWT_SECRET=crm-super-secret-jwt-key-change-in-production-2024
    echo JWT_EXPIRE=7d
    echo.
    echo DB_PATH=./database/crm.db
    echo.
    echo UPLOAD_PATH=../uploads
    echo MAX_FILE_SIZE=10485760
    echo.
    echo WHATSAPP_API_URL=https://graph.facebook.com/v17.0
    echo WHATSAPP_API_KEY=your-whatsapp-api-key
    echo WHATSAPP_PHONE_ID=your-phone-id
    echo.
    echo EMAIL_HOST=smtp.gmail.com
    echo EMAIL_PORT=587
    echo EMAIL_USER=your-email@gmail.com
    echo EMAIL_PASSWORD=your-app-password
    echo EMAIL_FROM=CRM System ^<noreply@yourcompany.com^>
) > backend\.env

REM Update frontend .env
echo Updating frontend/.env...
(
    echo REACT_APP_API_URL=!NGROK_URL!/api
) > frontend\.env

echo.
echo ========================================
echo   Configuration Complete!
echo ========================================
echo.
echo Backend  CORS_ORIGIN: !NGROK_URL!
echo Frontend REACT_APP_API_URL: !NGROK_URL!/api
echo.
echo Next steps:
echo   1. Restart the backend (if running)
echo   2. The frontend will auto-reload
echo   3. Open: !NGROK_URL! in your browser
echo   4. Login with: admin / Admin@123
echo.
pause
