# Economy / Shop / Ledger Manual QA Checklist

Manual QA checklist for Plan 08 after the ledger hardening and reconciliation pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:economy-shop-ledger`

Expected result:

- [x] `test:economy-shop-ledger` passes
- [x] `predev` passes

## Dev QA

- [x] Teacher adjustment shows the correct selected-student and all-class target counts before submit
- [x] Positive teacher adjustment updates balance, ledger row, and operation id consistently after refresh
- [x] Negative teacher adjustment that would go below zero is rejected without changing balance
- [x] Shop buy rejects missing gold, rejects duplicate frame ownership, and records spend rows correctly
- [x] Shop equip allows owned frame items only and rejects battle items on the frame equip path
- [x] Passive gold claim prevents duplicate reward rows on repeated claim attempts
- [x] Ledger export opens as sanitized CSV without spreadsheet formula execution
- [x] Reconciliation report explains any mismatch type clearly and stays clean on a healthy fixture

## Staging QA

- [x] Real teacher session can create or reuse a temporary QA classroom fixture for economy verification
- [x] Real teacher selected/all adjustments work on staging and blocked negative adjustments stay blocked
- [x] Real student shop buy/equip flows work on staging with matching ledger rows
- [x] Real passive-gold claim and duplicate-claim guard work on staging
- [x] Real ledger export and reconciliation report stay correct on staging

## Notes

- Prefer a temporary classroom fixture for staging and delete it after verification.
- Record classroom id, student ids, student codes, operation ids, transaction ids, and whether passive-gold reward rows were created or suppressed.
- Latest staging smoke on `2026-05-06` used temporary classroom `69fb65ca93d9f1cbd256649a`, created students `69fb65ca93d9f1cbd25664a1` / `69fb65ca93d9f1cbd25664a2` with login codes `HU6M5G2RVYW7` / `GK7DATF3UNV5`, then deleted the classroom after verification.
- Verified boundaries on staging: selected adjustment returned operation id `teacher-adjust:69fb65ca93d9f1cbd256649a:1778083274742:jgl38emw`, blocked negative adjustment stayed `400`, duplicate frame purchase returned `409`, frame equip succeeded while battle-item equip returned `400`, ledger export preserved formula-sanitized CSV metadata for reason `=SUM(1,1)`, and reconciliation returned `mismatchCount: 0` plus `warningCount: 0` on the healthy fixture.
- Passive-gold duplicate guard was verified on the long-lived student fixture `P8JT3L3YBP8R`: repeated claims stayed `alreadyClaimed: true` and the passive-gold ledger row count remained `0 -> 0 -> 0`.
