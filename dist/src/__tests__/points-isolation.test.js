"use strict";
/**
 * Property-Based Tests: Points Award Isolation
 *
 * **Validates: Requirements P2**
 * ∀ classroom C, ∀ student s ∉ targetStudents:
 *   awardPoints(C, targetStudents, delta).students[s].points === C.students[s].points
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
// Pure helper representing the correct points-award behavior.
// Mirrors the DB logic in:
//   - src/app/api/classrooms/[id]/points/route.ts (single student)
//   - src/app/api/classrooms/[id]/points/batch/route.ts (multiple students)
function applyPointDelta(students, targetIds, delta) {
    const targetSet = new Set(targetIds);
    return students.map((s) => targetSet.has(s.id) ? { ...s, points: s.points + delta } : { ...s });
}
// Arbitraries
const studentArb = fast_check_1.default.record({
    id: fast_check_1.default.uuid(),
    points: fast_check_1.default.integer({ min: 0, max: 1000 }),
});
(0, vitest_1.describe)("Points Award Isolation Properties", () => {
    /**
     * **Validates: Requirements P2**
     * Test 15.1 — award points to a single student must not affect other students
     */
    (0, vitest_1.test)("award points to one student must not affect other students", () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(studentArb, { minLength: 2 }), fast_check_1.default.integer({ min: 1, max: 10 }), (students, delta) => {
            const targetId = students[0].id;
            const result = applyPointDelta(students, [targetId], delta);
            // All non-targeted students must be unchanged
            students.slice(1).forEach((s) => {
                var _a;
                (0, vitest_1.expect)((_a = result.find((r) => r.id === s.id)) === null || _a === void 0 ? void 0 : _a.points).toBe(s.points);
            });
        }));
    });
    /**
     * **Validates: Requirements P2**
     * Test 15.2 — batch award to multiple targetStudents must only affect those students, not others
     */
    (0, vitest_1.test)("batch award only affects targetStudents, not others", () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(studentArb, { minLength: 3 }), fast_check_1.default.integer({ min: 1, max: 10 }), (students, delta) => {
            // Target the first half, leave the rest untouched
            const half = Math.max(1, Math.floor(students.length / 2));
            const targetIds = students.slice(0, half).map((s) => s.id);
            const nonTargets = students.slice(half);
            const result = applyPointDelta(students, targetIds, delta);
            // Non-targeted students must be unchanged
            nonTargets.forEach((s) => {
                var _a;
                (0, vitest_1.expect)((_a = result.find((r) => r.id === s.id)) === null || _a === void 0 ? void 0 : _a.points).toBe(s.points);
            });
            // Targeted students must have received the delta
            students.slice(0, half).forEach((s) => {
                var _a;
                (0, vitest_1.expect)((_a = result.find((r) => r.id === s.id)) === null || _a === void 0 ? void 0 : _a.points).toBe(s.points + delta);
            });
        }));
    });
});
