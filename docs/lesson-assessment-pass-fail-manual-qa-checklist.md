# Lesson Assessment Pass/Fail Manual QA Checklist

Use this checklist before releasing lesson-level assessment, pass/fail, reward, and certificate flows to production.

## Scope

- `/dashboard/lessons/[id]/edit`
- `/student/[code]/lessons/[lessonId]`
- `/student/[code]`
- `/dashboard/classrooms/[id]`
- `/api/lessons/[id]`
- `/api/student/[code]/lessons/[lessonId]/assessment`
- `/api/student/[code]/lessons/[lessonId]/assessment/attempt`
- `/api/classrooms/[id]/courses/[courseId]/assessment-results`

## Automated Gate

Run these before manual QA:

```bash
npm.cmd exec vitest run src/__tests__/course-assessment-routes.test.ts src/__tests__/student-lessons-routes.test.ts src/__tests__/teacher-courses-routes.test.ts src/__tests__/classroom-courses-routes.test.ts src/__tests__/student-course-progress-routes.test.ts src/__tests__/student-course-player-route.test.ts src/__tests__/student-course-certificate-route.test.ts
npm.cmd run build
```

Expected:

- all targeted assessment files pass
- production build passes
- no lesson/course assessment route breaks when reward and certificate config are enabled

## Teacher Setup Gate

- [ ] Open `/dashboard/lessons/[id]/edit`
- [ ] Confirm the lesson has a Lesson V2 assessment slot
- [ ] Generate or attach one question set from lesson or topic source
- [ ] Set pass score
- [ ] Enable retake
- [ ] Configure at least one reward field if needed
- [ ] Configure certificate if needed
- [ ] Save draft successfully
- [ ] Publish succeeds only when assessment config is valid

## Student Pass Flow Gate

- [ ] Open `/student/[code]/lessons/[lessonId]`
- [ ] Assessment tab appears for a lesson that has an assessment
- [ ] Questions load without exposing correct answers
- [ ] Submit a complete answer set
- [ ] Passing result shows `passed`
- [ ] Score, max score, and pass score render correctly
- [ ] Reward status updates after the first pass
- [ ] Certificate status updates after the first pass when enabled
- [ ] Lesson list reflects passed assessment state

## Student Fail And Retake Gate

- [ ] Use a student or reset state so the first attempt fails
- [ ] Submit a failing answer set
- [ ] Result shows `failed`
- [ ] When retake is enabled, retry action is available
- [ ] Submit a second passing attempt
- [ ] Reward is not granted twice if the reward was already granted
- [ ] Certificate is not duplicated on retake
- [ ] If retake is disabled, submit stays locked after the failed attempt

## Teacher Reporting Gate

- [ ] Open the teacher classroom results view for the assigned course
- [ ] Confirm submitted / passed / failed / not-started summary is correct
- [ ] Confirm latest score and attempt count are visible per student
- [ ] Confirm failed-only or not-started filters work
- [ ] Confirm top missed questions render
- [ ] Export CSV works and includes assessment-related fields

## Reward And Certificate Gate

- [ ] Passed attempt grants configured reward exactly once
- [ ] Failed attempt grants no reward
- [ ] Reward is not farmable through retake
- [ ] Certificate issues only after a passing attempt
- [ ] Teacher lesson edit view shows reward/certificate recipients
- [ ] Student route payload reflects reward and certificate status accurately

## Release Decision

Ship only when all are true:

- automated gate passed
- one teacher-created topic assessment was verified manually
- one student pass flow was verified manually
- one student fail and retake flow was verified manually
- teacher reporting was verified manually
- reward/certificate behavior was verified manually
