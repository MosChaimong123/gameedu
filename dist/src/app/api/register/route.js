"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const db_1 = require("@/lib/db");
const server_1 = require("next/server");
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    username: zod_1.z.string().min(3, "Username must be at least 3 chars").regex(/^[a-zA-Z0-9_\u0E00-\u0E7F\-\.]+$/, "Username must only contain letters, numbers, or .-_"),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.string().default("STUDENT"),
    school: zod_1.z.string().optional(),
});
async function POST(req) {
    let step = "init";
    try {
        step = "parse_body";
        const body = await req.json();
        const { name, username, email, password, role, school } = registerSchema.parse(body);
        step = "check_uniqueness";
        const existingEmail = await db_1.db.user.findUnique({ where: { email } });
        if (existingEmail) {
            return new server_1.NextResponse("Email already exists", { status: 400 });
        }
        const existingUsername = await db_1.db.user.findUnique({ where: { username } });
        if (existingUsername) {
            return new server_1.NextResponse("Username already taken", { status: 400 });
        }
        step = "hash_password";
        const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
        const hashedPassword = await bcrypt.hash(password, 12);
        step = "create_user";
        const user = await db_1.db.user.create({
            data: {
                name,
                username,
                email,
                password: hashedPassword,
                role,
                school
            },
        });
        return server_1.NextResponse.json({
            user: { name: user.name, email: user.email, role: user.role }
        });
    }
    catch (error) {
        console.error(`[REGISTER_ERROR] Step: ${step}`, error);
        if (error instanceof zod_1.z.ZodError) {
            const errors = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
            return new server_1.NextResponse(`Invalid data: ${errors}`, { status: 400 });
        }
        return new server_1.NextResponse(`Internal Error (${step}): ${error.message || "Unknown"}`, { status: 500 });
    }
}
