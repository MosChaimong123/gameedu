/** Normalize text extracted from Word (mammoth HTML or raw) for exam-style parsing. */
export function normalizeExamImportLine(line: string): string {
    let value = line.replace(/\u00a0/g, " ").trim();
    value = value.replace(/\uFF0E/g, ".").replace(/\uFF09/g, ")");

    if (value.includes("\t")) {
        const parts = value.split("\t").map((part) => part.trim()).filter(Boolean);
        const examPart =
            parts.find((part) => /^\d+\.\s/.test(part) || /^[กขคงจฉชซฌญ]\s*[.)]/u.test(part) || /^ตอบ\b/u.test(part)) ??
            parts[0];
        value = examPart ?? value;
    }

    return value.replace(/\s+/g, " ").trim();
}

export function normalizeExamImportDocument(text: string): string {
    return text
        .split(/\r?\n/)
        .map((line) => normalizeExamImportLine(line))
        .filter(Boolean)
        .join("\n");
}

function linesFromHtmlNode(node: Element): string[] {
    const lines: string[] = [];
    const paragraphs = node.querySelectorAll("p, li");

    if (paragraphs.length > 0) {
        paragraphs.forEach((paragraph) => {
            const text = (paragraph.textContent ?? "").replace(/\s+/g, " ").trim();
            if (text) {
                lines.push(text);
            }
        });
        return lines;
    }

    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) {
        return lines;
    }

    text.split(/\n/).forEach((line) => {
        const normalized = line.replace(/\s+/g, " ").trim();
        if (normalized) {
            lines.push(normalized);
        }
    });

    return lines;
}

function extractTwoColumnTableText(table: HTMLTableElement): string | null {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length === 0) {
        return null;
    }

    const hasTwoColumns = rows.some((row) => row.querySelectorAll("td, th").length >= 2);
    if (!hasTwoColumns) {
        return null;
    }

    const columns: string[][] = [[], []];

    for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td, th"));
        if (cells[0]) {
            columns[0].push(...linesFromHtmlNode(cells[0]));
        }
        if (cells[1]) {
            columns[1].push(...linesFromHtmlNode(cells[1]));
        }
    }

    const merged = [...columns[0]];
    if (columns[1].length > 0) {
        merged.push("", ...columns[1]);
    }

    return merged.join("\n");
}

function pushOrderedListLines(list: HTMLOListElement | HTMLUListElement, lines: string[]): void {
    Array.from(list.querySelectorAll(":scope > li")).forEach((item, index) => {
        const text = (item.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text) {
            lines.push(`${index + 1}. ${text}`);
        }
    });
}

function extractLinesInDocumentOrder(root: Element): string[] {
    const lines: string[] = [];

    const visit = (node: Node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const element = node as Element;
        const tag = element.tagName.toLowerCase();

        if (tag === "table") {
            return;
        }

        if (tag === "ol" || tag === "ul") {
            pushOrderedListLines(element as HTMLOListElement, lines);
            return;
        }

        if (tag === "p") {
            const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
            if (text) {
                lines.push(text);
            }
            return;
        }

        for (const child of Array.from(element.children)) {
            visit(child);
        }
    };

    for (const child of Array.from(root.children)) {
        visit(child);
    }

    return lines;
}

/**
 * Rebuild plain text from mammoth HTML in reading order.
 * Two-column tables are read column-first (left, then right) so question blocks stay intact.
 */
export function extractTextFromWordHtml(html: string): string {
    if (!html.trim()) {
        return "";
    }

    if (typeof DOMParser === "undefined") {
        return html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<\/div>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/\u00a0/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const lines: string[] = [];

    const tables = Array.from(doc.querySelectorAll("table"));
    for (const table of tables) {
        const twoColumnText = extractTwoColumnTableText(table);
        if (twoColumnText) {
            lines.push(twoColumnText);
        } else {
            for (const row of Array.from(table.querySelectorAll("tr"))) {
                for (const cell of Array.from(row.querySelectorAll("td, th"))) {
                    lines.push(...linesFromHtmlNode(cell));
                }
            }
        }
    }

    const body = doc.body;
    if (!body) {
        return normalizeExamImportDocument(lines.join("\n"));
    }

    lines.push(...extractLinesInDocumentOrder(body));

    return normalizeExamImportDocument(lines.join("\n"));
}
