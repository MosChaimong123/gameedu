import json
import os
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = WORKSPACE_ROOT / "src" / "lib" / "curriculum" / "import" / "secondary-core-unit-rows.json"
WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{WORD_NS}}}"

UNIT_HEADER_KEY = "หน่วยการเรียนรู้"
GRADE_RE = re.compile(r"ชั้นมัธยมศึกษาปีที่\s*(\d)")
# Runs in the DOCX split mid-word, so allow optional spaces between marker syllables.
UNIT_TITLE_RE = re.compile(r"หน่วย\s*การเรียนรู้\s*ที่\s*(\d+)\s*(.*)")
INDICATOR_CODE_RE = re.compile(r"[ปม]\s*\.\s*\d(?:\s*-\s*\d)?\s*/\s*\d[\d\s]*")
HOURS_RE = re.compile(r"\d+")


# Thai combining vowels/tone marks that must attach to a preceding consonant.
# A space before one of these is always a run-split artifact, never a real word break.
THAI_COMBINING_RE = re.compile(r" +([ัิ-ฺ็-๎])")


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def fix_thai_spacing(value: str) -> str:
    return THAI_COMBINING_RE.sub(r"\1", value)


def collapse_digit_spaces(text: str) -> str:
    for _ in range(3):
        text = re.sub(r"(\d) (\d)", lambda m: m.group(1) + m.group(2), text)
    return text


def para_text(node: ET.Element) -> str:
    return norm("".join(t.text or "" for t in node.iter(f"{W}t")))


def cell_text(cell: ET.Element) -> str:
    return norm(" ".join(t.text or "" for t in cell.iter(f"{W}t")))


def table_rows(table: ET.Element) -> list[list[str]]:
    rows = []
    for tr in table.findall(f"{W}tr"):
        cells = [cell_text(tc) for tc in tr.findall(f"{W}tc")]
        if any(cells):
            rows.append(cells)
    return rows


DURING_MARKER = "ตัวชี้วัดระหว่างทาง"
TERMINAL_MARKER = "ตัวชี้วัดปลายทาง"
# Matches an indicator entry start: standard code (e.g. "ว 2.2") + indicator code
# (e.g. "ม.5/1" or the band form "ม.4-6/1").
INDICATOR_ENTRY_RE = re.compile(
    r"([ก-ฮ])\s*(\d+)\s*\.\s*(\d+)\s*([ปม])\s*\.\s*(\d+(?:\s*-\s*\d+)?)\s*/\s*(\d+)"
)


def parse_indicator_entries(segment: str) -> list[dict]:
    segment = collapse_digit_spaces(norm(segment))
    matches = list(INDICATOR_ENTRY_RE.finditer(segment))
    entries: list[dict] = []
    for i, match in enumerate(matches):
        standard_code = f"{match.group(1)} {match.group(2)}.{match.group(3)}"
        grade_part = re.sub(r"\s*-\s*", "-", match.group(5))
        code = f"{match.group(4)}.{grade_part}/{match.group(6)}"
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(segment)
        description = fix_thai_spacing(norm(segment[start:end])).lstrip(" -–").strip()
        entries.append(
            {
                "standardCode": standard_code,
                "code": code,
                "description": description or None,
            }
        )
    return entries


def parse_indicator_cell(value: str) -> tuple[list[dict], list[dict]]:
    text = norm(value)
    idx_during = text.find(DURING_MARKER)
    idx_terminal = text.find(TERMINAL_MARKER)

    during_seg = ""
    terminal_seg = ""
    if idx_during != -1 and idx_terminal != -1:
        if idx_during < idx_terminal:
            during_seg = text[idx_during + len(DURING_MARKER):idx_terminal]
            terminal_seg = text[idx_terminal + len(TERMINAL_MARKER):]
        else:
            terminal_seg = text[idx_terminal + len(TERMINAL_MARKER):idx_during]
            during_seg = text[idx_during + len(DURING_MARKER):]
    elif idx_during != -1:
        during_seg = text[idx_during + len(DURING_MARKER):]
    elif idx_terminal != -1:
        terminal_seg = text[idx_terminal + len(TERMINAL_MARKER):]
    else:
        during_seg = text

    return parse_indicator_entries(during_seg), parse_indicator_entries(terminal_seg)


def parse_unit_table(rows: list[list[str]]) -> list[dict]:
    header = rows[0]
    # Locate the "สาระสำคัญ" (key content) column by header; fall back to second-to-last.
    summary_index = None
    for idx, cell in enumerate(header):
        if "สาระสำคัญ" in cell.replace(" ", ""):
            summary_index = idx
    units = []
    for row in rows[1:]:
        if not row or len(row) < 1:
            continue
        title_cell = row[0]
        match = UNIT_TITLE_RE.search(title_cell)
        if not match:
            continue
        unit_number = int(match.group(1))
        unit_title = fix_thai_spacing(norm(match.group(2)))
        # hours = last column if numeric
        hours = None
        if len(row) >= 5:
            digits = HOURS_RE.search(row[-1].replace(" ", ""))
            if digits:
                hours = int(digits.group(0))
        during_indicators, terminal_indicators = parse_indicator_cell(row[1]) if len(row) > 1 else ([], [])
        # สาระสำคัญ column (key content) — prefer header-located index, else col before เวลา.
        summary = None
        sidx = summary_index if summary_index is not None else (len(row) - 2)
        if 0 <= sidx < len(row):
            summary_text = fix_thai_spacing(norm(row[sidx]))
            summary = summary_text or None
        units.append(
            {
                "unitNumber": unit_number,
                "title": unit_title,
                "hours": hours,
                "duringIndicators": during_indicators,
                "terminalIndicators": terminal_indicators,
                "summary": summary,
            }
        )
    return units


def is_unit_table(rows: list[list[str]]) -> bool:
    if not rows:
        return False
    header_text = " ".join(rows[0]).replace(" ", "")
    return UNIT_HEADER_KEY in header_text


def build_rows(docx_path: Path) -> list[dict]:
    with zipfile.ZipFile(docx_path) as docx:
        xml = docx.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find(f"{W}body")
    if body is None:
        return []

    recent: list[str] = []
    current_course: dict | None = None
    courses: list[dict] = []
    seen_keys: set[str] = set()

    for child in list(body):
        if child.tag == f"{W}p":
            text = para_text(child)
            if not text:
                continue
            recent.append(text)
            if len(recent) > 6:
                recent.pop(0)

            grade_match = GRADE_RE.search(text)
            if grade_match and len(recent) >= 4:
                desc_label, title, meta = recent[-4], recent[-3], recent[-2]
                # Some courses (e.g. คณิตศาสตร์ ม.1) concatenate "โครงสร้างรายวิชา"
                # into the label paragraph, so match on the trailing marker instead.
                if desc_label.endswith("คำอธิบายรายวิชา") and meta.startswith("รายวิชาพื้นฐาน"):
                    grade_level = f"m{grade_match.group(1)}"
                    key = f"{title}__{grade_level}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        current_course = {
                            "titleTh": title,
                            "gradeLevel": grade_level,
                            "units": [],
                        }
                        courses.append(current_course)
                    else:
                        # re-point to existing course (dup grade pages)
                        current_course = next(
                            (c for c in courses if f"{c['titleTh']}__{c['gradeLevel']}" == key),
                            current_course,
                        )
        elif child.tag == f"{W}tbl":
            if current_course is None:
                continue
            # Unit tables are often nested inside an outer wrapper table,
            # so scan this table and any nested tables in document order.
            for tbl in child.iter(f"{W}tbl"):
                rows = table_rows(tbl)
                if is_unit_table(rows):
                    current_course["units"].extend(parse_unit_table(rows))

    # keep only courses that actually have units
    return [course for course in courses if course["units"]]


def resolve_docx_path() -> Path:
    env_path = os.environ.get("DOCX_PATH")
    if env_path:
        return Path(env_path)
    download_dir = Path.home() / "Downloads"
    matches = sorted(download_dir.glob("*โครงสร้างระดับมัธยม*.docx"))
    if matches:
        return matches[0]
    raise FileNotFoundError("Could not resolve the secondary core curriculum DOCX path.")


def main() -> int:
    docx_path = resolve_docx_path()
    output_path = Path(os.environ.get("UNIT_ROWS_OUTPUT", DEFAULT_OUTPUT))
    courses = build_rows(docx_path)

    payload = {
        "schemaVersion": "secondary_core_unit_rows_v1",
        "sourceFileName": docx_path.name,
        "courses": courses,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "outputPath": str(output_path),
                "courseCount": len(courses),
                "unitCount": sum(len(c["units"]) for c in courses),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
