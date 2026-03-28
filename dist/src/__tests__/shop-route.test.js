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
const mockItemFindUnique = vitest_1.vi.fn();
const mockStudentFindUnique = vitest_1.vi.fn();
const mockStudentItemFindFirst = vitest_1.vi.fn();
const mockTransaction = vitest_1.vi.fn();
const mockBuildStudentItemStatSnapshot = vitest_1.vi.fn(() => ({
    hp: 10,
    atk: 5,
    def: 3,
    spd: 1,
    crit: 0.01,
    luck: 0.01,
    mag: 2,
    mp: 4,
}));
vitest_1.vi.mock("@/auth", () => ({
    auth: mockAuth,
}));
vitest_1.vi.mock("@/lib/db", () => ({
    db: {
        item: {
            findUnique: mockItemFindUnique,
        },
        student: {
            findUnique: mockStudentFindUnique,
        },
        studentItem: {
            findFirst: mockStudentItemFindFirst,
        },
        $transaction: mockTransaction,
    },
}));
vitest_1.vi.mock("@/lib/game/student-item-stats", () => ({
    buildStudentItemStatSnapshot: mockBuildStudentItemStatSnapshot,
}));
(0, vitest_1.describe)("shop route POST", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)("returns 401 when user is unauthenticated", async () => {
        mockAuth.mockResolvedValue(null);
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/shop/route")));
        const response = await POST(makeJsonRequest({ itemId: "item-1", studentId: "student-1" }));
        (0, vitest_1.expect)(response.status).toBe(401);
        await (0, vitest_1.expect)(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });
    (0, vitest_1.it)("rejects duplicate non-consumable purchases", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-1" } });
        mockItemFindUnique.mockResolvedValue({
            id: "item-1",
            type: "WEAPON",
            currency: "GOLD",
            price: 100,
        });
        mockStudentFindUnique.mockResolvedValue({
            id: "student-1",
            points: 0,
            gameStats: { gold: 500 },
        });
        mockStudentItemFindFirst.mockResolvedValue({ id: "owned-1", quantity: 1 });
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/shop/route")));
        const response = await POST(makeJsonRequest({ itemId: "item-1", studentId: "student-1", quantity: 1 }));
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("returns 400 when latest gold inside transaction is insufficient", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-1" } });
        mockItemFindUnique.mockResolvedValue({
            id: "item-1",
            type: "CONSUMABLE",
            currency: "GOLD",
            price: 100,
        });
        mockStudentFindUnique.mockResolvedValue({
            id: "student-1",
            points: 0,
            gameStats: { gold: 500 },
        });
        mockStudentItemFindFirst.mockResolvedValue(null);
        mockTransaction.mockImplementation(async (fn) => {
            const tx = {
                student: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({ points: 0, gameStats: { gold: 50 } }),
                    update: vitest_1.vi.fn(),
                },
                studentItem: {
                    findFirst: vitest_1.vi.fn().mockResolvedValue(null),
                    update: vitest_1.vi.fn(),
                    create: vitest_1.vi.fn(),
                },
            };
            return fn(tx);
        });
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/shop/route")));
        const response = await POST(makeJsonRequest({ itemId: "item-1", studentId: "student-1", quantity: 2 }));
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("increments quantity when buying a consumable already present in inventory", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-1" } });
        mockItemFindUnique.mockResolvedValue({
            id: "item-1",
            type: "CONSUMABLE",
            currency: "GOLD",
            price: 50,
        });
        mockStudentFindUnique.mockResolvedValue({
            id: "student-1",
            points: 0,
            gameStats: { gold: 500 },
        });
        mockStudentItemFindFirst.mockResolvedValue({ id: "owned-1", quantity: 3 });
        const txUpdate = vitest_1.vi.fn().mockResolvedValue({});
        mockTransaction.mockImplementation(async (fn) => {
            const tx = {
                student: {
                    findUnique: vitest_1.vi.fn().mockResolvedValue({ points: 0, gameStats: { gold: 500 } }),
                    update: vitest_1.vi.fn(),
                },
                studentItem: {
                    findFirst: vitest_1.vi.fn().mockResolvedValue({ id: "owned-1", quantity: 3 }),
                    update: txUpdate,
                    create: vitest_1.vi.fn(),
                },
            };
            const result = await fn(tx);
            return result !== null && result !== void 0 ? result : { points: 0, gameStats: { gold: 400 } };
        });
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/shop/route")));
        const response = await POST(makeJsonRequest({ itemId: "item-1", studentId: "student-1", quantity: 2 }));
        const payload = await response.json();
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(txUpdate).toHaveBeenCalledWith({
            where: { id: "owned-1" },
            data: { quantity: { increment: 2 } },
        });
        (0, vitest_1.expect)(payload.success).toBe(true);
    });
});
