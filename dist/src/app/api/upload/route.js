"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) {
            return server_1.NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        // Ensure uploads directory exists
        const uploadDir = path_1.default.join(process.cwd(), "public", "uploads");
        try {
            await (0, promises_1.mkdir)(uploadDir, { recursive: true });
        }
        catch (err) {
            // Directory might already exist
        }
        const fileExtension = path_1.default.extname(file.name);
        const fileName = `${crypto_1.default.randomUUID()}${fileExtension}`;
        const filePath = path_1.default.join(uploadDir, fileName);
        await (0, promises_1.writeFile)(filePath, buffer);
        const url = `/uploads/${fileName}`;
        return server_1.NextResponse.json({
            url,
            fileName: file.name,
            size: file.size,
            type: file.type
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
