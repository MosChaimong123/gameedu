"use client";

import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/classroom-dashboard.types";

export type UpdatedStudentPoints = {
    id: string;
    behaviorPoints: number;
    loginCode: string | null;
};

export type ClassroomBasicsPatch = {
    name?: string | null;
    grade?: string | null;
    image?: string | null;
    emoji?: string | null;
    theme?: string | null;
    levelConfig?: ClassroomDashboardViewModel["levelConfig"];
    quizReviewMode?: ClassroomDashboardViewModel["quizReviewMode"];
};

export type DashboardToastFn = (input: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
}) => void;

export type DashboardTranslateFn = (
    key: string,
    params?: Record<string, string | number>
) => string;
