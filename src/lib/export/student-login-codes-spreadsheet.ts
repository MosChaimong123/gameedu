import { buildCsvWithBom } from "@/lib/export/spreadsheet-csv";

export type StudentLoginCodeExportRow = {
    name: string;
    loginCode: string;
};

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function spreadsheetXmlCell(value: string): string {
    const raw = String(value ?? "");
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `<Cell><Data ss:Type="String">${escapeXml(safe)}</Data></Cell>`;
}

/** Excel 2003 XML — opens in Microsoft Excel without the xlsx npm package. */
export function buildStudentLoginCodesExcelXml(
    rows: StudentLoginCodeExportRow[],
    headers: { name: string; code: string }
): string {
    const headerRow = `<Row>${spreadsheetXmlCell(headers.name)}${spreadsheetXmlCell(headers.code)}</Row>`;
    const bodyRows = rows
        .map(
            (row) =>
                `<Row>${spreadsheetXmlCell(row.name)}${spreadsheetXmlCell(row.loginCode.toUpperCase())}</Row>`
        )
        .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="StudentCodes">
  <Table>
   ${headerRow}
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function buildStudentLoginCodesCsv(
    rows: StudentLoginCodeExportRow[],
    headers: { name: string; code: string }
): string {
    return buildCsvWithBom([
        [headers.name, headers.code],
        ...rows.map((row) => [row.name, row.loginCode.toUpperCase()]),
    ]);
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function downloadStudentLoginCodesExcel(
    rows: StudentLoginCodeExportRow[],
    headers: { name: string; code: string },
    filenameBase: string
) {
    const xml = buildStudentLoginCodesExcelXml(rows, headers);
    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    downloadBlob(blob, `${filenameBase}.xls`);
}

export function downloadStudentLoginCodesCsv(
    rows: StudentLoginCodeExportRow[],
    headers: { name: string; code: string },
    filenameBase: string
) {
    const csv = buildStudentLoginCodesCsv(rows, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${filenameBase}.csv`);
}
