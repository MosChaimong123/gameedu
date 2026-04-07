# Route Pattern Guide

This guide defines the preferred pattern for new routes and route refactors in GameEdu.

## 1. Start With The Policy

Before writing the handler, answer:

- Who can call this route?
- Is it authenticated, role-gated, ownership-gated, or intentionally guest-accessible?
- What is the narrowest safe response shape?
- Does it need rate limiting, audit logging, or structured errors?

If the answer is not clear, stop and write the policy down first.

## 2. Prefer This Route Order

Use this order in route handlers whenever possible:

1. Read params and normalize identifiers.
2. Resolve session or guest identity.
3. Enforce role, membership, or ownership.
4. Validate payload.
5. Query only the fields you need.
6. Perform the mutation or read.
7. Emit audit logs when the action is privileged.
8. Return a narrow DTO or `select`-based response.
9. Return structured errors on every reject path.

## 3. Authentication And Authorization

Use shared helpers before writing ad-hoc checks:

- [auth-guards.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/auth-guards.ts)
- [roles.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/roles.ts)
- [resource-access.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/authorization/resource-access.ts)

Preferred patterns:

- Role-gated teacher/admin route: require session, then check `role`.
- Ownership-gated route: load the resource and compare its owner on the server.
- Guest-by-loginCode route: normalize the code, validate scope, and only expose the minimum data needed for that guest flow.

Avoid:

- trusting IDs from the client for authorship or ownership
- using UI redirects as the only protection
- spreading `body` directly into Prisma `update`

## 4. Validation

For payload validation:

- allowlist fields instead of blindly copying request data
- reject malformed payloads early with `INVALID_PAYLOAD`
- normalize stable identifiers such as `loginCode`

For file and high-cost routes:

- validate file presence, type, and size
- consider rate limiting before expensive work starts

## 5. Structured Errors

Use the shared error contract:

- [api-error.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/api-error.ts)
- [error-code-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/error-code-contract.md)

Preferred shape:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden"
  }
}
```

Reuse existing codes first:

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `INVALID_PAYLOAD`
- `NOT_FOUND`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Only add a new code when the UI or monitoring meaningfully needs a new branch.

## 6. Data Minimization

Prefer:

- Prisma `select`
- narrow DTOs
- response shapes built from exactly what the page or client needs

Avoid:

- returning full Prisma models from API routes
- passing wide server-side models to client components
- exposing hidden JSON blobs or internal metadata unless the UI needs them

## 7. Operational Safety

Consider these helpers for operational hardening:

- [rate-limit.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/security/rate-limit.ts)
- [audit-log.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/security/audit-log.ts)
- [operational-safety-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/operational-safety-contract.md)

Ask:

- Can this route be spammed?
- Is this action privileged enough to audit?
- Is this route part of an incident-prone area such as upload, admin mutation, classroom mutation, or socket lifecycle?

## 8. UI Integration

If the route is user-facing, make sure the UI uses shared helpers:

- [ui-error-messages.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/ui-error-messages.ts)
- [omr-ui-messages.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/omr-ui-messages.ts)
- [set-editor-messages.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/set-editor-messages.ts)

The UI should prefer `error.code` over raw message parsing.

## 9. Route Review Prompts

When reviewing a route, ask:

- What identity does this route trust?
- What resource boundary does it enforce?
- What exact fields leave the server?
- What happens on reject paths?
- Which tests prove the policy?

## 10. Verification

Before merging route changes:

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `npx next build`
