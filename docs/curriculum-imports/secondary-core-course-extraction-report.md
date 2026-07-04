# Secondary Core Course Extraction Report

## Source

- File: `C:/Users/IHCK/Downloads/โครงสร้างระดับมัธยม พื้นฐาน.docx`
- Working copy used for extraction: `C:/Users/IHCK/GAMEEDU/gamedu/tmp-secondary-core.docx`
- Imported artifact: `src/lib/curriculum/import/secondary-core-course-rows.json`
- Import script: `scripts/import_secondary_core_course_rows.ts`

## What Was Extracted

- Unit-plan tables scanned: `100`
- Extracted source rows: `660`
- Rows with resolved `subjectId`: `393`
- Rows still unresolved at source-mapping level: `267`

## Resolved Subject Breakdown

- `thai`: `60`
- `mathematics`: `41`
- `science_technology`: `81`
- `social_religion_culture`: `93`
- `health_physical_education`: `27`
- `arts`: `39`
- `career`: `19`
- `foreign_languages`: `33`

## Known Gaps

1. `267` rows still do not map into the current canonical standard catalog.
2. `0` rows matched an existing canonical `unitId` exactly by title.
3. `660` rows do not yet contain a reliable `course description` field from the DOCX source.
4. Some extracted rows are continuation rows from merged DOCX tables, so they carry summary text without standards or hours.

## Current Interpretation Rules

- `rawUnitTitle` keeps the original unit title cell from the DOCX row.
- `normalizedUnitTitle` strips the unit prefix for matching and later migration work.
- `summaryText` comes from the `สาระสำคัญ` column.
- `descriptionText` stays `null` until a repeatable course-description source is identified.
- `issueCodes` are preserved per row so later phases can separate:
  - source gaps
  - missing mappings
  - continuation-row noise
  - missing canonical unit matches

## Next Recommended Cleanup

1. Expand the canonical standard catalog for unresolved secondary rows such as `ส 4.3` and related missing standards.
2. Add a title-normalization crosswalk so extracted unit titles can map to canonical `unitId`s.
3. Decide whether course description should come from a different source block, a teacher-curated import, or a later manual review layer.
