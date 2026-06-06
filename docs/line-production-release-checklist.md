# LINE Production Release Checklist

Use this checklist before deploying or verifying the Nong Gring LINE assistant on production.

## 1. Required Environment Variables

Set these in Render for the production web service:

- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CLASSROOM_BINDING_SECRET`
- `LINE_REMINDER_CRON_SECRET`
- `NEXT_PUBLIC_APP_URL=https://www.teachplayedu.com`
- `NEXT_PUBLIC_LINE_BOT_URL` or `LINE_BOT_CHAT_URL`

Optional:

- `LINE_BOT_ENABLED=false` to disable the LINE webhook without removing secrets
- `GEMINI_API_KEY` for AI preliminary grading on LINE text submissions

Notes:

- `LINE_CLASSROOM_BINDING_SECRET` should be a long random secret.
- `LINE_REMINDER_CRON_SECRET` can be different from `ADMIN_SECRET`; prefer a dedicated secret.
- `NEXT_PUBLIC_LINE_BOT_URL` should be the LINE official account chat/add-friend URL so student dialogs can open the bot chat.

Production confirmation shortcut:

- Open `/admin/line-health`
- Confirm these show as configured:
  - `LINE_CHANNEL_SECRET`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_CLASSROOM_BINDING_SECRET`
  - `LINE_REMINDER_CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `LINE_BOT_CHAT_URL`
- Confirm `GEMINI_API_KEY` only if AI preliminary grading is expected in production

## 2. LINE Developers Settings

Messaging API webhook:

```text
https://www.teachplayedu.com/api/webhooks/line
```

Required settings:

- Use webhook: enabled
- Webhook URL: verified
- Allow bot to join group chats: enabled in LINE Official Account Manager
- Auto-response messages: disabled if they conflict with webhook replies
- Greeting message: optional, but keep it short

## 3. Render Cron / External Scheduler

Auto reminders are sent by:

```text
POST https://www.teachplayedu.com/api/jobs/line-reminders
Authorization: Bearer <LINE_REMINDER_CRON_SECRET>
```

Recommended schedule:

- Run every 30-60 minutes during teacher-visible hours
- Keep cron in Asia/Bangkok mental model, but route logic uses Bangkok calendar days
- Avoid running more frequently than needed because each run scans bound LINE classrooms
- Weekly summary runs on Bangkok Mondays when the classroom has `weeklySummary` enabled
- Delivery history stores `sent`, `pending`, or `failed` status plus a short error message when LINE push fails

Expected success response:

```json
{
  "success": true,
  "scannedGroups": 1,
  "candidateCount": 1,
  "sentCount": 1,
  "skippedDuplicateCount": 0,
  "failedCount": 0
}
```

## 4. Automated QA Commands

Run before a LINE-only deploy:

```powershell
npm.cmd test -- src/__tests__/line-webhook-route.test.ts src/__tests__/line-auto-reminders-route.test.ts src/__tests__/assignment-line-reminders-route.test.ts src/__tests__/classroom-student-line-link-route.test.ts src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/lib/line-bot/__tests__/student-linking.test.ts src/lib/line-bot/__tests__/auto-reminders.test.ts src/lib/line-bot/__tests__/ai-grading.test.ts src/lib/line-bot/__tests__/repository-submission.test.ts
npx.cmd tsc --project tsconfig.server.json --noEmit
```

If the change touches pricing or plan gates, also run:

```powershell
npm.cmd run check:billing-plan
```

## 5. Manual QA: One Classroom

Use one real teacher, one classroom, and two students.

- [ ] Teacher opens classroom page
- [ ] Teacher opens LINE binding dialog
- [ ] Bot is invited to the classroom LINE group
- [ ] Teacher sends the bind command in the group
- [ ] Classroom page updates to connected while the dialog is open
- [ ] Student logs into web
- [ ] Student clicks `เชื่อม LINE`
- [ ] Student copies `เชื่อม <code>`
- [ ] Student sends the command in private LINE chat with bot
- [ ] Student dialog updates to connected
- [ ] Teacher sees that student as connected
- [ ] Teacher clicks `Send LINE` for one assignment
- [ ] LINE group receives reminder
- [ ] Student types `งานของฉัน` in private chat
- [ ] Bot replies with only that student's work
- [ ] Teacher clicks classroom-level missing-work reminder
- [ ] Group receives aggregate reminder without leaking private score data
- [ ] Export downloads successfully
- [ ] Teacher resets the student's LINE link
- [ ] Student can relink with a new code

## 6. Deploy Scope Check

Before staging:

```powershell
git status --short
```

For a LINE-only deploy, include only:

- `src/lib/line-bot/**`
- `src/app/api/webhooks/line/**`
- `src/app/api/jobs/line-reminders/**`
- `src/app/api/classrooms/[id]/**/line-*`
- `src/app/api/student/[code]/line-link/**`
- `src/components/classroom/classroom-line-assignment-panel.tsx`
- `src/components/student/student-line-link-dialog.tsx`
- LINE tests
- LINE docs

Avoid including unrelated Negamon, generated files, local debug files, or experimental scripts.

Current repo-safe note:

- If `git diff --cached --name-only` is empty, no deploy scope has been staged yet.
- Stage LINE files explicitly instead of using broad `git add .`.

## 7. Rollback Notes

If production LINE fails:

1. Set `LINE_BOT_ENABLED=false` in Render.
2. Redeploy/restart service.
3. LINE webhook will return disabled/not configured instead of processing events.
4. Classroom web app remains usable without LINE automation.
