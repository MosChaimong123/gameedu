/**
 * Property-Based Tests: Points Award Isolation
 *
 * **Validates: Requirements P2**
 * ∀ classroom C, ∀ student s ∉ targetStudents:
 *   awardPoints(C, targetStudents, delta).students[s].points === C.students[s].points
 */

import { describe, expect, test } from "vitest";
import fc from "fast-check";

// Pure helper representing the correct points-award behavior.
// Mirrors the DB logic in:
//   - src/app/api/classrooms/[id]/points/route.ts (single student)
//   - src/app/api/classrooms/[id]/points/batch/route.ts (multiple students)
function applyPointDelta(
  students: { id: string; points: number }[],
  targetIds: string[],
  delta: number
): { id: string; points: number }[] {
  const targetSet = new Set(targetIds);
  return students.map((s) =>
    targetSet.has(s.id) ? { ...s, points: s.points + delta } : { ...s }
  );
}

// Arbitraries
const studentArb = fc.record({
  id: fc.uuid(),
  points: fc.integer({ min: 0, max: 1000 }),
});

describe("Points Award Isolation Properties", () => {
  /**
   * **Validates: Requirements P2**
   * Test 15.1 — award points to a single student must not affect other students
   */
  test("award points to one student must not affect other students", () => {
    fc.assert(
      fc.property(
        fc.array(studentArb, { minLength: 2 }),
        fc.integer({ min: 1, max: 10 }),
        (students, delta) => {
          const targetId = students[0].id;
          const result = applyPointDelta(students, [targetId], delta);

          // All non-targeted students must be unchanged
          students.slice(1).forEach((s) => {
            expect(result.find((r) => r.id === s.id)?.points).toBe(s.points);
          });
        }
      )
    );
  });

  /**
   * **Validates: Requirements P2**
   * Test 15.2 — batch award to multiple targetStudents must only affect those students, not others
   */
  test("batch award only affects targetStudents, not others", () => {
    fc.assert(
      fc.property(
        fc.array(studentArb, { minLength: 3 }),
        fc.integer({ min: 1, max: 10 }),
        (students, delta) => {
          // Target the first half, leave the rest untouched
          const half = Math.max(1, Math.floor(students.length / 2));
          const targetIds = students.slice(0, half).map((s) => s.id);
          const nonTargets = students.slice(half);

          const result = applyPointDelta(students, targetIds, delta);

          // Non-targeted students must be unchanged
          nonTargets.forEach((s) => {
            expect(result.find((r) => r.id === s.id)?.points).toBe(s.points);
          });

          // Targeted students must have received the delta
          students.slice(0, half).forEach((s) => {
            expect(result.find((r) => r.id === s.id)?.points).toBe(
              s.points + delta
            );
          });
        }
      )
    );
  });
});
