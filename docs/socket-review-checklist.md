# Socket Review Checklist

Use this checklist when reviewing Socket.IO handlers, room membership flows, or real-time classroom/game events.

## Identity And Authorization

- Does the event resolve identity on the server instead of trusting IDs from the client payload?
- If the event is host-only, is host ownership checked on the current socket or server-side session?
- If the event targets a classroom, is classroom membership or teacher ownership verified before joining a room or publishing an event?
- If the event is public by design, is that scope explicit and minimal?

## Room Membership

- Does the socket have to join the room before sending room-scoped updates?
- Is room membership tracked on the server rather than inferred from client state?
- Are leave and disconnect paths handled so stale membership does not remain trusted?

## Event Scope

- Is the event type allowlisted instead of accepting arbitrary client-provided event names?
- Does the handler reject unknown or invalid event variants early?
- Is cross-room or cross-game publish prevented even if a caller knows a room id or pin?

## Payload Handling

- Are required payload fields validated before use?
- Are client payload fields normalized when needed?
- Does the handler avoid passing untrusted payloads directly into game or classroom mutation logic?

## Operational Safety

- Should the event be rate-limited or otherwise abuse-controlled?
- Does the success path emit an audit log when the action is privileged?
- Does the reject path emit an audit log when it indicates misuse, spoofing, or authorization failure?

## Review Questions

- What identity does this socket event trust?
- What resource boundary does it protect?
- Can a caller replay or spoof the event with only a known id, class id, or pin?
- If this event fails, can support trace why from audit logs?

## Good References In This Repo

- [register-game-socket-handlers.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/socket/register-game-socket-handlers.ts)
- [register-game-socket-handlers.integration.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/socket/__tests__/register-game-socket-handlers.integration.test.ts)

## Merge Gate

Before merging socket changes:

- `npx tsc --noEmit`
- `npm test`
- verify the new event has authorization coverage
- verify privileged or risky paths have audit logging where appropriate
