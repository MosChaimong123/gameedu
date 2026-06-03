# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in GameEdu, **please do not open a public
GitHub issue.** Report it privately so we can investigate and release a fix before
public disclosure.

**Contact:** open a [GitHub Security Advisory](../../security/advisories/new)
(private — only you and repository maintainers can see it), or email the maintainer
directly via the contact on the GitHub profile.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (or a proof-of-concept)
- The affected version / commit hash
- Any suggested mitigations (optional)

We aim to acknowledge reports within **72 hours** and provide a resolution timeline
within **7 days** of confirmation.

---

## Scope

The following are **in scope** for security reports:

| Area | Examples |
|------|---------|
| Authentication & authorization | Session bypass, role escalation, missing ownership checks |
| Data exposure | Leaking user/student data in API responses or page props |
| Payment & billing | Stripe webhook bypass, subscription manipulation |
| Real-time game abuse | Socket.io event spoofing, economy manipulation, reward duplication |
| Injection | MongoDB operator injection, XSS via untrusted input |
| Insecure direct object reference (IDOR) | Accessing another classroom's, student's, or teacher's data |
| Rate limiting bypass | Flooding auth, economy, or game endpoints |

The following are **out of scope:**

- Vulnerabilities in third-party services (MongoDB Atlas, Stripe, Render, Sentry) — report those directly to the vendor
- Theoretical attacks with no practical impact
- Automated scanner results without manual verification
- UI/UX issues that do not have a security impact

---

## Supported Versions

Only the latest commit on the `main` branch is actively maintained.

---

## Security Architecture

GameEdu applies security controls at multiple layers. If you are reviewing the code,
start with these files:

| Layer | Key modules |
|-------|-------------|
| Authentication | `src/auth.ts`, `src/lib/auth/` |
| Role & ownership guards | `src/lib/role-guards.ts`, `src/lib/auth-guards.ts`, `src/lib/authorization/` |
| Input validation | Zod schemas throughout `src/app/api/**` and `src/lib/` |
| Audit logging | `src/lib/security/audit-log.ts` |
| Rate limiting | `src/lib/security/rate-limit.ts` |
| Economy idempotency | `EconomyTransaction.idempotencyKey` (Prisma) |
| Socket.io security | `src/lib/socket/` + CORS origin validation |

For reviewer checklists see:

- [docs/security-pr-review-checklist.md](docs/security-pr-review-checklist.md)
- [docs/socket-review-checklist.md](docs/socket-review-checklist.md)
- [docs/page-data-exposure-checklist.md](docs/page-data-exposure-checklist.md)
- [docs/quarterly-security-sweep-routine.md](docs/quarterly-security-sweep-routine.md)

---

## Disclosure Policy

We follow **coordinated disclosure**. We ask reporters to:

1. Give us reasonable time to release a fix before public disclosure
2. Not exploit the vulnerability beyond what is needed to demonstrate it
3. Not access, modify, or delete other users' data

We will publicly acknowledge confirmed vulnerabilities (unless the reporter requests
anonymity) after the fix is released.
