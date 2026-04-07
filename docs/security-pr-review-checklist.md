# Security PR Review Checklist

Use this checklist when reviewing API routes, server actions, server components, pages, and Socket.IO handlers.

## Access Control

- Is authentication required for this flow?
- If authentication is required, does the code reject unauthenticated callers explicitly?
- Is the required role enforced (`ADMIN`, `TEACHER`, membership, ownership)?
- If the resource belongs to a classroom, set, folder, board, history record, or student, is ownership checked on the server?
- Does the policy live on the server, not only in the UI?
- If the route is intentionally guest-accessible, is that decision explicit and documented?

## Input Validation

- Are request params, query values, and JSON payload fields validated before use?
- Does the route use an allowlist for updatable fields instead of spreading untrusted input into Prisma updates?
- Are public identifiers normalized when needed (for example `loginCode`)?
- If the route accepts files, are type and size validated?

## Data Exposure

- Does the query use `select` or a narrow DTO instead of returning a full Prisma model?
- Are sensitive fields excluded (`password`, plan internals, raw settings, hidden relations, full question JSON unless needed)?
- If this is an admin page, is the data still minimized to only what the UI uses?
- Does the response avoid leaking authorization state or internal implementation details?

## Abuse Controls

- Should this route have rate limiting?
- If the route is high-cost, public-ish, or guessable, is rate limiting already applied?
- If the action is privileged or operationally important, should it emit an audit log?
- If the route is a Socket.IO event, are success and reject paths logged when appropriate?

## Error Handling

- Does the route return structured errors using [api-error.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/api-error.ts)?
- Are `error.code` values reused from the shared contract before inventing a new one?
- Does the UI read `error.code` through shared helpers instead of parsing raw strings?

## Testing

- Is there a regression test for unauthenticated access?
- Is there a regression test for wrong role or wrong ownership?
- If the route is guest-accessible, is there a test proving the allowed guest path and a test proving cross-resource access is blocked?
- If data minimization changed, is there a test that protects the safe response shape?

## Final Verification

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `npx next build`

## Reviewer Notes

Prefer small, explicit server-side checks over clever shared magic. If a policy is non-obvious, ask for a helper or a short comment so the next reviewer can see the rule quickly.
