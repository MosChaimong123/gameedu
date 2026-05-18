import JSZip from "jszip";
import { getWordTemplateExamLines } from "@/lib/set-editor/question-import";

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function paragraphXml(text: string): string {
    if (text.length === 0) {
        return "<w:p/>";
    }
    return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export async function buildWordTemplateDocxBlob(language: "en" | "th"): Promise<Blob> {
    const lines = getWordTemplateExamLines(language);
    const bodyParagraphs = lines.map(paragraphXml).join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyParagraphs}<w:sectPr/></w:body>
</w:document>`;

    const zip = new JSZip();
    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );
    zip.folder("_rels")!.file(
        ".rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );
    zip.folder("word")!.file("document.xml", documentXml);

    return zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}
