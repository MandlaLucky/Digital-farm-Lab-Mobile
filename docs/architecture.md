# Architecture note — Digital Farm Lab (A14)

## Layers
- Mobile/PWA (Expo + React Native) — FarmSetup, FarmBuilder, Scenarios, Simulation, Results, Trainer.
- API (NestJS 12) — controllers in `backend/src/controllers*.ts`, global JWT guard + roles guard.
- Persistence (PostgreSQL on Neon via TypeORM) — entities in `backend/src/entities.ts`.
- Engine (`backend/src/engine.ts`) — pure function yield = min(water, fert) × plant. Baseline resolver in `baseline.ts`.

## Data flow
Screen → `api.ts` → `/api/v1/...` → controller → service → repository → Postgres.
Runs store `params`, `results`, `baseline` as JSONB so scores are reproducible.

## What would change for production
- Hosted OAuth2/OIDC instead of a signed dev token.
- Object storage (S3) for scenario exports.
- Real sensor ingestion pipeline instead of `V8__seed_sensor_readings`.
- Rate limiting on public endpoints.
