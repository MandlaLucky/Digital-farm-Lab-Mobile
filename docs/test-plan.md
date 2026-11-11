# Test plan — A14

| ID  | Requirement | Steps | Expected | Tester / date |
|-----|-------------|-------|----------|---------------|
| T01 | Demo farm loads | Open app → Farm Setup | Sunridge Demo Farm appears | _/__ |
| T02 | Auth header | Call GET /api/v1/workspace/farms with Bearer token | 200 + farm list | _/__ |
| T03 | Public demo-farm | GET /api/v1/workspace/demo-farm, no auth | 200 + isDemo true | _/__ |
| T04 | Presets | GET /api/v1/workspace/presets | 8 preset scenarios | _/__ |
| T05 | Run + baseline | Change irrigation to 440mm → run | yield drop vs baseline shown | _/__ |
| T06 | Reflection | Submit ≥30 words | score > 0, pass if ≥60 | _/__ |
| T07 | Trainer view | GET /api/v1/trainer/exercises | cohort summary returned | _/__ |
| T08 | Offline (partial) | Airplane mode → reopen | last cached tiles shown | _/__ |
| T09 | Health | GET /actuator/health | { status: "UP" } | _/__ |
| T10 | Cold start | First request after 15 min idle | 200 within 60 s | _/__ |
