# Runbook — A14

## Endpoints
- Backend: https://digital-farm-backend-bez7.onrender.com
- Frontend: https://digital-farm-lab-mobiles.vercel.app
- Health: https://digital-farm-backend-bez7.onrender.com/actuator/health

## Deploy
- Backend: push to main → Render auto-deploy (Docker). 2–5 min.
- Frontend: push to main → Vercel auto-deploy. ~1 min.

## Rollback
- Render → service → Deploys → previous build → "Redeploy".
- Vercel → Deployments → previous → ⋯ → "Promote to Production".

## Cold start
- Render free tier sleeps after ~15 min. First request 30–50 s.
- Optional: cron-job.org pings `/actuator/health` every 10 min.

## Env vars (see .env.example)
Backend: DATABASE_URL, JWT_SECRET, PORT, CORS_ALLOWED_ORIGINS, NODE_ENV.
Frontend: EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SPRING_DEV_TOKEN.

## Known issues
- First-run install prompt may not appear on Chrome Android (manifest + SW present, can require a second visit).
