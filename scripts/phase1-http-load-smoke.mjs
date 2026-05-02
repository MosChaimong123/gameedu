import process from "node:process";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.PHASE1_BASE_URL?.replace(/\/$/, "");
const path = process.env.PHASE1_PATH ?? "/api/health";
const concurrency = Number.parseInt(process.env.PHASE1_CONCURRENCY ?? "30", 10);
const requests = Number.parseInt(process.env.PHASE1_REQUESTS ?? "120", 10);
const timeoutMs = Number.parseInt(process.env.PHASE1_TIMEOUT_MS ?? "5000", 10);

if (!baseUrl) {
  console.error("PHASE1_BASE_URL is required, for example: PHASE1_BASE_URL=https://your-app.onrender.com");
  process.exit(1);
}

if (!Number.isFinite(concurrency) || concurrency <= 0) {
  console.error("PHASE1_CONCURRENCY must be a positive integer.");
  process.exit(1);
}

if (!Number.isFinite(requests) || requests <= 0) {
  console.error("PHASE1_REQUESTS must be a positive integer.");
  process.exit(1);
}

const target = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
const latencies = [];
const statuses = new Map();
let failures = 0;
let nextIndex = 0;

async function timedFetch() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(target, { signal: controller.signal });
    const text = await res.text().catch(() => "");
    const elapsed = performance.now() - start;
    latencies.push(elapsed);
    statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
    if (!res.ok) {
      failures += 1;
      console.error(`FAIL ${res.status} ${text.slice(0, 160)}`);
    }
  } catch (error) {
    failures += 1;
    const elapsed = performance.now() - start;
    latencies.push(elapsed);
    console.error(`FAIL request error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function worker() {
  while (nextIndex < requests) {
    nextIndex += 1;
    await timedFetch();
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, () => worker()));
const totalMs = performance.now() - startedAt;

latencies.sort((a, b) => a - b);
const percentile = (p) => {
  if (latencies.length === 0) return 0;
  const index = Math.min(latencies.length - 1, Math.ceil((p / 100) * latencies.length) - 1);
  return latencies[index];
};

console.log(JSON.stringify({
  target,
  requests,
  concurrency,
  timeoutMs,
  durationMs: Math.round(totalMs),
  requestsPerSecond: Number((requests / (totalMs / 1000)).toFixed(2)),
  failures,
  statuses: Object.fromEntries(statuses.entries()),
  latencyMs: {
    p50: Math.round(percentile(50)),
    p95: Math.round(percentile(95)),
    p99: Math.round(percentile(99)),
    max: Math.round(latencies.at(-1) ?? 0),
  },
}, null, 2));

if (failures > 0) {
  process.exit(1);
}
