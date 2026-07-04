from __future__ import annotations

import argparse
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Iterable

import docx
from docx.document import Document as DocxDocument
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph


SOURCE_TITLE = "โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน.docx"
GRADE_RE = re.compile(r"ชั้นประถมศึกษาปีที่\s*(\d)\s*เวลา\s*([0-9,]+)\s*ชั่วโมง/ปี")
UNIT_NUMBER_RE = re.compile(r"หน่วย\s*การเรียนรู้ที่\s*([0-9]+)")
STANDARD_RE = re.compile(r"(?:มฐ\.\s*)?[ก-ฮ]\s*\d+\.\d+")
INDICATOR_RE = re.compile(r"(?:[ก-ฮ]\s*\d+\.\d+\s*)?ป\.\s*\d+/\d+")


COURSE_MAP: dict[str, tuple[str, str, str]] = {
    "ภาษาไทย หลักภาษาและการใช้ภาษาไทย": ("thai", "thai-language-use", "หลักภาษาและการใช้ภาษาไทย"),
    "ภาษาไทย วรรณคดีและวรรณกรรม": ("thai", "thai-literature", "วรรณคดีและวรรณกรรม"),
    "คณิตศาสตร์": ("mathematics", "mathematics", "คณิตศาสตร์"),
    "วิทยาศาสตร์และเทคโนโลยี": ("science_technology", "science", "วิทยาศาสตร์และเทคโนโลยี"),
    "เทคโนโลยี (วิทยาการคำนวณ)": ("science_technology", "computing-science", "เทคโนโลยี (วิทยาการคำนวณ)"),
    "สังคมศึกษา ศาสนา และวัฒนธรรม": ("social_religion_culture", "social-studies", "สังคมศึกษา ศาสนา และวัฒนธรรม"),
    "พระพุทธศาสนา": ("social_religion_culture", "buddhism", "พระพุทธศาสนา"),
    "ประวัติศาสตร์": ("social_religion_culture", "history", "ประวัติศาสตร์"),
    "ภูมิศาสตร์": ("social_religion_culture", "geography", "ภูมิศาสตร์"),
    "สุขศึกษาและพลศึกษา": ("health_physical_education", "health-physical-education", "สุขศึกษาและพลศึกษา"),
    "ทัศนศิลป์": ("arts", "visual-arts", "ทัศนศิลป์"),
    "ดนตรี-นาฏศิลป์": ("arts", "music-dance", "ดนตรี-นาฏศิลป์"),
    "การงานอาชีพ": ("career", "career", "การงานอาชีพ"),
    "ภาษาอังกฤษ Smile": ("foreign_languages", "english-smile", "ภาษาอังกฤษ Smile"),
}


SUBJECT_DISPLAY: dict[str, str] = {
    "thai": "ภาษาไทย",
    "mathematics": "คณิตศาสตร์",
    "science_technology": "วิทยาศาสตร์และเทคโนโลยี",
    "social_religion_culture": "สังคมศึกษา ศาสนา และวัฒนธรรม",
    "health_physical_education": "สุขศึกษาและพลศึกษา",
    "arts": "ศิลปะ",
    "career": "การงานอาชีพ",
    "foreign_languages": "ภาษาต่างประเทศ",
}


@dataclass
class IndicatorCrosswalk:
    tableIndex: int
    rows: list[dict[str, str]]


@dataclass
class UnitRecord:
    unitId: str
    sourceUnitTitle: str
    normalizedUnitTitle: str
    unitNumber: int | None
    order: int
    estimatedHours: int | None
    standards: list[str]
    indicators: list[str]
    standardsIndicatorsRaw: str
    competenciesRaw: str
    keyConcept: str
    needsReview: bool


@dataclass
class CourseRecord:
    courseId: str
    subjectId: str
    subjectNameTh: str
    gradeLevel: str
    gradeNumber: int
    courseKey: str
    courseTitle: str
    sourceCourseTitle: str
    subjectGroupRaw: str
    totalHours: int
    descriptionParagraphs: list[str] = field(default_factory=list)
    indicatorCrosswalks: list[IndicatorCrosswalk] = field(default_factory=list)
    units: list[UnitRecord] = field(default_factory=list)
    rawUnitRows: int = 0


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


def normalize_standard(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("มฐ.", "")).strip()


def unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = clean_text(value)
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def extract_standards(value: str) -> list[str]:
    return unique(normalize_standard(match.group(0)) for match in STANDARD_RE.finditer(value))


def extract_indicators(value: str) -> list[str]:
    return unique(match.group(0).replace(" ", "") for match in INDICATOR_RE.finditer(value))


def parse_hours(value: str) -> int | None:
    match = re.search(r"\d+", value.replace(",", ""))
    return int(match.group(0)) if match else None


def normalize_unit_title(value: str) -> tuple[str, int | None]:
    text = clean_text(value)
    unit_match = UNIT_NUMBER_RE.search(text)
    unit_number = int(unit_match.group(1)) if unit_match else None
    title = UNIT_NUMBER_RE.sub("", text)
    title = re.sub(r"^หน่วย\s*", "", title).strip()
    return title or text, unit_number


def md_escape(value: object) -> str:
    text = str(value) if value is not None else ""
    return text.replace("|", "\\|").replace("\n", "<br>")


def md_list(values: list[str]) -> str:
    return ", ".join(values) if values else "needsReview"


def md_table(headers: list[str], rows: list[list[object]]) -> str:
    lines = ["| " + " | ".join(md_escape(header) for header in headers) + " |"]
    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for row in rows:
        lines.append("| " + " | ".join(md_escape(cell) if md_escape(cell) else "-" for cell in row) + " |")
    return "\n".join(lines)


def append_raw(existing: str, addition: str) -> str:
    existing_clean = clean_text(existing)
    addition_clean = clean_text(addition)
    if not addition_clean:
        return existing_clean
    if not existing_clean:
        return addition_clean
    return f"{existing_clean} {addition_clean}"


def detect_course(title: str) -> tuple[str, str, str]:
    if title in COURSE_MAP:
        return COURSE_MAP[title]
    return "needs_review", "needs-review", title or "needsReview"


def build_records(input_path: Path) -> list[CourseRecord]:
    document = docx.Document(str(input_path))
    records: list[CourseRecord] = []
    last_title = ""
    last_group = ""
    current: CourseRecord | None = None
    table_index = 0

    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            text = clean_text(block.text)
            if not text:
                continue

            grade_match = GRADE_RE.search(text)
            if grade_match:
                grade_number = int(grade_match.group(1))
                hours = int(grade_match.group(2).replace(",", ""))
                subject_id, course_key, course_title = detect_course(last_title)
                current = CourseRecord(
                    courseId=f"{course_key}-g{grade_number}",
                    subjectId=subject_id,
                    subjectNameTh=SUBJECT_DISPLAY.get(subject_id, "needsReview"),
                    gradeLevel=f"grade_{grade_number}",
                    gradeNumber=grade_number,
                    courseKey=course_key,
                    courseTitle=course_title,
                    sourceCourseTitle=last_title,
                    subjectGroupRaw=last_group,
                    totalHours=hours,
                )
                records.append(current)
                continue

            if current is not None and len(current.descriptionParagraphs) < 4:
                current.descriptionParagraphs.append(text)

            if "กลุ่มสาระการเรียนรู้" in text:
                last_group = text
            elif not text.startswith("รวม") and not text.startswith("ตัวชี้วัด") and len(text) < 160:
                last_title = text

        elif isinstance(block, Table):
            rows = table_rows(block)
            if not rows:
                table_index += 1
                continue

            headers = rows[0]
            kind = table_kind(headers)
            if current is not None and kind == "indicator_crosswalk":
                crosswalk_rows = []
                for row in rows[1:]:
                    padded = row + [""] * max(0, 3 - len(row))
                    crosswalk_rows.append(
                        {
                            "standard": padded[0],
                            "formativeIndicators": padded[1],
                            "summativeIndicators": padded[2],
                        }
                    )
                current.indicatorCrosswalks.append(IndicatorCrosswalk(tableIndex=table_index, rows=crosswalk_rows))
            elif current is not None and kind == "unit_structure":
                for row in rows[1:]:
                    padded = row + [""] * max(0, 5 - len(row))
                    current.rawUnitRows += 1
                    if not clean_text(padded[0]) and current.units:
                        previous = current.units[-1]
                        previous.standards = unique([*previous.standards, *extract_standards(padded[1])])
                        previous.indicators = unique([*previous.indicators, *extract_indicators(padded[1])])
                        previous.standardsIndicatorsRaw = append_raw(previous.standardsIndicatorsRaw, padded[1])
                        previous.competenciesRaw = append_raw(previous.competenciesRaw, padded[2])
                        previous.keyConcept = append_raw(previous.keyConcept, padded[3])
                        if previous.estimatedHours is None:
                            previous.estimatedHours = parse_hours(padded[4])
                        previous.needsReview = (
                            not previous.normalizedUnitTitle
                            or not previous.standardsIndicatorsRaw
                            or previous.estimatedHours is None
                        )
                        continue

                    normalized_title, source_unit_number = normalize_unit_title(padded[0])
                    order = len(current.units) + 1
                    unit_number = source_unit_number or order
                    standards_raw = padded[1]
                    unit_id = f"{current.courseId}-u{order:02d}"
                    current.units.append(
                        UnitRecord(
                            unitId=unit_id,
                            sourceUnitTitle=padded[0],
                            normalizedUnitTitle=normalized_title,
                            unitNumber=unit_number,
                            order=order,
                            estimatedHours=parse_hours(padded[4]),
                            standards=extract_standards(standards_raw),
                            indicators=extract_indicators(standards_raw),
                            standardsIndicatorsRaw=standards_raw,
                            competenciesRaw=padded[2],
                            keyConcept=padded[3],
                            needsReview=not normalized_title or not standards_raw or parse_hours(padded[4]) is None,
                        )
                    )
            table_index += 1

    return records


def build_markdown(records: list[CourseRecord], input_path: Path) -> str:
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    subject_counts = Counter(record.subjectId for record in records)
    grade_counts = Counter(record.gradeLevel for record in records)
    unit_total = sum(len(record.units) for record in records)
    raw_unit_rows = sum(record.rawUnitRows for record in records)
    needs_review_units = sum(1 for record in records for unit in record.units if unit.needsReview)

    lines: list[str] = []
    lines.append("# Primary Grade 1-6 Course Database")
    lines.append("")
    lines.append("## Metadata")
    lines.append("")
    lines.append(f"- sourceFile: `{input_path}`")
    lines.append(f"- sourceTitle: {SOURCE_TITLE}")
    lines.append(f"- generated: {generated_at}")
    lines.append("- phase: 2 - Data Normalization")
    lines.append("- canonicalWriteStatus: not_imported")
    lines.append("- lessonContentStatus: no_lesson_content_v2_created")
    lines.append("")

    lines.append("## Coverage Summary")
    lines.append("")
    lines.append(
        md_table(
            ["Metric", "Value"],
            [
                ["courseRecords", len(records)],
                ["rawUnitRows", raw_unit_rows],
                ["normalizedUnitRecords", unit_total],
                ["unitsNeedingReview", needs_review_units],
                ["gradeLevels", ", ".join(sorted(grade_counts))],
                ["subjectIds", ", ".join(sorted(subject_counts))],
            ],
        )
    )
    lines.append("")

    lines.append("## Subject Coverage")
    lines.append("")
    lines.append(md_table(["subjectId", "subjectNameTh", "courseRecords"], [[sid, SUBJECT_DISPLAY.get(sid, "needsReview"), count] for sid, count in sorted(subject_counts.items())]))
    lines.append("")

    lines.append("## Grade Coverage")
    lines.append("")
    lines.append(md_table(["gradeLevel", "courseRecords"], [[grade, grade_counts[grade]] for grade in sorted(grade_counts)]))
    lines.append("")

    lines.append("## Course Index")
    lines.append("")
    lines.append(
        md_table(
            ["courseId", "gradeLevel", "subjectId", "courseTitle", "totalHours", "units"],
            [
                [record.courseId, record.gradeLevel, record.subjectId, record.courseTitle, record.totalHours, len(record.units)]
                for record in records
            ],
        )
    )
    lines.append("")

    grouped: dict[int, list[CourseRecord]] = defaultdict(list)
    for record in records:
        grouped[record.gradeNumber].append(record)

    for grade_number in sorted(grouped):
        lines.append(f"## ป.{grade_number}")
        lines.append("")
        for record in grouped[grade_number]:
            lines.append(f"### {record.courseTitle}")
            lines.append("")
            lines.append(f"- courseId: `{record.courseId}`")
            lines.append(f"- subjectId: `{record.subjectId}`")
            lines.append(f"- subjectNameTh: {record.subjectNameTh}")
            lines.append(f"- gradeLevel: `{record.gradeLevel}`")
            lines.append(f"- courseKey: `{record.courseKey}`")
            lines.append(f"- sourceCourseTitle: {record.sourceCourseTitle}")
            lines.append(f"- subjectGroupRaw: {record.subjectGroupRaw or 'needsReview'}")
            lines.append(f"- totalHours: {record.totalHours}")
            lines.append(f"- source: {SOURCE_TITLE}")
            lines.append("")

            if record.descriptionParagraphs:
                lines.append("#### Course Description Samples")
                lines.append("")
                for paragraph in record.descriptionParagraphs[:3]:
                    lines.append(f"- {paragraph}")
                lines.append("")

            if record.indicatorCrosswalks:
                lines.append("#### Indicator Crosswalk Summary")
                lines.append("")
                all_crosswalk_rows = [
                    row
                    for crosswalk in record.indicatorCrosswalks
                    for row in crosswalk.rows
                    if row["standard"] or row["formativeIndicators"] or row["summativeIndicators"]
                ]
                lines.append(
                    md_table(
                        ["standard", "formativeIndicators", "summativeIndicators"],
                        [
                            [row["standard"], row["formativeIndicators"], row["summativeIndicators"]]
                            for row in all_crosswalk_rows[:20]
                        ],
                    )
                )
                if len(all_crosswalk_rows) > 20:
                    lines.append("")
                    lines.append(f"_Note: showing first 20 of {len(all_crosswalk_rows)} crosswalk rows._")
                lines.append("")

            lines.append("#### Units")
            lines.append("")
            for unit in record.units:
                lines.append(f"##### {unit.normalizedUnitTitle}")
                lines.append("")
                lines.append(f"- unitId: `{unit.unitId}`")
                lines.append(f"- order: {unit.order}")
                lines.append(f"- sourceUnitTitle: {unit.sourceUnitTitle}")
                lines.append(f"- estimatedHours: {unit.estimatedHours if unit.estimatedHours is not None else 'needsReview'}")
                lines.append(f"- standards: {md_list(unit.standards)}")
                lines.append(f"- indicatorRefs: {md_list(unit.indicators)}")
                lines.append(f"- needsReview: {str(unit.needsReview).lower()}")
                lines.append("- standardsIndicatorsRaw:")
                lines.append(f"  - {unit.standardsIndicatorsRaw or 'needsReview'}")
                lines.append("- competenciesRaw:")
                lines.append(f"  - {unit.competenciesRaw or 'needsReview'}")
                lines.append("- keyConcept:")
                lines.append(f"  - {unit.keyConcept or 'needsReview'}")
                lines.append("")

    lines.append("## Normalization Notes")
    lines.append("")
    lines.append("- `courseId` และ `unitId` เป็น id สำหรับฐานข้อมูล Markdown รอบนี้ ยังไม่ใช่ canonical production id จนกว่าจะผ่าน review")
    lines.append(f"- raw unit rows {raw_unit_rows} แถวถูก normalize เป็น unit records {unit_total} รายการ เพราะมี continuation rows ใน DOCX ที่ช่องชื่อหน่วยว่างและถูก merge เข้าหน่วยก่อนหน้า")
    lines.append("- `indicatorRefs` เป็นการ extract เบื้องต้นจากข้อความในตารางหน่วย ต้องตรวจซ้ำก่อนแปลงเป็น learning outcome")
    lines.append("- `standardsIndicatorsRaw`, `competenciesRaw`, และ `keyConcept` เก็บข้อความจาก DOCX เพื่อรักษา provenance")
    lines.append("- ไม่มีการสร้างหรือแก้ `lesson_content_v2` ใน Phase 2")
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
    records = build_records(input_path)
    output_path.write_text(build_markdown(records, input_path), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
