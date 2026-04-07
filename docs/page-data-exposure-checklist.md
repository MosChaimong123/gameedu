# Page And Server-Component Data Exposure Checklist

Use this checklist for Next.js pages, layouts, and server components that fetch from Prisma or other server-side data sources.

## Query Shape

- Does the query use `select` instead of returning a full Prisma model?
- Are nested relations narrowed to only the fields the UI actually renders?
- If a client component receives the data, is the payload still minimized?

## Sensitive Fields

Never pass these to the client unless there is a documented need:

- `password`
- raw `settings`
- billing or plan internals
- hidden moderation or internal metadata
- large JSON blobs such as full question sets unless the page needs them

## Ownership And Access

- Does the page verify the current user can see this resource?
- If this is a teacher/admin page, is the role enforced on the server?
- If the page loads a classroom, set, board, history record, or student, is ownership or membership checked before fetching detail data?

## DTO Discipline

- Is the page returning a narrow DTO to child components instead of a wide ORM shape?
- If a child component needs a subset, is the parent trimming the data before passing it down?
- If the page uses `map` or computed summaries, can the raw relation payload be reduced first?

## Review Questions

- What exact fields leave the server for this page?
- Which of those fields are truly rendered?
- If someone added a new field to the Prisma model tomorrow, would this page accidentally start exposing it?

## Good References In This Repo

- [dashboard/classrooms/[id]/page.tsx](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/dashboard/classrooms/[id]/page.tsx)
- [student/[code]/page.tsx](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/student/[code]/page.tsx)
- [dashboard/reports/[id]/page.tsx](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/dashboard/reports/[id]/page.tsx)
- [admin/users/page.tsx](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/admin/users/page.tsx)
- [admin/sets/page.tsx](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/admin/sets/page.tsx)

## Merge Gate

Before merging page or server-component data changes:

- confirm the query is `select`-based or DTO-based
- confirm role/ownership checks run before sensitive fetches
- add or update a regression test if the page used to expose a wider shape
