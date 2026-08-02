"""Generate the reviewable additional-science Chapter Title catalog from source PDFs."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path(r"C:\Users\IHCK\Downloads")
SOURCE_FILES = {
    "physics": ROOT / "src/lib/curriculum/import/physics-additional-upper-secondary-source.ts",
    "chemistry": ROOT / "src/lib/curriculum/import/chemistry-additional-upper-secondary-source.ts",
    "biology": ROOT / "src/lib/curriculum/import/biology-additional-upper-secondary-source.ts",
    "earth_space_science": ROOT / "src/lib/curriculum/import/earth-space-additional-upper-secondary-source.ts",
}
PDFS = {
    "physics": [
        DOWNLOADS / "ม.4.เทอม1-5-8.pdf", DOWNLOADS / "ม.4.เทอม2-5-8.pdf",
        DOWNLOADS / "ม.5เทอม.1-5-10.pdf", DOWNLOADS / "ม.5เทอม.2-5-10.pdf",
        DOWNLOADS / "ม.6เทอม.1-5-10.pdf", DOWNLOADS / "ม.6เทอม.2-5-10.pdf",
    ],
    "chemistry": sorted((DOWNLOADS / "ใบงานTT/เคมี").glob("*.pdf")),
    "biology": sorted((DOWNLOADS / "ใบงานTT/ชีว").glob("*.pdf")),
    "earth_space_science": sorted((DOWNLOADS / "ใบงานTT/ดารา").glob("*.pdf")),
}

# The M.6 biology teacher-guide table of contents continues in its learning-plan pages.
# These two entries are transcribed from that source, not from learning outcomes.
BIOLOGY_M6_S1_REMAINDER = [
    ["การเคลื่อนที่ของสิ่งมีชีวิตเซลล์เดียว", "การเคลื่อนที่ของสัตว์", "การเคลื่อนที่ของมนุษย์"],
    ["ประเภทของพฤติกรรม", "ความสัมพันธ์ระหว่างพฤติกรรมกับพัฒนาการของระบบประสาท", "การสื่อสารระหว่างสัตว์"],
]

TOC_GROUP_OVERRIDES = {
    "biology-additional-m6-s2": [
        ["ความหลากหลายทางชีวภาพ", "กำเนิดของสิ่งมีชีวิต", "การศึกษาความหลากหลายของสิ่งมีชีวิต", "โพรคาริโอต", "โพรทิสต์", "พืช", "ฟังไจ", "สัตว์"],
        ["ความหลากหลายของระบบนิเวศ", "การถ่ายทอดพลังงานและวัฏจักรสารในระบบนิเวศ", "การเปลี่ยนแปลงแทนที่ของสิ่งมีชีวิตในระบบนิเวศ"],
        ["ลักษณะเฉพาะของประชากร", "รูปแบบการเพิ่มของประชากร", "ปัจจัยที่ควบคุมการเติบโตของประชากร"],
        ["ทรัพยากรน้ำ", "ทรัพยากรดิน", "ทรัพยากรอากาศ", "ทรัพยากรป่าไม้", "ทรัพยากรสัตว์ป่า", "การอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม"],
    ],
    "earth-space-additional-m6-s2": [
        ["ทรงกลมฟ้าและลูกโลก", "พิกัดท้องฟ้า", "การกำหนดเวลาบนโลก"],
        ["การเคลื่อนที่ปรากฏของดาวเคราะห์", "มุมห่างและคาบการโคจรของดาวเคราะห์"],
        ["เทคโนโลยีอวกาศกับการสำรวจอวกาศ", "เทคโนโลยีอวกาศกับการประยุกต์ใช้"],
    ],
}


def read_courses(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    start = raw.index("= [") + 2
    payload = raw[start:raw.rindex("]") + 1]
    payload = re.sub(r",\s*([}\]])", r"\1", payload)
    return json.loads(payload)


def clean(value: str) -> str:
    value = unicodedata.normalize("NFC", value).replace("�", "")
    for source, target in {
        "สาคัญ": "สำคัญ",
        "คํา": "คำ",
        "กํา": "กำ",
        "นํา": "นำ",
        "ลํา": "ลำ",
        "นํ้า": "น้ำ",
        "สําหรับ": "สำหรับ",
    }.items():
        value = value.replace(source, target)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def extract_topic_groups(pdf_path: Path) -> list[list[str]]:
    pages = PdfReader(pdf_path).pages
    toc = next((page.extract_text() or "" for page in pages if "Chapter Title" in (page.extract_text() or "")), "")
    groups: list[list[str]] = []
    current: list[str] = []
    waiting_for_topic = False

    for raw_line in toc.splitlines():
        line = clean(raw_line)
        if not line:
            continue
        if "ท้ายหน่วย" in line or "ทายหน" in line:
            if current:
                groups.append(current)
                current = []
            waiting_for_topic = False
            continue
        if "•" not in line:
            # Some PDFs place the bullet on its own line, or wrap a long Chapter
            # Title onto the following line. Ignore the teacher-script page ranges.
            is_page_range = bool(re.fullmatch(r"[Tt\s0-9\-–]+", line))
            if current and not is_page_range and "หน่วยการเรียน" not in line and "สารบัญ" not in line:
                if waiting_for_topic:
                    current.append(line)
                elif not line.startswith("Chapter"):
                    current[-1] = clean(f"{current[-1]} {line}")
            waiting_for_topic = False
            continue
        topic = clean(line.split("•", 1)[1])
        if topic:
            current.append(topic)
            waiting_for_topic = False
        else:
            waiting_for_topic = True

    if current:
        groups.append(current)
    return groups


def main() -> None:
    records: list[dict] = []
    for subject_id, source_path in SOURCE_FILES.items():
        courses = read_courses(source_path)
        subject_pdfs = PDFS[subject_id]
        if len(courses) != len(subject_pdfs):
            raise ValueError(f"PDF count mismatch for {subject_id}")

        for course, pdf_path in zip(courses, subject_pdfs, strict=True):
            groups = extract_topic_groups(pdf_path)
            if subject_id == "biology" and course["id"] == "biology-additional-m6-s1":
                groups.extend(BIOLOGY_M6_S1_REMAINDER)
            groups = TOC_GROUP_OVERRIDES.get(course["id"], groups)
            if len(groups) != len(course["units"]):
                raise ValueError(f"Topic group mismatch for {course['id']}: expected {len(course['units'])}, got {len(groups)}")
            for unit, topics in zip(course["units"], groups, strict=True):
                if not topics:
                    raise ValueError(f"No topics found for {unit['id']}")
                records.append({"unitId": unit["id"], "topics": topics, "sourceFile": pdf_path.name})

    output = ROOT / "src/lib/curriculum/import/additional-science-toc-topics-source.ts"
    body = json.dumps(records, ensure_ascii=False, indent=4)
    output.write_text(
        "// Generated from the Chapter Title pages in the additional-science teacher-guide PDFs.\n"
        "export type AdditionalScienceTocTopicSource = { unitId: string; topics: readonly string[]; sourceFile: string }\n\n"
        f"export const ADDITIONAL_SCIENCE_TOC_TOPIC_SOURCES: readonly AdditionalScienceTocTopicSource[] = {body} as const\n",
        encoding="utf-8",
    )
    print(f"Generated {len(records)} unit topic records: {output}")


if __name__ == "__main__":
    main()
