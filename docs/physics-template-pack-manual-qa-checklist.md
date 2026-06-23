# Physics Template Pack Manual QA Checklist

Use this checklist before releasing the physics lesson template flow to production.
The goal is to verify that physics templates, lesson V2, course builder, and student players work together end to end.

## Scope

- `/dashboard/lessons/create/physics`
- `/dashboard/lessons/[id]/edit`
- `/dashboard/courses/create`
- `/dashboard/courses/[id]/edit`
- `/student/[code]/lessons/[lessonId]`
- `/student/[code]/courses/[courseId]`
- `/api/lessons`
- `/api/courses`
- `/api/student/[code]/lessons/*`
- `/api/student/[code]/courses/*`

## Automated Gate

Run these before manual QA:

```bash
npm test -- src/__tests__/teacher-lessons-routes.test.ts src/__tests__/classroom-lessons-routes.test.ts src/__tests__/student-lessons-routes.test.ts src/__tests__/lesson-progress-export-route.test.ts src/__tests__/teacher-courses-routes.test.ts src/__tests__/classroom-courses-routes.test.ts src/__tests__/classroom-course-progress-route.test.ts src/__tests__/student-courses-routes.test.ts src/__tests__/student-course-progress-routes.test.ts src/__tests__/student-course-player-route.test.ts
npm run build
```

Expected:

- all targeted tests pass
- production build passes
- no lesson/course route fails on `lesson_content_v2`

## Teacher Template Builder Gate

- [ ] Open `/dashboard/lessons/create/physics`
- [ ] Filter by grade and unit works
- [ ] Physics template cards appear from Pack 1
- [ ] Select one Pack 1 template and create a draft
- [ ] Draft has curriculum metadata:
  - subject
  - curriculumCode
  - gradeLevel
  - semester
  - unitId
  - learningOutcomeIds
- [ ] Draft contains at least one topic with content
- [ ] Add or confirm at least one media or document item
- [ ] Save draft succeeds

## Publish Gate

- [ ] Published lesson blocks if no ready topic exists
- [ ] Published lesson blocks if curriculum metadata is missing
- [ ] Published lesson blocks if no media/document exists
- [ ] Published lesson succeeds when content is complete

## Course Builder Gate

- [ ] Open `/dashboard/courses/create`
- [ ] Physics lesson V2 is selectable in the lesson picker
- [ ] Legacy lesson content does not appear as publish-ready
- [ ] Add the published physics lesson to a module
- [ ] Course publish succeeds only when referenced lessons are publish-ready
- [ ] Assign the published course to a classroom successfully

## Student Lesson Gate

- [ ] Student opens `/student/[code]/lessons/[lessonId]`
- [ ] Lesson hero or media renders
- [ ] Objectives render
- [ ] Topic cards render
- [ ] Section accordion expands correctly
- [ ] Supporting documents render
- [ ] Save progress works
- [ ] Complete lesson works

## Student Course Gate

- [ ] Student opens `/student/[code]/courses/[courseId]`
- [ ] Course overview renders
- [ ] Ordered lesson list renders
- [ ] Opening the physics lesson from course player works
- [ ] Course progress updates after lesson progress save
- [ ] Completed lesson is reflected back in course player

## Media Library Compatibility Gate

- [ ] Media library items can be attached to lesson topics
- [ ] Attached images/videos render in student lesson player
- [ ] Attached documents render in supporting documents

## Release Decision

Ship only when all are true:

- automated gate passed
- one physics template draft was created manually
- one physics lesson was published manually
- one physics course was assigned manually
- one student completed the lesson or reached completion flow manually
