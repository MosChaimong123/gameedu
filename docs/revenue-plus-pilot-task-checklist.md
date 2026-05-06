# Revenue: PLUS, payment flow, and pilot promo — task checklist

Track work to monetize **GameEdu Plus** (self-serve checkout), verify **one** primary payment path first, and run a **pilot** with clear ops and (optional) promo mechanics.

**Related docs**

- Payment env and smoke tests: [`phase-1-payment-readiness.md`](./phase-1-payment-readiness.md)
- **Master done vs open (อ่านก่อน):** [`phase-1-production-readiness-status.md`](./phase-1-production-readiness-status.md) → section *Quick summary*
- Static Phase 1 checks (includes these docs on disk): `npm run check:phase1` → `scripts/check-phase1-readiness.mjs`
- Commercial roadmap: [`commercial-production-roadmap.md`](./commercial-production-roadmap.md)
- API authorization patterns: [`phase-1-route-authorization-audit.md`](./phase-1-route-authorization-audit.md)
- Plan limits (FREE vs PLUS selling points): `src/constants/plan-limits.ts`
- Upgrade UI: `src/app/dashboard/upgrade/`

---

## Principles

- [ ] **Single primary provider for public launch** — do not treat Stripe + Omise as both “live” until each path is fully verified (see payment readiness doc).
- [ ] **Idempotent webhooks** — no double PLUS grants; failed/unpaid must not grant PLUS.
- [ ] **Pilot before complex coupons** — prefer manual pilot list or separate provider prices before building full promo/coupon plumbing.

---

## Phase 0 — Decide product and provider

- [ ] Confirm **primary buyer** (Thai teachers vs mixed) and default payment method (PromptPay vs card).
- [ ] Choose **primary provider** for first paid launch: Omise (Thai) **or** Stripe.
- [ ] Set **published PLUS positioning** (what FREE caps vs PLUS unlocks — align copy with `plan-limits`).
- [ ] Confirm **display price** strategy: live prices from provider vs static fallback in `src/constants/pricing.ts`.

---

## Phase 1 — Environment and sandbox (engineering)

- [ ] Configure **all required env vars** for the chosen provider ([`phase-1-payment-readiness.md`](./phase-1-payment-readiness.md)).
- [ ] Register **webhook URL** on provider dashboard pointing at production/staging host.
- [ ] Verify **`/dashboard/upgrade`** shows correct payment entry (Stripe checkout and/or Thai flow per flags).
- [ ] Run **full smoke checklist** for the chosen provider (Stripe *or* Omise section in payment readiness).
- [ ] Verify **DB entitlement** after success: `plan`, `planStatus`, customer/subscription fields as designed.
- [ ] Verify **session/UI** reflects PLUS after payment (refresh, no stale FREE).
- [ ] Test **duplicate webhook** and **reconcile** paths do not double-grant.
- [ ] Test **cancellation / failed / unpaid** paths: user does not retain wrongful PLUS.

---

## Phase 2 — Production go-live (billing)

- [ ] **Live** (or production-mode) keys only when legal/hosting/domain are ready; never `BILLING_THAI_PROVIDER=mock` for real money.
- [ ] Document **support playbook**: receipt, refund policy, who to contact, how to fix stuck `plan` manually if needed.
- [ ] Add **monitoring/alerts** for webhook failures and billing errors (outside repo or existing ops stack).
- [ ] Run **post-deploy smoke**: one real or small-amount test aligned with provider policy.

---

## Phase 3 — PLUS packaging and funnel

- [ ] Audit **in-app upgrade prompts** when users hit FREE limits (classrooms, sets, live players, etc.).
- [ ] Ensure **Terms / Privacy** cover paid subscription if not already reviewed (see production readiness).
- [ ] Optional: add **simple analytics** (events: upgrade page view, checkout start, success) — product analytics tool or server logs policy.
- [ ] Define **yearly vs monthly** default on `/dashboard/upgrade` and messaging.

---

## Phase 4 — Pilot program (ops + promo)

**Option A — Ops-first (recommended early)**

- [ ] Maintain a **pilot roster** (school, contact, start/end date, agreed price or free period).
- [ ] For manual upgrades: document **admin steps** (who may set `plan` in DB/admin UI and audit).
- [ ] Collect **feedback + testimonial** agreement if using logos or quotes publicly.

**Option B — Product promo (later)**

- [ ] **Provider-side**: separate Stripe prices or Omise amounts for pilot tier (no code), or coupons in Stripe dashboard.
- [ ] **In-app**: time-boxed trial or coupon field — only after Option A is stable and scope is agreed.

**Option C — Temporary complimentary PLUS**

- [ ] If granting PLUS without payment for pilots: record **expiry** and **offboarding** comms before entitlement ends.

---

## Metrics (lightweight)

- [ ] **Funnel**: visits to `/dashboard/upgrade` → checkout started → paid success (define how you count each).
- [ ] **FREE ceiling hits**: teachers hitting live player / classroom / set limits (signals demand for PLUS).
- [ ] **Churn / non-renewal** after pilot or first period.

---

## Completion criteria (working definition)

Treat “revenue track ready” as done when:

1. One provider path is **sandbox-verified** end-to-end per [`phase-1-payment-readiness.md`](./phase-1-payment-readiness.md).
2. Production webhook and **idempotency** are verified on the deployment host.
3. Pilot **roster and support** process exist even if promo is manual.

Last updated: 2026-05-02
