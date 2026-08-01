# Deploy Online — Vercel + Render + Neon (free)

This app is now Postgres-ready. The frontend (React) goes on Vercel, the API (Express) goes on Render, and the database goes on Neon. All three have free tiers.

## Accounts you need
- GitHub — hosts your code (both Render and Vercel deploy from it)
- Neon — free Postgres: https://neon.tech
- Render — free web service: https://render.com
- Vercel — free static hosting: https://vercel.com

---

## Step 1 — Create the database (Neon, ~3 min)
1. Sign up at neon.tech, create a project (choose the free plan, any region).
2. Copy the **connection string** — it looks like `postgresql://user:password@host/dbname`. This is your `DATABASE_URL`.

## Step 2 — Put the code on GitHub
1. Create a new (private) repo on GitHub.
2. Push this folder (the `.gitignore` already excludes `node_modules`, env files, uploads, and old SQLite DBs):
   ```bash
   git init
   git add .
   git commit -m "CRM: PostgreSQL-ready + deploy config"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

## Step 3 — Deploy the backend (Render, ~10 min)
1. On render.com: **New → Blueprint** and pick your GitHub repo.
2. Render reads `render.yaml` and creates the `crm-backend` service.
3. After it's created, open the service → **Environment** and add the secrets:
   - `DATABASE_URL` → the Neon connection string
   - `JWT_SECRET` → any long random string
4. Click **Manual Deploy → Deploy latest commit**.
5. When live, Render gives you a URL like `https://crm-backend.onrender.com`. Check `https://crm-backend.onrender.com/health` → should show `{"status":"OK"...}`.

## Step 4 — Seed the database
Run once, from your local machine, with the Neon URL:
```bash
cd backend
DATABASE_URL="postgresql://user:password@host/dbname" npm run seed
```
You should see the 3 default users created. (Or connect a one-off shell on Render and run the same command.)

## Step 5 — Deploy the frontend (Vercel, ~5 min)
1. On vercel.com: **Add New → Project** and import your GitHub repo.
2. Vercel auto-detects it as a React/CRA app.
3. **Important:** in Project Settings → Environment Variables, add (before building):
   - `REACT_APP_API_URL` → `https://crm-backend.onrender.com/api`
4. Deploy. Your app is live at `https://<your-project>.vercel.app`.

## Step 6 — Log in
Open the Vercel URL → login:
- `admin` / `Admin@123` (Super Admin)

---

## Notes & limitations (free tier)
- **Render free** spins down after 15 min idle — the first request after inactivity takes ~30-60s (cold start). Wake-ups are free.
- **Uploads** (ticket screenshots) write to Render's local disk, which is reset on each redeploy. Files are fine between deploys but not permanent. For permanent files, move to Cloudflare R2 / Supabase Storage (separate task).
- **Python Excel-import service** is not deployed — it still targets the old SQLite file. It can be migrated to Postgres and run as a second Render service later if you want Excel import online.
- If you later add a custom domain, update `REACT_APP_API_URL` and rebuild.
- WhatsApp/email notifications are off until you set their env vars (the WhatsApp key, phone ID, etc.) on Render.

## Local development after migration
The app now requires Postgres locally too:
```bash
cd backend
DATABASE_URL="postgresql://user:password@host/dbname" npm run seed
DATABASE_URL="postgresql://user:password@host/dbname" npm run dev
```
You can point at your Neon DB (same as production) or run a local Postgres. Run `npm run test:db` to sanity-check the DB layer against an in-memory Postgres.
