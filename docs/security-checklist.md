# Security checklist — A14

- [x] Passwords hashed with bcrypt (`backend` package.json: bcrypt ^6).
- [x] SQL parameterised — all queries through TypeORM repositories (no raw concat).
- [x] Secrets in environment variables only (`.env` is gitignored, `.env.example` to be added).
- [x] JWT signed HS256, verified by `JwtAuthGuard` on every protected route.
- [x] Role checks via `@Roles(...)` + `RolesGuard`.
- [x] Ownership checks — farms/scenarios are filtered by `ownerId` / `createdBy`.
- [x] Error filter maps exceptions to `{ code, message, fieldErrors }` — no stack leakage.
- [x] Global CORS allowlist from `CORS_ALLOWED_ORIGINS`.
- [x] Health endpoint `GET /actuator/health`.
- [ ] Rate limiting (@nestjs/throttler) — planned.
- [ ] Dependabot — planned.
