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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.signOut = exports.signIn = exports.handlers = void 0;
const next_auth_1 = __importDefault(require("next-auth"));
const google_1 = __importDefault(require("next-auth/providers/google"));
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const prisma_adapter_1 = require("@auth/prisma-adapter");
const db_1 = require("@/lib/db");
const auth_config_1 = require("./auth.config");
_a = (0, next_auth_1.default)({
    ...auth_config_1.authConfig,
    adapter: (0, prisma_adapter_1.PrismaAdapter)(db_1.db),
    session: { strategy: "jwt" },
    providers: [
        (0, google_1.default)({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        (0, credentials_1.default)({
            // ... (keep credentials as is)
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!(credentials === null || credentials === void 0 ? void 0 : credentials.email) || !(credentials === null || credentials === void 0 ? void 0 : credentials.password)) {
                    return null;
                }
                const email = credentials.email;
                const password = credentials.password;
                const user = await db_1.db.user.findUnique({
                    where: {
                        email,
                    },
                });
                if (!user || !user.password) {
                    return null;
                }
                const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return null;
                }
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: user.role,
                    school: user.school,
                };
            },
        }),
    ],
    callbacks: {
        ...auth_config_1.authConfig.callbacks,
        jwt: async ({ token, user, trigger, session }) => {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.picture = user.image;
            }
            // Sync with DB if updated (SHIELDED FROM EDGE)
            if (trigger === "update" || (token.id && typeof process !== "undefined" && process.env.NEXT_RUNTIME !== "edge")) {
                try {
                    // We only do this if we can actually reach the DB
                    const freshUser = await db_1.db.user.findUnique({
                        where: { id: token.id },
                        select: { name: true, image: true, role: true, school: true, settings: true, plan: true, planStatus: true }
                    });
                    if (freshUser) {
                        token.name = freshUser.name;
                        token.picture = freshUser.image;
                        token.role = freshUser.role;
                        token.school = freshUser.school;
                        token.settings = freshUser.settings;
                        token.plan = freshUser.plan;
                        token.planStatus = freshUser.planStatus;
                    }
                }
                catch (error) {
                    // If it's an edge error, we just keep the existing token
                    console.log("[AUTH_JWT] Skipping DB sync (likely Edge or DB down)");
                }
            }
            // Fallback: If session data passed in update, use it
            if (trigger === "update" && session) {
                if (session.name)
                    token.name = session.name;
                if (session.image)
                    token.picture = session.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                if (token.id)
                    session.user.id = token.id;
                // @ts-ignore
                if (token.role)
                    session.user.role = token.role;
                // @ts-ignore
                if (token.school)
                    session.user.school = token.school;
                session.user.name = token.name;
                session.user.image = token.picture;
                // @ts-ignore
                session.user.settings = token.settings;
                // @ts-ignore
                session.user.plan = token.plan;
                // @ts-ignore
                session.user.planStatus = token.planStatus;
            }
            return session;
        }
    }
}), exports.handlers = _a.handlers, exports.signIn = _a.signIn, exports.signOut = _a.signOut, exports.auth = _a.auth;
