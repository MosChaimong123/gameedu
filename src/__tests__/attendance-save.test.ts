/**
 * Property-Based Tests: Attendance Save Preservation
 *
 * **Validates: Requirements P3**
 * ∀ classroom C, ∀ student s:
 *   saveAttendance(C, updates).students[s].points === C.students[s].points
 *   saveAttendance(C, updates).students[s].name === C.students[s].name
 */

import { describe, expect, test } from "vitest";
import fc from "fast-check";

// Pure logic extracted from src/app/api/classrooms/[id]/attendance/route.ts
// The route does: db.student.update({ where: { id }, data: { attendance: status } })
// It only writes the `attendance` field — points and name are never touched.

type Student = {
  id: string;
  name: string;
  points: number;
  attendance: string;
};

type AttendanceUpdate = {
  studentId: string;
  status: string;
};

/**
 * Simulates the attendance save logic:
 * for each update, only the `attendance` field of the matching student is changed.
 * points and name are preserved.
 */
function applyAttendanceSave(
  students: Student[],
  updates: AttendanceUpdate[]
): Student[] {
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
const attendanceStatusArb = fc.constantFrom("present", "absent", "late", "excused");

const studentArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  points: fc.integer({ min: 0, max: 10000 }),
  attendance: attendanceStatusArb,
});

describe("Attendance Save Preservation Properties", () => {
  /**
   * **Validates: Requirements P3**
   * Test 16.1 — saveAttendance must NOT change student points
   */
  test("saveAttendance does not change student points", () => {
    fc.assert(
      fc.property(
        fc.array(studentArb, { minLength: 1, maxLength: 30 }),
        fc.array(
          fc.record({ studentId: fc.uuid(), status: attendanceStatusArb }),
          { minLength: 0, maxLength: 30 }
        ),
        (students, rawUpdates) => {
          // Only create updates for students that actually exist (realistic scenario)
          const updates = rawUpdates.map((u, i) => ({
            studentId: students[i % students.length].id,
            status: u.status,
          }));

          const result = applyAttendanceSave(students, updates);

          // Every student's points must be unchanged
          students.forEach((s) => {
            const after = result.find((r) => r.id === s.id);
            expect(after?.points).toBe(s.points);
          });
        }
      )
    );
  });

  /**
   * **Validates: Requirements P3**
   * Test 16.2 — saveAttendance must NOT change student name
   */
  test("saveAttendance does not change student name", () => {
    fc.assert(
      fc.property(
        fc.array(studentArb, { minLength: 1, maxLength: 30 }),
        fc.array(
          fc.record({ studentId: fc.uuid(), status: attendanceStatusArb }),
          { minLength: 0, maxLength: 30 }
        ),
        (students, rawUpdates) => {
          // Only create updates for students that actually exist (realistic scenario)
          const updates = rawUpdates.map((u, i) => ({
            studentId: students[i % students.length].id,
            status: u.status,
          }));

          const result = applyAttendanceSave(students, updates);

          // Every student's name must be unchanged
          students.forEach((s) => {
            const after = result.find((r) => r.id === s.id);
            expect(after?.name).toBe(s.name);
          });
        }
      )
    );
  });
});
