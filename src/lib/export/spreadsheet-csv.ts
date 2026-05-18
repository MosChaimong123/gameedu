/** Escape a value for CSV and block spreadsheet formula injection. */
export function spreadsheetCsvCell(value: string | number | null | undefined): string {
    const raw = String(value ?? "");
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
}

export function buildCsvWithBom(rows: string[][]): string {
    return `\uFEFF${rows.map((row) => row.map(spreadsheetCsvCell).join(",")).join("\r\n")}`;
}
