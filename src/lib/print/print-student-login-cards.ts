import { escapeHtml } from "@/lib/print/escape-html";

export type StudentLoginCardPrintRow = {
    name: string;
    loginCode: string;
};

export type StudentLoginCardsPrintLabels = {
    documentTitle: string;
    accessCode: string;
    joinLine: string;
};

export function buildStudentLoginCardsPrintDocument(params: {
    students: StudentLoginCardPrintRow[];
    labels: StudentLoginCardsPrintLabels;
}): string {
    const { students, labels } = params;
    const cardsHtml = students
        .map((student) => {
            const name = escapeHtml(student.name);
            const code = escapeHtml(student.loginCode.toUpperCase());
            const joinLine = escapeHtml(labels.joinLine);
            return `<article class="card">
  <div class="card-accent" aria-hidden="true"></div>
  <h2 class="card-name">${name}</h2>
  <div class="card-code-box">
    <span class="card-code-label">${escapeHtml(labels.accessCode)}</span>
    <span class="card-code">${code}</span>
  </div>
  <p class="card-join">${joinLine}</p>
</article>`;
        })
        .join("\n");

    const title = escapeHtml(labels.documentTitle);

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-family: "Sarabun", "Segoe UI", system-ui, sans-serif;
    }
    body { padding: 0; }
    .page-header {
      margin: 0 0 8mm;
      text-align: center;
    }
    .page-header h1 {
      margin: 0;
      font-size: 16pt;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7mm;
    }
    .card {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 5mm 4mm 4mm;
      text-align: center;
      background: #fff;
    }
    .card-accent {
      height: 3px;
      margin: -5mm -4mm 4mm;
      border-radius: 10px 10px 0 0;
      background: linear-gradient(90deg, #4f46e5, #6366f1);
    }
    .card-name {
      margin: 0 0 3mm;
      font-size: 12pt;
      font-weight: 800;
      line-height: 1.25;
      word-break: break-word;
    }
    .card-code-box {
      margin: 0 0 3mm;
      padding: 3mm 2mm;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
    }
    .card-code-label {
      display: block;
      margin-bottom: 2mm;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #4338ca;
    }
    .card-code {
      display: block;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      line-height: 1.3;
      word-break: break-all;
      color: #312e81;
    }
    .card-join {
      margin: 0;
      padding: 2.5mm 2mm 0;
      border-top: 1px solid #f1f5f9;
      font-size: 8pt;
      line-height: 1.35;
      text-align: left;
      color: #334155;
      word-break: break-all;
    }
    @media print {
      .grid { gap: 6mm; }
    }
  </style>
</head>
<body>
  <header class="page-header">
    <h1>${title}</h1>
  </header>
  <main class="grid">
${cardsHtml}
  </main>
</body>
</html>`;
}

const PRINT_IFRAME_CLEANUP_MS = 60_000;

function runPrintFromIframe(iframe: HTMLIFrameElement): boolean {
    const printWindow = iframe.contentWindow;
    if (!printWindow) {
        iframe.remove();
        return false;
    }

    const cleanup = () => {
        iframe.remove();
    };

    const timeoutId = window.setTimeout(cleanup, PRINT_IFRAME_CLEANUP_MS);
    printWindow.addEventListener(
        "afterprint",
        () => {
            window.clearTimeout(timeoutId);
            cleanup();
        },
        { once: true }
    );

    printWindow.focus();
    printWindow.print();
    return true;
}

/** Prints via a hidden iframe — avoids popup blockers and blank about:blank tabs. */
export function printStudentLoginCards(params: {
    students: StudentLoginCardPrintRow[];
    labels: StudentLoginCardsPrintLabels;
}): boolean {
    if (params.students.length === 0 || typeof document === "undefined") {
        return false;
    }

    const html = buildStudentLoginCardsPrintDocument(params);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", params.labels.documentTitle);
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none";

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
        iframe.remove();
        return false;
    }

    doc.open();
    doc.write(html);
    doc.close();

    let didPrint = false;
    const triggerPrint = () => {
        if (didPrint) {
            return;
        }
        didPrint = true;
        window.requestAnimationFrame(() => {
            runPrintFromIframe(iframe);
        });
    };

    if (iframe.contentWindow?.document.readyState === "complete") {
        triggerPrint();
    } else {
        iframe.onload = () => triggerPrint();
    }

    return true;
}
