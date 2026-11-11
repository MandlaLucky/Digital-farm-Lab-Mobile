# Digital Farm Lab (A14)

Virtual farm (digital twin) where learners run irrigation / fertiliser / planting-date scenarios and see the effect on yield, water use and gross margin versus baseline.

- Frontend: React Native (Expo SDK 58) → installable PWA on Vercel — https://digital-farm-lab-mobiles.vercel.app
- Backend: NestJS 12 + TypeORM + PostgreSQL (Neon) on Render — https://digital-farm-backend-bez7.onrender.com
- Model: ScenarioEngine (yield / water / cost / gross margin). Simulated teaching model — NOT agronomic advice.

## Golden journey
Farm Setup → choose Sunridge Demo Farm → Scenarios → Simulation (change irrigation %) → Results (yield vs baseline) → submit reflection → score.

## Quick start
Backend: `cd backend && npm ci && npm run start:dev`
Mobile:  `cd mobile && npm ci && npx expo start`
