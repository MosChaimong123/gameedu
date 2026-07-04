from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable

from docx import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph


GRADE_MAP = {
    "grade_1": "p1",
    "grade_2": "p2",
    "grade_3": "p3",
    "grade_4": "p4",
    "grade_5": "p5",
    "grade_6": "p6",
}

DOCX_SOURCE_PATH = Path(r"C:\Users\IHCK\Downloads\โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน.docx")
MD_SOURCE_PATH = Path("docs/curriculum-imports/primary-grade-1-6-course-database.md")
PAYLOAD_PATH = Path("src/lib/curriculum/import/primary-core-unit-rows.json")

STANDARD_RE = re.compile(r"(?:มฐ\.\s*)?([ก-ฮ])\s*(\d+\.\d+)")
STANDARD_OPTIONAL_AREA_RE = re.compile(r"(?:มฐ\.\s*)?([ก-ฮ])?\s*(\d+\.\d+)")
FULL_INDICATOR_RE = re.compile(r"(?:(?:มฐ\.\s*)?([ก-ฮ])\s*(\d+\.\d+)\s*)?ป\.?\s*(\d+)/(\d+)")
MD_INDICATOR_RE = re.compile(r"([ก-ฮ])\s*(\d+\.\d+)\s*ป\.\s*(\d+)/(\d+)")
GRADE_RE = re.compile(r"ชั้นประถมศึกษาปีที่\s*(\d)")

COURSE_TITLE_ALIASES = {
    "วิทยาศาสตร์": "วิทยาศาสตร์และเทคโนโลยี",
    "วิทยาการคำนวณ": "เทคโนโลยี (วิทยาการคำนวณ)",
}

DOCX_COURSE_ORDER = [
    "หลักภาษาและการใช้ภาษาไทย",
    "วรรณคดีและวรรณกรรม",
    "คณิตศาสตร์",
    "วิทยาศาสตร์และเทคโนโลยี",
    "เทคโนโลยี (วิทยาการคำนวณ)",
    "สังคมศึกษา ศาสนา และวัฒนธรรม",
    "พระพุทธศาสนา",
    "ประวัติศาสตร์",
    "ภูมิศาสตร์",
    "สุขศึกษาและพลศึกษา",
    "ทัศนศิลป์",
    "ดนตรี-นาฏศิลป์",
    "การงานอาชีพ",
    "ภาษาอังกฤษ Smile",
]

COURSE_STANDARD_AREAS = {
    "หลักภาษาและการใช้ภาษาไทย": "ท",
    "วรรณคดีและวรรณกรรม": "ท",
    "คณิตศาสตร์": "ค",
    "วิทยาศาสตร์และเทคโนโลยี": "ว",
    "เทคโนโลยี (วิทยาการคำนวณ)": "ว",
    "สังคมศึกษา ศาสนา และวัฒนธรรม": "ส",
    "พระพุทธศาสนา": "ส",
    "ประวัติศาสตร์": "ส",
    "ภูมิศาสตร์": "ส",
    "สุขศึกษาและพลศึกษา": "พ",
    "ทัศนศิลป์": "ศ",
    "ดนตรี-นาฏศิลป์": "ศ",
    "การงานอาชีพ": "ง",
    "ภาษาอังกฤษ Smile": "ต",
}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def build_indicator(standard_code: str, grade: str, item: str) -> dict[str, str | None]:
    return {
        "standardCode": standard_code,
        "code": f"{standard_code} ป.{grade}/{item}",
        "description": None,
    }


def parse_md_indicator_refs(value: str) -> list[dict[str, str | None]]:
    indicators: list[dict[str, str | None]] = []
    for area, standard, grade, item in MD_INDICATOR_RE.findall(value):
        indicators.append(build_indicator(f"{area} {standard}", grade, item))
    return indicators


def split_unit_indicator_refs(value: str) -> tuple[list[dict[str, str | None]], list[dict[str, str | None]]]:
    terminal_marker = "ตัวชี้วัดปลายทาง"
    during_marker = "ตัวชี้วัดระหว่างทาง"
    text = clean(value)
    if terminal_marker not in text:
        return parse_md_indicator_refs(text), []

    during_text, terminal_text = text.split(terminal_marker, 1)
    if during_marker in during_text:
        during_text = during_text.split(during_marker, 1)[1]
    return parse_md_indicator_refs(during_text), parse_md_indicator_refs(terminal_text)


def resolve_unit_indicator_status(
    raw: str | None,
    during_indicators: list[dict[str, str | None]],
    terminal_indicators: list[dict[str, str | None]],
) -> str:
    if during_indicators or terminal_indicators:
        return "has_indicators"
    text = clean(raw or "")
    if text == "-" or (text and "ตัวชี้วัด" in text and "ป." not in text):
        return "explicit_none"
    return "missing"


def collect_block_value(lines: list[str], start: int) -> tuple[str, int]:
    values: list[str] = []
    index = start + 1
    while index < len(lines):
        line = lines[index]
        if line.startswith("- ") and not line.startswith("  - "):
            break
        if line.startswith("#"):
            break
        if line.startswith("  - "):
            values.append(line[4:])
        index += 1
    return clean(" ".join(values)), index


def parse_database(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    courses: list[dict] = []
    current_course: dict | None = None
    current_unit: dict | None = None
    mode: str | None = None
    index = 0

    while index < len(lines):
        line = lines[index]
        if line.startswith("### ") and not line.startswith("#### "):
            current_course = {
                "titleTh": line[4:].strip(),
                "gradeLevel": None,
                "totalHours": None,
                "descriptionText": None,
                "descriptionParagraphs": [],
                "units": [],
                "indicatorCrosswalkRows": [],
            }
            courses.append(current_course)
            current_unit = None
            mode = None
        elif current_course and line.startswith("#### Course Description Samples"):
            current_unit = None
            mode = "description"
        elif current_course and line.startswith("#### Units"):
            mode = "units"
        elif current_course and line.startswith("- gradeLevel: `"):
            source_grade = line.split("`")[1]
            current_course["gradeLevel"] = GRADE_MAP[source_grade]
        elif current_course and line.startswith("- totalHours: "):
            raw = line.split(": ", 1)[1].strip()
            current_course["totalHours"] = int(raw) if raw.isdigit() else None
        elif current_course and mode == "description" and line.startswith("- "):
            current_course["descriptionParagraphs"].append(line[2:].strip())
        elif current_course and line.startswith("##### "):
            mode = "units"
            current_unit = {
                "unitNumber": len(current_course["units"]) + 1,
                "title": line[6:].strip() or f"หน่วยที่ {len(current_course['units']) + 1}",
                "hours": None,
                "duringIndicators": [],
                "terminalIndicators": [],
                "standardsIndicatorsRaw": None,
                "indicatorStatus": "missing",
                "summary": None,
            }
            current_course["units"].append(current_unit)
        elif current_unit and line.startswith("- estimatedHours: "):
            raw = line.split(": ", 1)[1].strip()
            current_unit["hours"] = int(raw) if raw.isdigit() else None
        elif current_unit and line.startswith("- indicatorRefs: "):
            raw = line.split(": ", 1)[1].strip()
            current_unit["duringIndicators"] = parse_md_indicator_refs(raw)
        elif current_unit and line.startswith("- standardsIndicatorsRaw:"):
            value, index = collect_block_value(lines, index)
            current_unit["standardsIndicatorsRaw"] = value or None
            during_indicators, terminal_indicators = split_unit_indicator_refs(value)
            current_unit["duringIndicators"] = during_indicators
            current_unit["terminalIndicators"] = terminal_indicators
            current_unit["indicatorStatus"] = resolve_unit_indicator_status(value, during_indicators, terminal_indicators)
            continue
        elif current_unit and line.startswith("- keyConcept:"):
            value, index = collect_block_value(lines, index)
            current_unit["summary"] = value or None
            continue
        index += 1

    for course in courses:
        paragraphs = course.pop("descriptionParagraphs", [])
        course["descriptionText"] = clean("\n\n".join(paragraphs)) or None
        units = course.get("units", [])
        missing_hour_units = [unit for unit in units if unit.get("hours") is None]
        if course.get("totalHours") and len(missing_hour_units) == 1:
            known_hours = sum(unit.get("hours") or 0 for unit in units)
            inferred_hours = course["totalHours"] - known_hours
            if inferred_hours > 0:
                missing_hour_units[0]["hours"] = inferred_hours
        course.pop("totalHours", None)

    return {
        "schemaVersion": "primary_core_unit_rows_v1",
        "sourceFileName": DOCX_SOURCE_PATH.name,
        "courses": [course for course in courses if course["gradeLevel"] and course["units"]],
    }


def cell_texts(row) -> list[str]:
    return [clean(cell.text) for cell in row.cells]


def is_crosswalk_table(table) -> bool:
    if not table.rows:
        return False
    header = " ".join(cell_texts(table.rows[0]))
    return "มาตรฐาน" in header and "ตัวชี้วัดระหว่างทาง" in header and "ตัวชี้วัดปลายทาง" in header


def parse_standard_codes(value: str, default_area: str | None = None) -> list[str]:
    standards: list[str] = []
    for area, standard in STANDARD_OPTIONAL_AREA_RE.findall(value):
        effective_area = area or default_area
        if effective_area:
            standards.append(f"{effective_area} {standard}")
    return standards


def parse_crosswalk_indicators(value: str, default_standards: Iterable[str]) -> list[dict[str, str | None]]:
    text = clean(value)
    if not text or text == "-":
        return []

    standards = list(default_standards)
    current_standard = standards[0] if standards else None
    indicators: list[dict[str, str | None]] = []
    seen: set[str] = set()

    for area, standard, grade, item in FULL_INDICATOR_RE.findall(text):
        if area and standard:
            current_standard = f"{area} {standard}"
        if not current_standard:
            continue
        indicator = build_indicator(current_standard, grade, item)
        key = indicator["code"]
        if isinstance(key, str) and key not in seen:
            indicators.append(indicator)
            seen.add(key)

    return indicators


def infer_course_title_from_heading(text: str, course_titles: Iterable[str]) -> str | None:
    if len(text) > 140:
        return None
    for candidate in sorted(course_titles, key=len, reverse=True):
        if candidate in text:
            return candidate
    for source_title, canonical_title in COURSE_TITLE_ALIASES.items():
        if source_title in text:
            return canonical_title
    return None


def iter_docx_blocks(document) -> Iterable[Paragraph | Table]:
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def parse_docx_crosswalks(path: Path, course_titles: Iterable[str]) -> dict[tuple[str, str], list[dict]]:
    document = Document(path)
    ordered_crosswalks: list[list[dict]] = []

    for table in document.tables:
        if not is_crosswalk_table(table):
            continue
        course_title = DOCX_COURSE_ORDER[len(ordered_crosswalks) // 6]
        default_area = COURSE_STANDARD_AREAS.get(course_title)

        grouped_rows: list[dict] = []
        previous_cells = [None] * len(table.rows[0].cells)
        previous_standards: list[str] = []
        for row in table.rows[1:]:
            cells = cell_texts(row)
            if len(cells) < 3:
                continue
            for cell_index in range(1, min(3, len(row.cells))):
                if previous_cells[cell_index] is row.cells[cell_index]._tc:
                    cells[cell_index] = ""
            standards = parse_standard_codes(cells[0], default_area)
            if standards:
                previous_standards = standards
            else:
                standards = previous_standards
            previous_cells = [cell._tc for cell in row.cells]
            if not standards:
                continue

            by_standard = {
                standard: {
                    "standardCode": standard,
                    "duringIndicators": [],
                    "terminalIndicators": [],
                }
                for standard in standards
            }
            for indicator in parse_crosswalk_indicators(cells[1], standards):
                by_standard.setdefault(
                    indicator["standardCode"],
                    {"standardCode": indicator["standardCode"], "duringIndicators": [], "terminalIndicators": []},
                )["duringIndicators"].append(indicator)
            for indicator in parse_crosswalk_indicators(cells[2], standards):
                by_standard.setdefault(
                    indicator["standardCode"],
                    {"standardCode": indicator["standardCode"], "duringIndicators": [], "terminalIndicators": []},
                )["terminalIndicators"].append(indicator)

            grouped_rows.extend(
                row
                for row in by_standard.values()
                if row["duringIndicators"] or row["terminalIndicators"]
            )
        ordered_crosswalks.append(grouped_rows)

    expected_count = len(DOCX_COURSE_ORDER) * 6
    if len(ordered_crosswalks) != expected_count:
        raise RuntimeError(f"Expected {expected_count} DOCX crosswalk tables, found {len(ordered_crosswalks)}")

    crosswalks: dict[tuple[str, str], list[dict]] = {}
    index = 0
    for title in DOCX_COURSE_ORDER:
        if title not in course_titles:
            raise RuntimeError(f"DOCX course order contains unknown course title: {title}")
        for grade in range(1, 7):
            crosswalks[(title, f"p{grade}")] = ordered_crosswalks[index]
            index += 1

    return crosswalks


def attach_crosswalks(payload: dict, crosswalks: dict[tuple[str, str], list[dict]]) -> dict:
    courses = payload["courses"]
    missing: list[tuple[str, str]] = []
    for course in courses:
        key = (course["titleTh"], course["gradeLevel"])
        rows = crosswalks.get(key)
        if rows is None:
            missing.append(key)
            rows = []
        course["indicatorCrosswalkRows"] = rows
    if missing:
        formatted = ", ".join(f"{title}:{grade}" for title, grade in missing[:10])
        raise RuntimeError(f"Missing DOCX crosswalk tables for {len(missing)} courses: {formatted}")
    return payload


def main() -> None:
    payload = parse_database(MD_SOURCE_PATH)
    course_titles = {course["titleTh"] for course in payload["courses"]}
    payload = attach_crosswalks(payload, parse_docx_crosswalks(DOCX_SOURCE_PATH, course_titles))
    PAYLOAD_PATH.parent.mkdir(parents=True, exist_ok=True)
    PAYLOAD_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
