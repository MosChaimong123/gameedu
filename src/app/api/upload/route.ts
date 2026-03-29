import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch {
            // Directory might already exist
        }

        const fileExtension = path.extname(file.name);
        const fileName = `${crypto.randomUUID()}${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const url = `/uploads/${fileName}`;

        return NextResponse.json({ 
            url, 
            fileName: file.name,
            size: file.size,
            type: file.type
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
