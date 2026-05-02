# Phase 1 Local Load Results

Date: 2026-05-02

Environment:

- Local Windows machine
- Production build via `npm run build`
- Local production server via `npm run start`
- URL: `http://localhost:3000`
- This is an HTTP smoke load only, not a full Socket.IO classroom simulation.

## Results

| Scenario | Endpoint | Concurrency | Requests | Status | p50 | p95 | p99 | Max | Failures |
| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 30-user health smoke | `/api/health` | 30 | 120 | 200 x 120 | 81 ms | 2040 ms | 2042 ms | 2064 ms | 0 |
| 30-user readiness smoke | `/api/ready` | 30 | 120 | 200 x 120 | 91 ms | 331 ms | 363 ms | 367 ms | 0 |
| 100-user health smoke | `/api/health` | 100 | 500 | 200 x 500 | 251 ms | 299 ms | 303 ms | 308 ms | 0 |

Observed process snapshot:

- `node run-server.cjs` working set after load: about 500 MB
- No server crash observed during HTTP smoke
- No 4xx/5xx responses observed during HTTP smoke

## Interpretation

These results support moving to a controlled pilot only for HTTP readiness. They do not prove live classroom capacity, Socket.IO reconnect behavior, or MongoDB performance under real game traffic.

Before public launch, repeat on staging/production with:

- `/api/ready`
- real teacher/student flow
- live game with 30 students for 10 minutes
- live game with 100 students across 3 teachers
- Socket.IO disconnect/reconnect tracking
- Render memory/CPU metrics
- MongoDB Atlas metrics
