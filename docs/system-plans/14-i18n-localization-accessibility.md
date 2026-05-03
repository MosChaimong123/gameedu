# System Plan 14: i18n / Localization / Accessibility

Last updated: 2026-05-03

## Scope

- Translation packs, lookup, hardcoded string guard, UI error messages, accessibility labels, manual language QA

## Key Files

- `src/lib/translations.ts`
- `src/lib/translations-th-legacy.json`
- `src/lib/translation-lookup.ts`
- `src/__tests__/i18n-regression.test.ts`
- `scripts/check-i18n-hardcoded.mjs`
- `docs/i18n-manual-qa-checklist.md`

## Problem Analysis Checklist

- [ ] ตรวจ raw translation key ใน UI
- [ ] ตรวจ Thai fallback เป็น English โดยไม่ตั้งใจ
- [ ] ตรวจ literal keys ที่ไม่ควรบังคับ Thai glyph
- [ ] ตรวจ hardcoded strings false positive/false negative
- [ ] ตรวจ text overflow ภาษาไทย
- [ ] ตรวจ aria labels/placeholders/toasts
- [ ] ตรวจ structured API errors mapping

## Improvement Plan

1. Keep regression by user-facing flow
2. Separate Thai-glyph keys from literal keys
3. Decide whether to merge legacy Thai JSON into sourceหลัก
4. Add manual browser QA Thai/English
5. Maintain i18n guardrail in release gate

## Validation

- `npm.cmd test -- src/__tests__/i18n-regression.test.ts src/__tests__/ui-error-messages.test.ts`
- `npm.cmd run check:i18n:strict`
- `npm.cmd run lint`
- `npm.cmd run build`
- Manual: `docs/i18n-manual-qa-checklist.md`

## Exit Criteria

- No raw keys in core flows
- Thai/English switch ผ่าน manual QA
