import { NextResponse } from "next/server"
import { auth } from "@/auth"

// Cache buster: v2-force-resync-v5-revert-to-stable-pdfparse

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

        const formData = await req.formData()
        const file = formData.get("file") as File
        if (!file) return new NextResponse("No file uploaded", { status: 400 })

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        console.log("[FILE_PARSE_DEBUG] File received:", file.name, "Size:", file.size, "Buffer size:", buffer.length)

        const isPDF = file.name.endsWith(".pdf")
        let pdfData = ""
        let text = ""

        if (isPDF) {
            pdfData = buffer.toString("base64")
            // Use eval('require') to bypass Next.js/Turbopack's attempts to "smartly" analyze the package
            // which often fails for pdf-parse due to its internal structure and test files.
            const pdf = eval('require')("pdf-parse") as (input: Buffer) => Promise<{ text: string }>
            const data = await pdf(buffer)
            text = data.text
            console.log("[FILE_PARSE_DEBUG] Raw data keys:", Object.keys(data))
        } else {
            text = buffer.toString("utf-8")
        }

        console.log("[FILE_PARSE_DEBUG] Extracted text preview:", text?.substring(0, 100))

        // If it's a PDF, we don't care if text is short because we have the raw data for Gemini
        if (!isPDF && (!text || text.trim().length < 5)) {
            console.log("[FILE_PARSE_DEBUG] Extraction failed or too short. Length:", text?.length)
            return new NextResponse("Could not extract enough text from file. Please make sure the file contains readable text.", { status: 400 })
        }

        console.log("[FILE_PARSE_DEBUG] Success. Text length:", text.length, "Is PDF:", isPDF)
        return NextResponse.json({ 
            text, 
            pdfData: isPDF ? pdfData : null,
            fileName: file.name
        })
    } catch (error: unknown) {
        console.error("[FILE_PARSE_POST]", error)
        const message = error instanceof Error ? error.message : "Internal Error"
        return new NextResponse(message, { status: 500 })
    }
}
