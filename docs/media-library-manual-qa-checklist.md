# Media Library Manual QA Checklist

Use this checklist before releasing media library changes.

## Scope

- Dashboard media library page
- Add/edit/archive/restore media
- Search/filter/sort/pagination
- Favorite and tag workflows
- Usage tracking from Board, Assignment, and Lesson
- Bulk actions and storage summary

## Desktop QA

- [ ] Open `/dashboard/media-library` as a teacher.
- [ ] Confirm type cards show counts for file, image, video, YouTube, and link.
- [ ] Confirm storage cards show total storage, active count, and archived count.
- [ ] Add one file or image and confirm it appears in active media.
- [ ] Add one link and one YouTube item and confirm preview/open actions work.
- [ ] Search by title and by tag.
- [ ] Filter by each media type.
- [ ] Sort by newest, oldest, name, and file size.
- [ ] Mark one item as favorite, then filter favorites.
- [ ] Edit title and tags.
- [ ] Archive one item, switch to archived filter, then restore it.
- [ ] Select multiple active items and bulk archive them.
- [ ] Select multiple archived items and bulk restore them.
- [ ] Select multiple items and bulk add tags.
- [ ] Select multiple items and bulk remove tags.
- [ ] Confirm pagination still works after filters and bulk changes.

## Mobile QA

- [ ] Open `/dashboard/media-library` on a narrow viewport.
- [ ] Confirm filter controls wrap without overlap.
- [ ] Confirm media cards, selection checkboxes, and bulk toolbar fit.
- [ ] Confirm preview modal is scrollable and usable.
- [ ] Confirm add/edit dialogs fit the viewport.

## Usage Tracking QA

- [ ] Attach one media item to a Board post.
- [ ] Attach one media item to an Assignment.
- [ ] Attach one media item to a Lesson.
- [ ] Return to media library and confirm usage count updates.
- [ ] Confirm student-facing pages show attached Assignment and Lesson media.
- [ ] Archive a used item and confirm old usage surfaces do not break.

## Security QA

- [ ] Confirm unauthenticated users cannot open dashboard media library.
- [ ] Confirm student users are redirected away from dashboard media library.
- [ ] Confirm a teacher cannot mutate another teacher's media by id.
- [ ] Confirm bulk archive/restore/tag operations only affect owned media.
- [ ] Confirm unsafe link/upload URLs are rejected by existing media validation.

## Upload Edge Cases

- [ ] Upload an image with a long filename.
- [ ] Upload a PDF and preview it.
- [ ] Upload a video and confirm metadata/size displays.
- [ ] Try an unsupported URL scheme such as `javascript:`.
- [ ] Try an invalid YouTube id.
- [ ] Confirm duplicate media revives archived records instead of creating confusing duplicates.

## Release Gate

- [ ] `npm.cmd test -- src/__tests__/teaching-media-actions.test.ts src/components/dashboard/__tests__/media-library-grid.test.tsx src/lib/__tests__/teaching-media-reference.test.ts`
- [ ] `npm.cmd run check:board-social`
- [ ] `npm.cmd run build`
- [ ] Manual desktop QA completed.
- [ ] Manual mobile QA completed.
- [ ] Remaining issues recorded before release.
