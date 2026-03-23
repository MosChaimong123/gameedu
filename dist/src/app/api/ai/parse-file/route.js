"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
// Cache buster: v2-force-resync-v5-revert-to-stable-pdfparse
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const formData = await req.formData();
        const file = formData.get("file");
        if (!file)
            return new server_1.NextResponse("No file uploaded", { status: 400 });
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        console.log("[FILE_PARSE_DEBUG] File received:", file.name, "Size:", file.size, "Buffer size:", buffer.length);
        const isPDF = file.name.endsWith(".pdf");
        let pdfData = "";
        let text = "";
        if (isPDF) {
            pdfData = buffer.toString("base64");
            // Use eval('require') to bypass Next.js/Turbopack's attempts to "smartly" analyze the package
            // which often fails for pdf-parse due to its internal structure and test files.
            // @ts-ignore
            const pdf = eval('require')("pdf-parse");
            const data = await pdf(buffer);
            text = data.text;
            console.log("[FILE_PARSE_DEBUG] Raw data keys:", Object.keys(data));
        }
        else {
            text = buffer.toString("utf-8");
        }
        console.log("[FILE_PARSE_DEBUG] Extracted text preview:", text === null || text === void 0 ? void 0 : text.substring(0, 100));
        // If it's a PDF, we don't care if text is short because we have the raw data for Gemini
        if (!isPDF && (!text || text.trim().length < 5)) {
            console.log("[FILE_PARSE_DEBUG] Extraction failed or too short. Length:", text === null || text === void 0 ? void 0 : text.length);
            return new server_1.NextResponse("Could not extract enough text from file. Please make sure the file contains readable text.", { status: 400 });
        }
        console.log("[FILE_PARSE_DEBUG] Success. Text length:", text.length, "Is PDF:", isPDF);
        return server_1.NextResponse.json({
            text,
            pdfData: isPDF ? pdfData : null,
            fileName: file.name
        });
    }
    catch (error) {
        console.error("[FILE_PARSE_POST]", error);
        return new server_1.NextResponse(error.message || "Internal Error", { status: 500 });
    }
}
