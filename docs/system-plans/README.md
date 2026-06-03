# System Plans Index

Last updated: 2026-05-24

Use this folder for system-by-system analysis and development planning across GameEdu.

## Recommended Order

1. [Auth / User / Security](./01-auth-user-security.md)
2. [Classroom Core](./02-classroom-core.md)
3. [Student Dashboard / Student Code](./03-student-dashboard-code.md)
4. [Assignment / Quiz / Manual Score](./04-assignment-quiz-manual-score.md)
5. [Question Sets / Editor / Upload / AI Import](./05-question-sets-editor-upload.md)
6. [Live Game / Host / Play / Socket](./06-live-game-host-play-socket.md)
7. [Negamon Battle / Monster](./07-negamon-battle-monster.md)
8. [Economy / Shop / Ledger](./08-economy-shop-ledger.md)
9. [Negamon Reward Audit / Resync](./09-negamon-reward-audit-resync.md)
10. [OMR](./10-omr.md)
11. [Board / Classroom Social](./11-board-classroom-social.md)
12. [Billing / Plan / Subscription](./12-billing-plan-subscription.md)
13. [Admin / Audit / Management](./13-admin-audit-management.md)
14. [i18n / Localization / Accessibility](./14-i18n-localization-accessibility.md)
15. [Ops / QA / Production Readiness](./15-ops-qa-production-readiness.md)
16. [Interactive Worksheet](./16-interactive-worksheet.md)
17. [Negamon Battle Stabilization](./17-negamon-battle-stabilization.md)
18. [Negamon Pokemon-Lite Battle Rewrite](./18-negamon-pokemon-lite-battle-rewrite.md)
19. [Game System V2 Foundation](./19-game-system-v2-foundation.md)
20. [Negamon Game System V2 Roadmap](./20-negamon-game-system-v2-roadmap.md)
21. [Negamon Game System V2 Production Completion](./21-negamon-game-system-v2-production-completion.md)
22. [Negamon Battle Content and Effect System](./22-negamon-battle-content-effect-system.md)
23. [Negamon Content Pack Live Balance QA](./23-negamon-content-pack-live-balance-qa.md)
24. [Negamon Roster Skill Rework](./24-negamon-roster-skill-rework.md)
25. [Negamon Classroom Data Migration UI QA](./25-negamon-classroom-data-migration-ui-qa.md)
26. [Negamon Pokemon-Inspired System Rebuild](./26-negamon-pokemon-inspired-system-rebuild.md)
27. [Negamon Battle Replacement Audit](./27-negamon-battle-replacement-audit.md)
28. [Negamon Level Form Skill Progression Rework](./28-negamon-level-form-skill-progression-rework.md)
29. [Negamon Pokemon-Inspired Skill Redesign](./29-negamon-pokemon-inspired-skill-redesign.md)
30. [Negamon Battle V4 Correctness and QA](./30-negamon-battle-v4-correctness-and-qa.md)

31. [Negamon V4 Pokemon Improvement Plan](./31-negamon-v4-pokemon-improvement-plan.md)

## How To Use

1. Pick one system plan.
2. Do inventory and problem analysis inside that file.
3. Add tests before behavior-risk fixes.
4. Keep changes scoped to the active system.
5. Run the validation commands listed in that plan.
6. Record outcomes and remaining risks before moving on.

## Global Baseline Commands

```powershell
npm.cmd run lint
npm.cmd run check:i18n:strict
npm.cmd run predev
```

If the change touches runtime, pages, routes, Prisma, config, or shared components:

```powershell
npm.cmd run build
```

If the change only touches targeted tests or system-specific logic:

```powershell
npm.cmd test -- <targeted test files>
```

## Master Plan

The broader overview still lives here:

- [System Analysis and Improvement Master Plan](../system-analysis-and-improvement-master-plan.md)
