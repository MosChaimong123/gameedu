# i18n Manual QA Checklist

Manual QA checklist for language regression coverage across the first user-facing flows.

## Environment

- App URL: `<fill>`
- Build or commit: `<fill>`
- Browser/device: `<fill>`
- Tester: `<fill>`
- Date: `<fill>`
- Accounts:
  - teacher email: `<fill>`
  - student login code: `<fill>`
  - admin email, optional: `<fill>`

## Automated Preflight

Last run: 2026-05-02

- [x] `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
- [x] `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts`
- [x] `npm.cmd run check:i18n:strict`
- [x] `npm.cmd run predev`
- [x] `npm.cmd run lint` passes with warnings only.
- [x] `npm.cmd run build`
- [x] `thaiSupplemental` has been removed from `src/lib/translation-lookup.ts`.
- [x] Thai lookup order is `thaiPack -> legacyThaiTranslations -> English -> key`.

Additional check:

- [x] Negamon React hook lint errors that blocked `npm.cmd run lint` were fixed as part of final preflight.

Manual browser QA status: blocked until a dev/staging URL and test accounts are available.

## Data Setup

- [ ] At least one teacher account exists.
- [ ] At least one new email is available for sign up.
- [ ] Teacher has at least one classroom.
- [ ] Dashboard has one normal state with existing content.
- [ ] Dashboard has one empty state path, such as no sets or no classes.
- [ ] A failed login can be triggered with invalid credentials.
- [ ] A failed sign up can be triggered with duplicate email or invalid fields.

## Language Switch Baseline

- [ ] App starts in the expected language from cookie/local storage.
- [ ] Switching to Thai updates visible labels without reload.
- [ ] Switching to English updates visible labels without reload.
- [ ] Reload preserves the selected language.
- [ ] No translation key is visible, such as `loginSubmit` or `apiError_*`.
- [ ] No mojibake or broken Thai glyphs are visible.
- [ ] Button labels, placeholders, titles, aria labels, and toast text match the selected language.

## Sign In Flow

Run once in English and once in Thai.

- [ ] Login page title, subtitle, labels, placeholders, and submit button are localized.
- [ ] Invalid credentials show a localized error message.
- [ ] Rate limit or repeated-failure message is localized if it can be triggered safely.
- [ ] Network/server failure toast uses a localized generic or network message.
- [ ] Successful login lands on the dashboard in the selected language.
- [ ] Language selection is still preserved after redirect.
- [ ] There is no raw English API string in Thai mode.
- [ ] There is no raw Thai string in English mode.

## Sign Up Flow

Run once in English and once in Thai.

- [ ] Register page title, subtitle, role selector, labels, placeholders, and legal copy are localized.
- [ ] Client-side validation messages are localized.
- [ ] Duplicate email or username error is localized.
- [ ] Invalid payload/server validation error is localized.
- [ ] Loading/submitting state is localized.
- [ ] Successful sign up lands on the expected page in the selected language.
- [ ] Terms and privacy links remain readable and do not break the sentence in either language.
- [ ] No raw backend message is visible.

## Teacher Dashboard Flow

Run once in English and once in Thai.

- [ ] Sidebar/nav labels are localized.
- [ ] Header, welcome text, quick actions, stats, and cards are localized.
- [ ] Empty state text for sets/classes is localized.
- [ ] Loading states do not show raw keys.
- [ ] Error state or failed data load uses localized copy.
- [ ] Language toggle updates dashboard copy without requiring sign out.
- [ ] Dynamic values interpolate correctly, such as counts, dates, and names.
- [ ] Thai text does not overflow compact buttons, cards, or nav items.
- [ ] English text does not wrap awkwardly in compact controls.

## Student Dashboard Smoke

Run if a student login code is available.

- [ ] Student login code flow keeps selected language.
- [ ] Student dashboard header, tabs, sync CTA, and main cards are localized.
- [ ] Empty or locked states are localized.
- [ ] Toasts from account sync or failed actions are localized.

## Cross-flow Error Checks

- [ ] Structured API errors render localized messages from `apiError_*`.
- [ ] Legacy text errors are mapped to localized messages.
- [ ] Fetch/network failures render localized network copy.
- [ ] Unauthorized/auth-required errors are localized.
- [ ] Forbidden errors are localized.
- [ ] Not found errors are localized.

## Notes / Issues Found

- Automated preflight passed on 2026-05-02.
- Final automated preflight passed on 2026-05-02, including `lint` and production `build`.
- Manual browser QA has not been executed yet because the checklist still needs App URL, build/commit, browser/device, tester, and test account details.

## QA Sign-off

- Status: `[ ] Pass  [ ] Pass with notes  [ ] Blocked`
- Follow-up owner: `<fill>`
- Follow-up issue/PR: `<fill>`
