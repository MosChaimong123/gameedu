"use client";

import { useEffect } from "react";
import type { Student } from "@prisma/client";
import type { Socket } from "socket.io-client";
import {
    awardBehaviorPoints,
    resetBehaviorPoints,
} from "@/lib/classroom-dashboard-actions";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/classroom-dashboard.types";
import type {
    DashboardToastFn,
    DashboardTranslateFn,
    UpdatedStudentPoints,
} from "./classroom-dashboard.types";

function resolveDashboardErrorMessage(
    raw: string | null | undefined,
    t: DashboardTranslateFn,
    fallbackKey: string
) {
    const normalized = (raw ?? "").trim();
    if (!normalized) return t(fallbackKey);
    if (normalized.startsWith("apiError_")) {
        const localized = t(normalized);
        if (localized !== normalized) return localized;
    }
    const direct = t(normalized);
    if (direct !== normalized) return direct;
    return normalized;
}

type ClassroomSocketPayload = {
    type: string;
    data: {
        studentId?: string;
        behaviorPoints?: number;
    };
};

type UseClassroomPointsFlowArgs = {
    classroomId: string;
    selectedStudent: Student | null;
    selectedStudentIds: string[];
    isSelectMultiple: boolean;
    socket: Socket | null;
    isConnected: boolean;
    playDing: () => void;
    playThud: () => void;
    setClassroom: React.Dispatch<React.SetStateAction<ClassroomDashboardViewModel>>;
    applyUpdatedStudentPoints: (updatedStudents: UpdatedStudentPoints[]) => void;
    toast: DashboardToastFn;
    t: DashboardTranslateFn;
};

export function useClassroomPointsFlow({
    classroomId,
    selectedStudent,
    selectedStudentIds,
    isSelectMultiple,
    socket,
    isConnected,
    playDing,
    playThud,
    setClassroom,
    applyUpdatedStudentPoints,
    toast,
    t,
}: UseClassroomPointsFlowArgs) {
    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit("join-classroom", classroomId);

        const handleUpdate = (payload: ClassroomSocketPayload) => {
            if (payload.type !== "POINT_UPDATE") return;

            const { studentId, behaviorPoints } = payload.data;
            if (studentId === undefined || behaviorPoints === undefined) return;

            playDing();
            setClassroom((prev) => ({
                ...prev,
                students: prev.students.map((student) =>
                    student.id === studentId ? { ...student, behaviorPoints } : student
                ),
            }));
        };

        socket.on("classroom-event", handleUpdate);

        return () => {
            socket.emit("leave-classroom", classroomId);
            socket.off("classroom-event", handleUpdate);
        };
    }, [socket, isConnected, classroomId, playDing, setClassroom]);

    const awardPoints = async (skillId: string, weight: number) => {
        const targetStudentIds = isSelectMultiple
            ? selectedStudentIds
            : (selectedStudent ? [selectedStudent.id] : []);

        if (targetStudentIds.length === 0) {
            return false;
        }

        setClassroom((prev) => ({
            ...prev,
            students: prev.students.map((student) =>
                targetStudentIds.includes(student.id)
                    ? { ...student, behaviorPoints: student.behaviorPoints + weight }
                    : student
            ),
        }));

        if (weight > 0) playDing();
        else playThud();

        try {
            const result = isSelectMultiple
                ? await awardBehaviorPoints({
                    classroomId,
                    studentIds: targetStudentIds,
                    skillId,
                })
                : await awardBehaviorPoints({
                    classroomId,
                    studentId: selectedStudent!.id,
                    skillId,
                });

            applyUpdatedStudentPoints(result.updatedStudents);

            result.updatedStudents.forEach((student) => {
                socket?.emit("classroom-update", {
                    classId: classroomId,
                    type: "POINT_UPDATE",
                    data: {
                        studentId: student.id,
                        behaviorPoints: student.behaviorPoints,
                        skillId,
                    },
                });
            });

            return true;
        } catch (error) {
            setClassroom((prev) => ({
                ...prev,
                students: prev.students.map((student) =>
                    targetStudentIds.includes(student.id)
                        ? { ...student, behaviorPoints: student.behaviorPoints - weight }
                        : student
                ),
            }));
            toast({
                title: t("awardBehaviorFailTitle"),
                description: resolveDashboardErrorMessage(
                    error instanceof Error ? error.message : null,
                    t,
                    "awardBehaviorFailDesc"
                ),
                variant: "destructive",
            });
            return false;
        }
    };

    const resetPoints = async () => {
        try {
            await resetBehaviorPoints(classroomId);
            setClassroom((prev) => ({
                ...prev,
                students: prev.students.map((student) => ({
                    ...student,
                    behaviorPoints: 0,
                    submissions: [],
                })),
            }));
            toast({
                title: t("success"),
                description: t("resetPointsSuccessDesc"),
            });
            return true;
        } catch (error) {
            toast({
                title: t("error"),
                description: resolveDashboardErrorMessage(
                    error instanceof Error ? error.message : null,
                    t,
                    "resetPointsFailDesc"
                ),
                variant: "destructive",
            });
            return false;
        }
    };

    return {
        awardPoints,
        resetPoints,
    };
}
