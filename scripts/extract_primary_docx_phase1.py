from __future__ import annotations

import argparse
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Iterable

import docx
from docx.document import Document as DocxDocument
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph


GRADE_RE = re.compile(r"ชั้นประถมศึกษาปีที่\s*(\d)\s*เวลา\s*([0-9,]+)\s*ชั่วโมง/ปี")

SUBJECT_ID_HINTS = [
    ("ภาษาไทย", "thai"),
    ("คณิตศาสตร์", "mathematics"),
    ("วิทยาศาสตร์และเทคโนโลยี", "science_technology"),
    ("วิทยาศาสตร์", "science_technology"),
    ("สังคมศึกษา", "social_religion_culture"),
    ("สุขศึกษาและพลศึกษา", "health_physical_education"),
    ("ศิลปะ", "arts"),
    ("การงานอาชีพ", "career"),
    ("ภาษาอังกฤษ", "foreign_languages"),
    ("ภาษาต่างประเทศ", "foreign_languages"),
]


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def iter_blocks(document: DocxDocument) -> Iterable[Paragraph | Table]:
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def table_rows(table: Table) -> list[list[str]]:
    return [[clean_text(cell.text) for cell in row.cells] for row in table.rows]


def table_kind(headers: list[str]) -> str:
    joined = " | ".join(headers)
    if "ชื่อหน่วย" in joined and "เวลา" in joined:
        return "unit_structure"
    if "มาตรฐาน" in joined and "ตัวชี้วัด" in joined:
        return "indicator_crosswalk"
    if "โครงสร้างรายวิชาพื้นฐาน" in joined:
        return "cover_title"
    return "other"


def infer_subject_id(*texts: str) -> str:
    joined = " ".join(texts)
    for hint, subject_id in SUBJECT_ID_HINTS:
        if hint in joined:
            return subject_id
    return "needs_review"


def as_md_table(headers: list[str], rows: list[list[str]]) -> str:
    escaped_headers = [h.replace("|", "\\|") or "-" for h in headers]
    lines = ["| " + " | ".join(escaped_headers) + " |"]
    lines.append("| " + " | ".join(["---"] * len(escaped_headers)) + " |")
    for row in rows:
        normalized = [(cell.replace("|", "\\|") or "-") for cell in row]
        lines.append("| " + " | ".join(normalized) + " |")
    return "\n".join(lines)


def build_report(input_path: Path) -> str:
    document = docx.Document(str(input_path))
    table_meta: list[dict[str, object]] = []
    courses: list[dict[str, object]] = []

    last_title = ""
    last_group = ""
    current_course: dict[str, object] | None = None
    table_index = 0

    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            text = clean_text(block.text)
            if not text:
                continue

            grade_match = GRADE_RE.search(text)
            if grade_match:
                current_course = {
                    "courseTitle": last_title,
                    "subjectGroup": last_group,
                    "subjectId": infer_subject_id(last_title, last_group),
                    "gradeLevel": f"grade_{grade_match.group(1)}",
                    "hours": int(grade_match.group(2).replace(",", "")),
                    "tables": [],
                    "descriptionSamples": [],
                }
                courses.append(current_course)
                continue

            if current_course is not None and len(current_course["descriptionSamples"]) < 3:
                current_course["descriptionSamples"].append(text[:240])

            if "กลุ่มสาระการเรียนรู้" in text:
                last_group = text
            elif not text.startswith("รวม") and not text.startswith("ตัวชี้วัด"):
                last_title = text

        elif isinstance(block, Table):
            rows = table_rows(block)
            headers = rows[0] if rows else []
            kind = table_kind(headers)
            meta = {
                "index": table_index,
                "kind": kind,
                "rows": len(rows),
                "columns": len(headers),
                "headers": headers,
                "sampleRows": rows[1:4],
            }
            table_meta.append(meta)
            if current_course is not None:
                current_course["tables"].append(meta)
            table_index += 1

    subject_counts = Counter(str(course["subjectId"]) for course in courses)
    grade_counts = Counter(str(course["gradeLevel"]) for course in courses)
    table_kind_counts = Counter(str(meta["kind"]) for meta in table_meta)
    unit_counts_by_course = []
    total_unit_rows = 0

    for course in courses:
        unit_tables = [table for table in course["tables"] if table["kind"] == "unit_structure"]
        units = sum(max(0, int(table["rows"]) - 1) for table in unit_tables)
        total_unit_rows += units
        unit_counts_by_course.append((course, units))

    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines: list[str] = []

    lines.append("# Primary Grade 1-6 DOCX Extraction Report")
    lines.append("")
    lines.append("## Source")
    lines.append("")
    lines.append(f"- File: `{input_path}`")
    lines.append(f"- Generated: {generated_at}")
    lines.append("- Phase: 1 - DOCX extraction only")
    lines.append("- Scope: อ่านโครงสร้างเอกสารและสรุปข้อมูลที่พร้อมนำไปทำ Markdown database")
    lines.append("")

    lines.append("## Extraction Summary")
    lines.append("")
    summary_rows = [
        ["paragraphs", str(len(document.paragraphs))],
        ["tables", str(len(document.tables))],
        ["sections", str(len(document.sections))],
        ["detected course sections", str(len(courses))],
        ["detected unit rows", str(total_unit_rows)],
    ]
    lines.append(as_md_table(["Metric", "Value"], summary_rows))
    lines.append("")

    lines.append("## Detected Table Patterns")
    lines.append("")
    pattern_rows = [[kind, str(count)] for kind, count in sorted(table_kind_counts.items())]
    lines.append(as_md_table(["Pattern", "Count"], pattern_rows))
    lines.append("")
    lines.append("- `indicator_crosswalk`: ตารางมาตรฐาน/ตัวชี้วัดระหว่างทาง/ตัวชี้วัดปลายทาง")
    lines.append("- `unit_structure`: ตารางชื่อหน่วยการเรียนรู้/มาตรฐาน/สมรรถนะ/สาระสำคัญ/เวลา")
    if table_kind_counts.get("other", 0):
        lines.append("- `other`: ตารางที่ต้องตรวจซ้ำก่อนแปลงเป็น canonical data")
    else:
        lines.append("- ไม่พบตาราง `other` ในรอบ extraction นี้ ตารางทั้งหมดเข้า pattern หลักได้")
    lines.append("")

    lines.append("## Course Coverage")
    lines.append("")
    coverage_rows = []
    for subject_id, count in sorted(subject_counts.items()):
        coverage_rows.append([subject_id, str(count)])
    lines.append(as_md_table(["subjectId", "course sections"], coverage_rows))
    lines.append("")

    lines.append("## Grade Coverage")
    lines.append("")
    grade_rows = [[grade, str(grade_counts[grade])] for grade in sorted(grade_counts)]
    lines.append(as_md_table(["gradeLevel", "course sections"], grade_rows))
    lines.append("")

    lines.append("## Detected Course Sections")
    lines.append("")
    course_rows = []
    for index, (course, unit_count) in enumerate(unit_counts_by_course, start=1):
        course_rows.append(
            [
                str(index),
                str(course["gradeLevel"]),
                str(course["subjectId"]),
                str(course["courseTitle"]),
                str(course["hours"]),
                str(len(course["tables"])),
                str(unit_count),
            ]
        )
    lines.append(
        as_md_table(
            ["#", "gradeLevel", "subjectId", "courseTitle", "hours", "attachedTables", "unitRows"],
            course_rows,
        )
    )
    lines.append("")

    lines.append("## Representative Samples")
    lines.append("")
    for course, unit_count in unit_counts_by_course[:12]:
        lines.append(f"### {course['gradeLevel']} · {course['subjectId']} · {course['courseTitle']}")
        lines.append("")
        lines.append(f"- Hours: {course['hours']}")
        lines.append(f"- Attached tables: {len(course['tables'])}")
        lines.append(f"- Unit rows detected: {unit_count}")
        samples = course["descriptionSamples"]
        if samples:
            lines.append("- Description samples:")
            for sample in samples[:2]:
                lines.append(f"  - {sample}")
        unit_tables = [table for table in course["tables"] if table["kind"] == "unit_structure"]
        if unit_tables and unit_tables[0]["sampleRows"]:
            lines.append("- First unit table sample:")
            for sample_row in unit_tables[0]["sampleRows"][:2]:
                unit_name = sample_row[0] if sample_row else ""
                hours = sample_row[-1] if sample_row else ""
                lines.append(f"  - {unit_name} ({hours} ชั่วโมง)")
        lines.append("")

    lines.append("## Extraction Quality Notes")
    lines.append("")
    lines.append("- ภาษาไทยจาก DOCX อ่านได้ปกติผ่าน `python-docx`")
    lines.append("- โครงสร้างหลักของเอกสารมี course section ชัดจากบรรทัด `ชั้นประถมศึกษาปีที่ ... เวลา ... ชั่วโมง/ปี`")
    lines.append("- ตารางหน่วยการเรียนรู้มีหัวคอลัมน์คงที่หลายส่วน จึงเหมาะกับการแปลงเป็น Markdown database")
    lines.append("- ต้องตรวจ `other` tables เพิ่มเติมก่อนตัดสินใจว่าจะใช้เป็นข้อมูลหลักสูตรหรือเป็นข้อมูลประกอบ")
    lines.append("- รายวิชาในภาษาไทยแยกเป็นหลาย course title ภายใต้ subjectId เดียวกัน ต้องออกแบบ `courseId` เพิ่มใน Phase 2")
    lines.append("")

    lines.append("## Phase 2 Input Contract")
    lines.append("")
    lines.append("ข้อมูลที่พร้อมส่งต่อไป Phase 2 ควรถูก normalize เป็นรูปแบบนี้:")
    lines.append("")
    lines.append("```md")
    lines.append("## ป.1 ภาษาไทย")
    lines.append("")
    lines.append("- subjectId: thai")
    lines.append("- gradeLevel: grade_1")
    lines.append("- courseTitle: ...")
    lines.append("- totalHours: ...")
    lines.append("- source: DOCX")
    lines.append("")
    lines.append("### หน่วยที่ 1: ...")
    lines.append("")
    lines.append("- unitId: thai-g1-u01")
    lines.append("- estimatedHours: ...")
    lines.append("- standards: ...")
    lines.append("- indicators: ...")
    lines.append("- competencies: ...")
    lines.append("- keyConcept: ...")
    lines.append("- needsReview: false")
    lines.append("```")
    lines.append("")

    lines.append("## Recommended Next Step")
    lines.append("")
    lines.append("สร้าง `docs/curriculum-imports/primary-grade-1-6-course-database.md` โดยใช้ course sections และ unit tables จากรายงานนี้เป็นฐาน แล้วค่อยตรวจทานชื่อวิชา/หน่วย/ตัวชี้วัดก่อนแปลงเข้า canonical code")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(build_report(input_path), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
