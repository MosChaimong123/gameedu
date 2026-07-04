import json
import os
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = WORKSPACE_ROOT / "src" / "lib" / "curriculum" / "import" / "secondary-core-indicator-rows.json"
HEADER_STANDARD = "มาตรฐาน"
HEADER_DURING = "ตัวชี้วัดระหว่างทาง"
HEADER_TERMINAL = "ตัวชี้วัดปลายทาง"
STANDARD_CODE_RE = re.compile(r"([ก-ฮA-Z]+\s*\d+\s*\.\s*\d+)")
# matches both "ม.5/1" and "ม.4-6/1"
INDICATOR_CODE_RE = re.compile(r"([ปม]\s*\.\s*\d(?:\s*-\s*\d)?\s*/\s*[\d][\d\s]*)")
WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def normalize_standard_code(value: str) -> str | None:
    normalized = normalize_text(value)
    match = STANDARD_CODE_RE.search(normalized)
    if not match:
        return None
    # collapse internal spaces: "ว 3 . 1" -> "ว 3.1"
    raw = match.group(1)
    raw = re.sub(r"\s*\.\s*", ".", raw)
    return re.sub(r"\s+", " ", raw).strip()


def _collapse_digit_spaces(text: str) -> str:
    """Collapse spaces between consecutive digits: '1 0' -> '10'"""
    return re.sub(r"(\d) (\d)", lambda m: m.group(1) + m.group(2), text)


def extract_indicator_codes(value: str) -> list[str]:
    normalized = normalize_text(value)
    # collapse digit-space-digit repeatedly (for numbers like "1 0 0")
    for _ in range(3):
        normalized = _collapse_digit_spaces(normalized)
    codes: list[str] = []
    seen: set[str] = set()
    for match in INDICATOR_CODE_RE.finditer(normalized):
        raw = re.sub(r"\s+", "", match.group(1))
        # handle range format ม.x-y/n -> expand to ม.x/n, ..., ม.y/n
        range_match = re.match(r"([ปม])\.(\d)-(\d)/(\d+)$", raw)
        if range_match:
            prefix, start, end, num = range_match.groups()
            for grade in range(int(start), int(end) + 1):
                code = f"{prefix}.{grade}/{num}"
                if code not in seen:
                    codes.append(code)
                    seen.add(code)
        else:
            if raw not in seen:
                codes.append(raw)
                seen.add(raw)
    return codes


def cell_text(cell: ET.Element) -> str:
    texts = [node.text for node in cell.findall(".//w:t", WORD_NS) if node.text]
    return normalize_text(" ".join(texts))


def extract_tables(docx_path: Path) -> list[list[list[str]]]:
    with zipfile.ZipFile(docx_path) as docx:
        xml = docx.read("word/document.xml")

    root = ET.fromstring(xml)
    tables: list[list[list[str]]] = []
    for table in root.findall(".//w:tbl", WORD_NS):
        rows: list[list[str]] = []
        for row in table.findall("./w:tr", WORD_NS):
            cells = [cell_text(cell) for cell in row.findall("./w:tc", WORD_NS)]
            if any(cells):
                rows.append(cells)
        if rows:
            tables.append(rows)
    return tables


def build_rows(tables: list[list[list[str]]]) -> list[dict[str, object]]:
    parsed_rows: list[dict[str, object]] = []
    for table_index, rows in enumerate(tables, start=1):
        headers = [normalize_text(cell) for cell in rows[0]]
        if not {
            HEADER_STANDARD,
            HEADER_DURING,
            HEADER_TERMINAL,
        }.issubset(set(headers)):
            continue

        standard_index = headers.index(HEADER_STANDARD)
        during_index = headers.index(HEADER_DURING)
        terminal_index = headers.index(HEADER_TERMINAL)

        for row_index, row in enumerate(rows[1:], start=2):
            if max(standard_index, during_index, terminal_index) >= len(row):
                continue

            standard_code = normalize_standard_code(row[standard_index])
            if not standard_code:
                continue

            parsed_rows.append(
                {
                    "tableIndex": table_index,
                    "rowIndex": row_index,
                    "standardCode": standard_code,
                    "duringIndicatorCodes": extract_indicator_codes(row[during_index]),
                    "terminalIndicatorCodes": extract_indicator_codes(row[terminal_index]),
                }
            )

    return parsed_rows


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
    output_path = Path(os.environ.get("INDICATOR_ROWS_OUTPUT", DEFAULT_OUTPUT))
    tables = extract_tables(docx_path)
    rows = build_rows(tables)

    payload = {
        "sourceFileName": docx_path.name,
        "rows": rows,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "docxPath": str(docx_path),
                "outputPath": str(output_path),
                "tableCount": len(tables),
                "indicatorRowCount": len(rows),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
