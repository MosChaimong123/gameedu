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
const vitest_1 = require("vitest");
function makeJsonRequest(body) {
    return {
        json: async () => body,
    };
}
const mockAuth = vitest_1.vi.fn();
const mockStudentItemFindUnique = vitest_1.vi.fn();
const mockStudentFindUnique = vitest_1.vi.fn();
const mockTransaction = vitest_1.vi.fn();
const mockCompute = vitest_1.vi.fn();
vitest_1.vi.mock("@/auth", () => ({
    auth: mockAuth,
}));
vitest_1.vi.mock("@/lib/db", () => ({
    db: {
        studentItem: {
            findUnique: mockStudentItemFindUnique,
        },
        student: {
            findUnique: mockStudentFindUnique,
        },
        $transaction: mockTransaction,
    },
}));
vitest_1.vi.mock("@/lib/game/stat-calculator", () => ({
    StatCalculator: {
        compute: mockCompute,
    },
}));
(0, vitest_1.describe)("inventory use route POST", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)("rejects non-consumable items", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-1" } });
        mockStudentItemFindUnique.mockResolvedValue({
            id: "si-1",
            studentId: "student-1",
            quantity: 1,
            item: { id: "item-1", type: "WEAPON" },
        });
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/student/inventory/use/route")));
        const response = await POST(makeJsonRequest({ studentItemId: "si-1", studentId: "student-1", quantity: 1 }));
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("rechecks quantity inside transaction and returns 400 when latest quantity is insufficient", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-1" } });
        mockStudentItemFindUnique.mockResolvedValue({
            id: "si-1",
            studentId: "student-1",
            quantity: 3,
            item: { id: "item-1", type: "CONSUMABLE", manaRestore: 10 },
        });
        mockStudentFindUnique.mockResolvedValue({
            id: "student-1",
            items: [],
        });
        mockTransaction.mockImplementation(async (fn) => {
            const tx = {
                studentItem: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({
                        id: "si-1",
                        studentId: "student-1",
                        quantity: 1,
                        item: { id: "item-1", type: "CONSUMABLE", manaRestore: 10 },
                    }),
                    update: vitest_1.vi.fn(),
                    delete: vitest_1.vi.fn(),
                },
                student: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({
                        id: "student-1",
                        stamina: 10,
                        mana: 5,
                        gameStats: {},
                        items: [],
                    }),
                    update: vitest_1.vi.fn(),
                },
                material: {
                    findMany: vitest_1.vi.fn(),
                    update: vitest_1.vi.fn(),
                    upsert: vitest_1.vi.fn(),
                },
            };
            return fn(tx);
        });
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/student/inventory/use/route")));
        const response = await POST(makeJsonRequest({ studentItemId: "si-1", studentId: "student-1", quantity: 2 }));
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("heals farming hp directly when using an hp consumable during farming", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-1" } });
        mockStudentItemFindUnique.mockResolvedValue({
            id: "si-1",
            studentId: "student-1",
            quantity: 1,
            item: { id: "item-1", type: "CONSUMABLE", hpRestorePercent: 0.25, name: "HP Potion" },
        });
        mockStudentFindUnique.mockResolvedValue({
            id: "student-1",
            items: [],
        });
        mockTransaction.mockImplementation(async (fn) => {
            const tx = {
                studentItem: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({
                        id: "si-1",
                        studentId: "student-1",
                        quantity: 1,
                        item: { id: "item-1", type: "CONSUMABLE", hpRestorePercent: 0.25, name: "HP Potion" },
                    }),
                    update: vitest_1.vi.fn(),
                    delete: vitest_1.vi.fn(),
                },
                student: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({
                        id: "student-1",
                        stamina: 20,
                        mana: 10,
                        gameStats: {
                            farming: {
                                playerHp: 40,
                                playerMaxHp: 100,
                            },
                        },
                        items: [],
                        points: 0,
                        jobClass: null,
                        jobTier: "BASE",
                        advanceClass: null,
                    }),
                    update: vitest_1.vi.fn().mockResolvedValue({
                        stamina: 20,
                        mana: 10,
                        gameStats: {
                            farming: {
                                playerHp: 65,
                                playerMaxHp: 100,
                            },
                        },
                    }),
                },
                material: {
                    findMany: vitest_1.vi.fn(),
                    update: vitest_1.vi.fn(),
                    upsert: vitest_1.vi.fn(),
                },
            };
            return fn(tx);
        });
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/student/inventory/use/route")));
        const response = await POST(makeJsonRequest({ studentItemId: "si-1", studentId: "student-1", quantity: 1 }));
        const payload = await response.json();
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(payload.newPlayerHp).toBe(65);
    });
});
