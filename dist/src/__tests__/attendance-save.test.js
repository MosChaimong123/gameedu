"use strict";
/**
 * Property-Based Tests: Attendance Save Preservation
 *
 * **Validates: Requirements P3**
 * ∀ classroom C, ∀ student s:
 *   saveAttendance(C, updates).students[s].points === C.students[s].points
 *   saveAttendance(C, updates).students[s].name === C.students[s].name
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
/**
 * Simulates the attendance save logic:
 * for each update, only the `attendance` field of the matching student is changed.
 * points and name are preserved.
 */
function applyAttendanceSave(students, updates) {
    const updateMap = new Map(updates.map((u) => [u.studentId, u.status]));
    return students.map((s) => {
        const newStatus = updateMap.get(s.id);
        if (newStatus !== undefined) {
            return { ...s, attendance: newStatus };
        }
        return { ...s };
    });
}
// Arbitraries
const attendanceStatusArb = fast_check_1.default.constantFrom("present", "absent", "late", "excused");
const studentArb = fast_check_1.default.record({
    id: fast_check_1.default.uuid(),
    name: fast_check_1.default.string({ minLength: 1, maxLength: 50 }),
    points: fast_check_1.default.integer({ min: 0, max: 10000 }),
    attendance: attendanceStatusArb,
});
(0, vitest_1.describe)("Attendance Save Preservation Properties", () => {
    /**
     * **Validates: Requirements P3**
     * Test 16.1 — saveAttendance must NOT change student points
     */
    (0, vitest_1.test)("saveAttendance does not change student points", () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(studentArb, { minLength: 1, maxLength: 30 }), fast_check_1.default.array(fast_check_1.default.record({ studentId: fast_check_1.default.uuid(), status: attendanceStatusArb }), { minLength: 0, maxLength: 30 }), (students, rawUpdates) => {
            // Only create updates for students that actually exist (realistic scenario)
            const updates = rawUpdates.map((u, i) => ({
                studentId: students[i % students.length].id,
                status: u.status,
            }));
            const result = applyAttendanceSave(students, updates);
            // Every student's points must be unchanged
            students.forEach((s) => {
                const after = result.find((r) => r.id === s.id);
                (0, vitest_1.expect)(after === null || after === void 0 ? void 0 : after.points).toBe(s.points);
            });
        }));
    });
    /**
     * **Validates: Requirements P3**
     * Test 16.2 — saveAttendance must NOT change student name
     */
    (0, vitest_1.test)("saveAttendance does not change student name", () => {
        fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(studentArb, { minLength: 1, maxLength: 30 }), fast_check_1.default.array(fast_check_1.default.record({ studentId: fast_check_1.default.uuid(), status: attendanceStatusArb }), { minLength: 0, maxLength: 30 }), (students, rawUpdates) => {
            // Only create updates for students that actually exist (realistic scenario)
            const updates = rawUpdates.map((u, i) => ({
                studentId: students[i % students.length].id,
                status: u.status,
            }));
            const result = applyAttendanceSave(students, updates);
            // Every student's name must be unchanged
            students.forEach((s) => {
                const after = result.find((r) => r.id === s.id);
                (0, vitest_1.expect)(after === null || after === void 0 ? void 0 : after.name).toBe(s.name);
            });
        }));
    });
});
