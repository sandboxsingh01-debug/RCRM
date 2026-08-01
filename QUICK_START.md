# Quick Start Guide

## Single-Click Startup (All Services)

### Step 1: Run START.bat
```
Double-click: START.bat
```

This will automatically start:
- ✅ Backend (port 5000)
- ✅ Frontend (port 3000)
- ✅ ngrok tunnel (port 3000)

Three windows will open showing each service starting.

## For ngrok Public Access

### Step 2: Copy ngrok URL
When ngrok starts, look at the ngrok window and find the "Forwarding" line:
```
Forwarding                    https://abc123xyz.ngrok.io -> http://localhost:3000
```

Copy the URL: `https://abc123xyz.ngrok.io`

### Step 3: Run SETUP_NGROK.bat
```
Double-click: SETUP_NGROK.bat
```

Paste the ngrok URL when prompted. This script will:
- ✅ Update backend CORS configuration
- ✅ Update frontend API URL
- ✅ Restart is needed for backend

### Step 4: Restart Backend
The ngrok window shows which terminal is which:
- **CRM Backend** - Kill it (Ctrl+C) and restart
- **CRM Frontend** - Should auto-reload
- **CRM ngrok** - Keep running

Or simply close and rerun START.bat

### Step 5: Login
Open in browser: `https://abc123xyz.ngrok.io`

**Login Credentials:**
- Username: `admin`
- Password: `Admin@123`

## Important Notes

⚠️ **ngrok URL changes every time you restart ngrok**
- Each restart = new URL
- Run SETUP_NGROK.bat again with the new URL
- OR get ngrok Pro for static URLs

🔐 **HTTPS Only**
- ngrok always uses HTTPS (perfect for security testing)

⏱️ **Free ngrok has rate limits**
- 40 connections/minute
- Consider upgrading for production

## Troubleshooting

### "ngrok not found"
Install from: https://ngrok.com/download

Or use Chocolatey:
```powershell
choco install ngrok
```

### Login still fails
1. Check browser console (F12) for CORS errors
2. Verify ngrok URL is in backend/.env CORS_ORIGIN
3. Verify ngrok URL is in frontend/.env REACT_APP_API_URL
4. Clear browser cache and localStorage

### Ports already in use
- Kill the process using the port
- Or change PORT in backend/.env

## File Locations
- `START.bat` - Master startup script
- `SETUP_NGROK.bat` - ngrok URL configuration
- `backend/.env` - Backend config
- `frontend/.env` - Frontend config
