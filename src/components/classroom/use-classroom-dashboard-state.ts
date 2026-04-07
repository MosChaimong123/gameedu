"use client";

import { useState } from "react";
import type { Assignment } from "@prisma/client";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";
import type { ClassroomBasicsPatch, UpdatedStudentPoints } from "./classroom-dashboard.types";

export function useClassroomDashboardState(
    initialClassroom: ClassroomDashboardViewModel
) {
    const [classroom, setClassroom] = useState(initialClassroom);

    const applyUpdatedStudentPoints = (updatedStudents: UpdatedStudentPoints[]) => {
        const updatedById = new Map(
            updatedStudents.map((student) => [student.id, student.behaviorPoints] as const)
        );

        setClassroom((prev) => ({
            ...prev,
            students: prev.students.map((student) =>
                updatedById.has(student.id)
                    ? {
                        ...student,
                        behaviorPoints: updatedById.get(student.id) ?? student.behaviorPoints,
                    }
                    : student
            ),
        }));
    };

    const updateAssignments = (assignments: Assignment[]) => {
        setClassroom((prev) => ({
            ...prev,
            assignments: assignments as ClassroomDashboardViewModel["assignments"],
        }));
    };

    const updateStudents = (students: ClassroomDashboardViewModel["students"]) => {
        setClassroom((prev) => ({
            ...prev,
            students,
        }));
    };

    const appendStudents = (students: ClassroomDashboardViewModel["students"]) => {
        setClassroom((prev) => ({
            ...prev,
            students: [...prev.students, ...students].sort((a, b) => a.order - b.order),
        }));
    };

    const updateSkills = (skills: ClassroomDashboardViewModel["skills"]) => {
        setClassroom((prev) => ({
            ...prev,
            skills,
        }));
    };

    const updateClassroomBasics = (updatedClassroom: ClassroomBasicsPatch) => {
        setClassroom((prev) => ({
            ...prev,
            ...(updatedClassroom.name !== undefined ? { name: updatedClassroom.name ?? prev.name } : {}),
            ...(updatedClassroom.grade !== undefined ? { grade: updatedClassroom.grade ?? null } : {}),
            ...(updatedClassroom.image !== undefined ? { image: updatedClassroom.image ?? null } : {}),
            ...(updatedClassroom.emoji !== undefined ? { emoji: updatedClassroom.emoji ?? null } : {}),
            ...(updatedClassroom.theme !== undefined ? { theme: updatedClassroom.theme ?? null } : {}),
            ...(updatedClassroom.levelConfig !== undefined ? { levelConfig: updatedClassroom.levelConfig } : {}),
            ...(updatedClassroom.quizReviewMode !== undefined ? { quizReviewMode: updatedClassroom.quizReviewMode ?? null } : {}),
        }));
    };

    const resetLocalBehaviorPoints = () => {
        setClassroom((prev) => ({
            ...prev,
            students: prev.students.map((student) => ({
                ...student,
                behaviorPoints: 0,
                submissions: [],
            })),
        }));
    };

    return {
        classroom,
        setClassroom,
        applyUpdatedStudentPoints,
        updateAssignments,
        updateStudents,
        appendStudents,
        updateSkills,
        updateClassroomBasics,
        resetLocalBehaviorPoints,
    };
}
