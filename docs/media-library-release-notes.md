# Media Library Release Notes

## Release Summary

The media library is now a reusable teaching-media hub for teachers. Teachers can upload or save media, search and organize it, attach it to Board posts, Assignments, and Lessons, and manage large libraries with bulk actions.

## Teacher-Facing Changes

- Search, filter, sort, and paginate media server-side.
- Preview files, images, videos, YouTube items, and links.
- Favorite media and filter by favorites.
- Edit titles and tags.
- Archive and restore media safely.
- Select multiple media items for bulk archive, restore, tag add, and tag removal.
- See total storage, active media count, archived count, usage count, and last-used metadata.
- Attach library media to Board, Assignment, and Lesson workflows.

## Student-Facing Changes

- Assignment media appears in the student dashboard, quiz page, and worksheet page.
- Lesson media appears in student lesson pages.

## Security Notes

- Media actions require teacher/admin access.
- Single-item and bulk mutations are owner-scoped.
- Unsafe uploaded media URLs and unsafe link URLs continue to be rejected by existing validation.
- Archive is used instead of hard delete to avoid breaking old classroom content.

## Rollout Plan

- Run targeted media tests and full build.
- Run board/social domain check.
- Complete desktop and mobile manual QA using `docs/media-library-manual-qa-checklist.md`.
- Release to teachers after no blocking issues remain.
- Monitor support reports for upload failures, broken previews, and unexpected usage counts.

## Rollback Plan

- Hide entry points to `/dashboard/media-library` if a blocking UI issue appears.
- Keep archive behavior intact; do not hard-delete media records during rollback.
- If usage metadata becomes stale, rerun media list hydration or call usage sync after affected Board/Assignment/Lesson updates.
