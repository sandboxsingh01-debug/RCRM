# How to Make CRM Publicly Accessible via ngrok

## Current Situation
- Frontend ngrok: https://narrow-expanse-unrefined.ngrok-free.dev (port 3000) ✅ WORKING
- Backend: Running on localhost:5000 but NOT exposed via ngrok ❌ NOT ACCESSIBLE

## The Problem
When you open the ngrok URL in browser, the frontend loads but can't reach the backend because:
- Frontend tries to call: `https://narrow-expanse-unrefined.ngrok-free.dev:5000/api` 
- But port 5000 is NOT tunneled by ngrok
- Backend is only accessible on `localhost:5000` (your local machine)

## Solution: Run TWO ngrok tunnels

### Step 1: Open Command Prompt #1 (Backend ngrok)
```cmd
cd C:\Users\pvnsn\OneDrive\Desktop
ngrok http 5000
```

**Copy the https URL** that appears (something like `https://abc123.ngrok-free.app`)

### Step 2: Update Frontend Config
Open file: `f:\RCRM\frontend\.env`

Replace with:
```
REACT_APP_API_URL=https://YOUR-BACKEND-URL-FROM-STEP1.ngrok-free.app/api
```

Example:
```
REACT_APP_API_URL=https://abc123.ngrok-free.app/api
```

### Step 3: Restart Frontend
Press Ctrl+C in the frontend terminal, then:
```cmd
cd f:\RCRM\frontend
npm start
```

### Step 4: Open Command Prompt #2 (Frontend ngrok)
```cmd
cd C:\Users\pvnsn\OneDrive\Desktop
ngrok http 3000
```

Copy the new https URL and share it.

## Quick Login Test
After setup, go to:
```
https://YOUR-NEW-FRONTEND-NGROK-URL.ngrok-free.app/login
```

Login:
- Username: `admin`
- Password: `Admin@123`

---

## Alternative: Use START_PUBLIC.bat

Double-click: `f:\RCRM\START_PUBLIC.bat`

It will guide you through all steps automatically.
