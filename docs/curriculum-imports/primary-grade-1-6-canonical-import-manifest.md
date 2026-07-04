# Primary Grade 1-6 Canonical Import Manifest

## Source

- sourceFile: `C:\Users\IHCK\Downloads\โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน.docx`
- sourceTitle: โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน
- checksumSha256: `8d3f22d7184181aba6090b28dd468108b8a6e01404ce9532555d25e6aa22c0f5`
- fileSizeBytes: 2348357
- proposedSourceRegistryId: `primary-core-course-structure-docx`
- verificationStatus: `verified_file_capture`

## Input Artifacts

| artifact | purpose |
| --- | --- |
| `docs/curriculum-imports/primary-grade-1-6-extraction-report.md` | Phase 1 extraction evidence |
| `docs/curriculum-imports/primary-grade-1-6-course-database.md` | Phase 2 normalized course/unit database |
| `docs/system-plans/primary-lesson-template-pack-plan.md` | Phase 3 template strategy |
| `docs/system-plans/primary-canonical-import-preparation.md` | Phase 4 import preparation |

## Import Metrics

| metric | value |
| --- | ---: |
| course records | 84 |
| normalized unit records | 489 |
| canonical subject ids | 8 |
| grade levels | 6 |
| course titles | 14 |
| template families | 9 |
| unresolved units | 1 |

## Grade Map

| source grade | canonical grade |
| --- | --- |
| `grade_1` | `p1` |
| `grade_2` | `p2` |
| `grade_3` | `p3` |
| `grade_4` | `p4` |
| `grade_5` | `p5` |
| `grade_6` | `p6` |

## Course Definition Map

| courseKey | subjectId | canonical title |
| --- | --- | --- |
| `thai-language-use` | `thai` | หลักภาษาและการใช้ภาษาไทย |
| `thai-literature` | `thai` | วรรณคดีและวรรณกรรม |
| `mathematics` | `mathematics` | คณิตศาสตร์ |
| `science` | `science_technology` | วิทยาศาสตร์และเทคโนโลยี |
| `computing-science` | `science_technology` | เทคโนโลยี (วิทยาการคำนวณ) |
| `social-studies` | `social_religion_culture` | สังคมศึกษา ศาสนา และวัฒนธรรม |
| `buddhism` | `social_religion_culture` | พระพุทธศาสนา |
| `history` | `social_religion_culture` | ประวัติศาสตร์ |
| `geography` | `social_religion_culture` | ภูมิศาสตร์ |
| `health-physical-education` | `health_physical_education` | สุขศึกษาและพลศึกษา |
| `visual-arts` | `arts` | ทัศนศิลป์ |
| `music-dance` | `arts` | ดนตรี-นาฏศิลป์ |
| `career` | `career` | การงานอาชีพ |
| `english-smile` | `foreign_languages` | ภาษาอังกฤษ Smile |

## Canonical Id Pattern

Course:

```text
{subjectId}:{courseKey}:{canonicalGradeLevel}
```

Examples:

```text
thai:thai-language-use:p1
mathematics:mathematics:p4
science_technology:computing-science:p5
foreign_languages:english-smile:p6
```

Unit:

```text
{courseKey}-{canonicalGradeLevel}-uNN
```

Examples:

```text
thai-language-use-p1-u01
mathematics-p4-u03
english-smile-p6-u08
```

Template:

```text
primary-{courseKey}-{canonicalGradeLevel}-uNN-template-01
```

Examples:

```text
primary-thai-language-use-p1-u01-template-01
primary-mathematics-p4-u03-template-01
```

## Unresolved Before Code Import

| id | issue | recommended action |
| --- | --- | --- |
| `science-g1-u02` | `estimatedHours` missing from DOCX extraction | manually verify in source DOCX or keep nullable in import payload but block canonical publish readiness |

## Import Readiness

- source capture ready: yes
- grade mapping ready: yes
- course mapping ready: yes
- unit ids unique in Phase 2: yes
- template strategy ready: yes
- canonical code changed: no
- ready for implementation: yes, after resolving or explicitly accepting `science-g1-u02`
