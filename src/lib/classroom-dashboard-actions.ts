import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";

export type AwardBehaviorPointsInput =
    | {
        classroomId: string;
        skillId: string;
        studentId: string;
      }
    | {
        classroomId: string;
        skillId: string;
        studentIds: string[];
      };

export type AwardBehaviorPointsResult = {
    success: true;
    classroomId: string;
    skillWeight: number;
    updatedStudents: Array<{
        id: string;
        behaviorPoints: number;
        loginCode: string | null;
    }>;
};

export type SaveAttendanceInput = {
    classroomId: string;
    updates: Array<{
        studentId: string;
        status: string;
    }>;
};

export type SaveAttendanceResult = {
    success: true;
    classroomId: string;
    savedCount: number;
};

export type ResetClassroomPointsResult = {
    success: true;
    classroomId: string;
    studentsResetCount: number;
    activitiesDeletedCount: number;
};

export async function awardBehaviorPoints(
    input: AwardBehaviorPointsInput
): Promise<AwardBehaviorPointsResult> {
    const isBatch = "studentIds" in input;
    const endpoint = isBatch
        ? `/api/classrooms/${input.classroomId}/points/batch`
        : `/api/classrooms/${input.classroomId}/points`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        throw new Error("Failed to award behavior points");
    }

    return response.json() as Promise<AwardBehaviorPointsResult>;
}

export async function saveClassroomAttendance(
    input: SaveAttendanceInput
): Promise<SaveAttendanceResult> {
    const response = await fetch(`/api/classrooms/${input.classroomId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: input.updates }),
    });

    if (!response.ok) {
        throw new Error("Failed to save attendance");
    }

    return response.json() as Promise<SaveAttendanceResult>;
}

export async function resetBehaviorPoints(
    classroomId: string
): Promise<ResetClassroomPointsResult> {
    const response = await fetch(`/api/classrooms/${classroomId}/points/reset`, {
        method: "POST",
    });

    if (!response.ok) {
        throw new Error("Failed to reset points");
    }

    return response.json() as Promise<ResetClassroomPointsResult>;
}

export async function fetchClassroomDashboard(
    classroomId: string
): Promise<ClassroomDashboardViewModel> {
    const response = await fetch(`/api/classrooms/${classroomId}`);

    if (!response.ok) {
        throw new Error("Failed to refresh classroom");
    }

    return response.json() as Promise<ClassroomDashboardViewModel>;
}
