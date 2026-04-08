"use client";

import { useCallback, useMemo, useState } from "react";
import { saveClassroomAttendance } from "@/lib/classroom-dashboard-actions";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/classroom-dashboard.types";
import type { DashboardToastFn, DashboardTranslateFn } from "./classroom-dashboard.types";

type UseClassroomAttendanceFlowArgs = {
    classroomId: string;
    students: ClassroomDashboardViewModel["students"];
    setClassroom: React.Dispatch<React.SetStateAction<ClassroomDashboardViewModel>>;
    toast: DashboardToastFn;
    t: DashboardTranslateFn;
};

export function useClassroomAttendanceFlow({
    classroomId,
    students,
    setClassroom,
    toast,
    t,
}: UseClassroomAttendanceFlowArgs) {
    const [attendanceSnapshot, setAttendanceSnapshot] =
        useState<ClassroomDashboardViewModel["students"] | null>(null);
    const [isAttendanceMode, setIsAttendanceMode] = useState(false);

    const enterAttendanceMode = useCallback(() => {
        setAttendanceSnapshot(students);
        setIsAttendanceMode(true);
    }, [students]);

    const cycleStudentAttendance = (studentId: string) => {
        if (!attendanceSnapshot) {
            setAttendanceSnapshot(students);
        }

        const statuses = ["PRESENT", "ABSENT", "LATE", "LEFT_EARLY"];
        setClassroom((prev) => ({
            ...prev,
            students: prev.students.map((student) => {
                if (student.id !== studentId) return student;
                const currentIndex = statuses.indexOf(student.attendance || "PRESENT");
                return {
                    ...student,
                    attendance: statuses[(currentIndex + 1) % statuses.length],
                };
            }),
        }));
    };

    const restoreAttendanceSnapshot = useCallback(() => {
        if (!attendanceSnapshot) return;

        setClassroom((prev) => ({
            ...prev,
            students: attendanceSnapshot ?? prev.students,
        }));
        setAttendanceSnapshot(null);
    }, [attendanceSnapshot, setClassroom]);

    const exitAttendanceMode = useCallback(() => {
        restoreAttendanceSnapshot();
        setIsAttendanceMode(false);
    }, [restoreAttendanceSnapshot]);

    const hasChanges = useMemo(() => {
        if (!isAttendanceMode || !attendanceSnapshot) return false;
        const snap = attendanceSnapshot;
        return students.some((s) => {
            const orig = snap.find((x) => x.id === s.id);
            return !orig || (s.attendance || "PRESENT") !== (orig.attendance || "PRESENT");
        });
    }, [attendanceSnapshot, students, isAttendanceMode]);

    const saveAttendance = async () => {
        const updates = students.map((student) => ({
            studentId: student.id,
            status: student.attendance || "PRESENT",
        }));

        try {
            await saveClassroomAttendance({
                classroomId,
                updates,
            });
            toast({
                title: t("toastAttendanceSaveSuccessTitle"),
                description: t("toastAttendanceSaveSuccessDesc"),
            });
            setAttendanceSnapshot(null);
            return true;
        } catch {
            toast({
                title: t("toastAttendanceSaveFailTitle"),
                description: t("toastAttendanceSaveFailDesc"),
                variant: "destructive",
            });
            return false;
        }
    };

    return {
        isAttendanceMode,
        setIsAttendanceMode,
        hasChanges,
        enterAttendanceMode,
        cycleStudentAttendance,
        restoreAttendanceSnapshot,
        exitAttendanceMode,
        saveAttendance,
    };
}
