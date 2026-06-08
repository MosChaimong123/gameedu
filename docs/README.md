# Documentation Index

This folder contains all technical documentation for the GameEdu project.
Use the sections below to find what you need.

> 📖 New to the project? Start with [GETTING_STARTED.md](GETTING_STARTED.md) and
> [architecture.md](architecture.md), then read the relevant domain section.

---

## 🏁 Start Here

| Document | Purpose |
|----------|---------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Set up a local environment in 10–15 minutes |
| [architecture.md](architecture.md) | System overview — layers, data flow, dependency map, request/socket lifecycle |
| [GLOSSARY.md](GLOSSARY.md) | Project-specific terms: OMR, login code, Negamon, Gold Quest, USER vs STUDENT… |
| [TESTING.md](TESTING.md) | How to run tests — Vitest, Playwright, domain checks, CI pipeline |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy to Render — env vars, Stripe, MongoDB, rollback |
| [SECURITY.md](../SECURITY.md) | Vulnerability reporting and security architecture |

---

## 🏗️ Architecture & Design

| Document | Purpose |
|----------|---------|
| [architecture.md](architecture.md) | Full architecture reference (layers, dependency centrality, flows) |
| [architecture-conventions.md](architecture-conventions.md) | Layering rules — page / service / component separation, read/write rules |
| [route-pattern-guide.md](route-pattern-guide.md) | API route naming and structure conventions |
| [role-semantics.md](role-semantics.md) | `USER` vs `STUDENT` vs `TEACHER` vs `ADMIN` |
| [error-code-contract.md](error-code-contract.md) | Standard error response shape and error codes |
| [domain-legacy-cleanup-summary.md](domain-legacy-cleanup-summary.md) | Active vs legacy domains (RPG removal status) |
| [operational-safety-contract.md](operational-safety-contract.md) | Operational guarantees and safety rules |
| [system-analysis-and-improvement-master-plan.md](system-analysis-and-improvement-master-plan.md) | Long-term system improvement plan |

---

## 🔐 Security

| Document | Purpose |
|----------|---------|
| [security-pr-review-checklist.md](security-pr-review-checklist.md) | Security checklist for every PR |
| [socket-review-checklist.md](socket-review-checklist.md) | Socket.io event security review |
| [page-data-exposure-checklist.md](page-data-exposure-checklist.md) | Prevent data leaks in page props |
| [quarterly-security-sweep-routine.md](quarterly-security-sweep-routine.md) | Periodic security audit routine |
| [phase-1-route-authorization-audit.md](phase-1-route-authorization-audit.md) | Route-level authorization audit results |
| [negamon-battle-phase-i-security-abuse-limits.md](negamon-battle-phase-i-security-abuse-limits.md) | Negamon battle abuse prevention |

---

## 🧪 Testing & QA

| Document | Purpose |
|----------|---------|
| [test-ci-maturity-playbook.md](test-ci-maturity-playbook.md) | Test and CI strategy |
| [flaky-test-triage-checklist.md](flaky-test-triage-checklist.md) | Diagnose and fix flaky tests |
| [route-authorization-test-template.md](route-authorization-test-template.md) | Template for new route-auth tests |
| **Manual QA Checklists** | |
| [auth-manual-qa-checklist.md](auth-manual-qa-checklist.md) | Auth / OAuth |
| [classroom-core-manual-qa-checklist.md](classroom-core-manual-qa-checklist.md) | Classroom management |
| [assignment-quiz-manual-qa-checklist.md](assignment-quiz-manual-qa-checklist.md) | Assignments & quizzes |
| [student-dashboard-manual-qa-checklist.md](student-dashboard-manual-qa-checklist.md) | Student portal |
| [lesson-online-course-manual-qa-checklist.md](lesson-online-course-manual-qa-checklist.md) | Lessons / online course experience |
| [economy-shop-ledger-manual-qa-checklist.md](economy-shop-ledger-manual-qa-checklist.md) | Economy, shop, ledger |
| [live-game-host-play-socket-manual-qa-checklist.md](live-game-host-play-socket-manual-qa-checklist.md) | Live game sessions |
| [negamon-battle-manual-qa-checklist.md](negamon-battle-manual-qa-checklist.md) | Negamon battle |
| [negamon-reward-audit-resync-manual-qa-checklist.md](negamon-reward-audit-resync-manual-qa-checklist.md) | Reward audit & resync |
| [omr-manual-qa-checklist.md](omr-manual-qa-checklist.md) | OMR tools |
| [board-social-manual-qa-checklist.md](board-social-manual-qa-checklist.md) | Class board & social |
| [billing-plan-manual-qa-checklist.md](billing-plan-manual-qa-checklist.md) | Billing & plans |
| [question-sets-editor-upload-manual-qa-checklist.md](question-sets-editor-upload-manual-qa-checklist.md) | Set editor & uploads |
| [i18n-manual-qa-checklist.md](i18n-manual-qa-checklist.md) | i18n / language |

---

## 🚀 Production & Operations

| Document | Purpose |
|----------|---------|
| [production-readiness-runbook.md](production-readiness-runbook.md) | Go-live operations runbook |
| [backup-restore-runbook.md](backup-restore-runbook.md) | Backup and restore procedures |
| [phase-1-capacity-monitoring-runbook.md](phase-1-capacity-monitoring-runbook.md) | Capacity monitoring for Phase 1 |
| [render-deploy.md](render-deploy.md) | Render deployment notes |
| [phase-1-production-readiness-status.md](phase-1-production-readiness-status.md) | Phase 1 readiness status |
| [phase-1-launch-readiness-execution.md](phase-1-launch-readiness-execution.md) | Phase 1 launch execution plan |
| [phase-1-pilot-go-nogo.md](phase-1-pilot-go-nogo.md) | Pilot go/no-go decision criteria |
| [phase-1-load-results.md](phase-1-load-results.md) | Load test results |
| [phase-1-data-prep-workbook.md](phase-1-data-prep-workbook.md) | Data preparation for Phase 1 |
| [phase-1-payment-readiness.md](phase-1-payment-readiness.md) | Payment integration readiness |
| [legacy-rpg-cleanup-runbook.md](legacy-rpg-cleanup-runbook.md) | Legacy RPG data cleanup steps |

---

## 🎮 Game System (Negamon & Live Games)

| Document | Purpose |
|----------|---------|
| [negamon-battle-phase-3-server-authority.md](negamon-battle-phase-3-server-authority.md) | Server-authoritative battle implementation |
| [negamon-live-battle-phase-4-reward-sync.md](negamon-live-battle-phase-4-reward-sync.md) | Live battle reward sync |
| [negamon-economy-phase-1-audit.md](negamon-economy-phase-1-audit.md) | Economy audit |
| [negamon-economy-phase-2-hardening.md](negamon-economy-phase-2-hardening.md) | Economy hardening |
| [negamon-economy-final-hardening.md](negamon-economy-final-hardening.md) | Economy final hardening |
| [negamon-economy-phase-5-observability.md](negamon-economy-phase-5-observability.md) | Economy observability |
| [negamon-economy-phase-6-teacher-ui.md](negamon-economy-phase-6-teacher-ui.md) | Teacher economy controls UI |
| [negamon-economy-phase-g-reconciliation.md](negamon-economy-phase-g-reconciliation.md) | Economy reconciliation |
| [negamon-economy-phase-h-teacher-controls.md](negamon-economy-phase-h-teacher-controls.md) | Teacher controls hardening |
| [negamon-phase-j-ux-polish.md](negamon-phase-j-ux-polish.md) | UX polish |
| [negamon-reward-resync-qa.md](negamon-reward-resync-qa.md) | Reward resync QA |

---

## 🤝 Contribution & Workflow

| Document | Purpose |
|----------|---------|
| [contribution-review-workflow.md](contribution-review-workflow.md) | End-to-end PR workflow |
| [pr-review-template-playbook.md](pr-review-template-playbook.md) | PR review template and playbook |
| [assignment-command-center-query-contract.md](assignment-command-center-query-contract.md) | Query parameter contract for assignment command center |
| [assignment-command-center-rollout-checklist.md](assignment-command-center-rollout-checklist.md) | Rollout checklist |

---

## 📋 Plans & Roadmap

| Document | Purpose |
|----------|---------|
| [commercial-production-roadmap.md](commercial-production-roadmap.md) | Commercial roadmap |
| [admin-role-and-user-management-plan.md](admin-role-and-user-management-plan.md) | Admin role redesign plan |
| [email-verification-code-plan.md](email-verification-code-plan.md) | Email verification flow plan |
| [i18n-system-followup-plan.md](i18n-system-followup-plan.md) | i18n system follow-up |
| [asn-201-211-changelog.md](asn-201-211-changelog.md) | Assignment command center changelog |

---

## 🗂️ Miscellaneous

| Document | Purpose |
|----------|---------|
| [line-bot-mvp.md](line-bot-mvp.md) | LINE bot MVP spec |
| [mongodb-user-email-unique-index.md](mongodb-user-email-unique-index.md) | MongoDB unique email index notes |
| [rpg-character-art-prompts.md](rpg-character-art-prompts.md) | Archived RPG art prompts (legacy) |

---

*This index covers all **72 documents** in `docs/`. See also root-level
[README.md](../README.md), [CONTRIBUTING.md](../CONTRIBUTING.md), and
[RENDER_DEPLOYMENT.md](../RENDER_DEPLOYMENT.md).*
