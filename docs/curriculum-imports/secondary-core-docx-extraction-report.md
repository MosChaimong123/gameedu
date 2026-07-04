# Secondary Core DOCX Extraction Report

## Source

- File: `C:/Users/IHCK/Downloads/โครงสร้างระดับมัธยม พื้นฐาน.docx`
- Capture id: `teacher-secondary-core-structure-docx-2026-06-23`
- SHA256: `BA5598E801CE4A99E15F7C7F5ADD7153FA22DDFD655DCB578504FD20EB6DAA3D`
- Imported for: middle and upper secondary `core` lesson builder groundwork

## Snapshot

- Paragraph count observed during audit: `1,990`
- Table count observed during audit: `204`
- Dominant table families:
  - `indicator_matrix`
  - `unit_plan`
  - uncategorized supporting tables

## Recognized Curriculum Signals

- The DOCX covers 8 core learning areas for secondary education.
- It contains recurring indicator tables with headers:
  - `มาตรฐาน`
  - `ตัวชี้วัดระหว่างทาง`
  - `ตัวชี้วัดปลายทาง`
- It contains recurring unit tables with headers:
  - `ชื่อหน่วย การเรียนรู้`
  - `มาตรฐาน การเรียนรู้/ตัวชี้วัด`
  - `สมรรถนะสำคัญ ของผู้เรียน`
  - `สาระสำคัญ`
  - `เวลา (ชั่วโมง)`

## Phase 1 Output

- Registered the DOCX as a canonical file-capture source in the curriculum source registry.
- Added a reusable DOCX extractor that:
  - converts DOCX to HTML and raw text
  - enumerates all tables in order
  - classifies indicator tables and unit-plan tables
  - preserves row geometry for later import phases
- Added focused tests for source metadata and table classification.

## Next Import Phases

1. Map the 8 core learning areas into canonical subject ids.
2. Parse strand and standard codes from indicator tables.
3. Extract units per grade level and attach source references.
4. Feed canonical unit context into the lesson builder UI and AI rules.

