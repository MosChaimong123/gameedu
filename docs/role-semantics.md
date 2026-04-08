# Role Semantics

This document defines the intended meaning of user roles in the current GameEdu domain model.

## Roles

- `ADMIN`
  - Full system administration
  - Can manage users and teacher-facing tools

- `TEACHER`
  - Can create and manage classrooms, question sets, reports, hosting, and OMR tools

- `STUDENT`
  - Authenticated account explicitly linked to a student profile
  - Intended to access student-facing dashboard and linked classroom experiences

- `USER`
  - Generic authenticated account
  - Used for accounts that exist in the auth system but are not yet elevated to `TEACHER` or `ADMIN`, and are not yet linked as a `STUDENT`

## Why `USER` still exists

The schema still supports generic authenticated accounts because some users may sign in before being linked to a classroom or promoted into a teacher/admin workflow.

Milestone 2 does not remove `USER`; it documents the meaning clearly so schema comments, auth types, and future migrations use the same language.

## Follow-up Guidance

When adding new code:

1. Prefer the shared role type from [roles.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/roles.ts)
2. Avoid inline role comments that disagree with the meanings above
3. Treat `USER` as a neutral authenticated role, not as a synonym for `STUDENT`
