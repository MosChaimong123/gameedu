"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedGroupSummary } from "./toolkit/group-maker";

type SavedGroupApiRecord = {
    id: string;
    name: string;
    studentIds: string[];
};

function parseSavedGroupRecord(group: SavedGroupApiRecord): SavedGroupSummary {
    const ids = group.studentIds.flatMap((raw) => {
        try {
            const parsed = JSON.parse(raw) as { studentIds?: string[] } | string[];
            return Array.isArray(parsed) ? parsed : (parsed.studentIds ?? []);
        } catch {
            return [];
        }
    });

    return {
        id: group.id,
        name: group.name,
        studentIds: ids,
    };
}

export function useClassroomSelectionFlow(args: {
    classroomId: string;
    studentIds: string[];
}) {
    const { classroomId, studentIds } = args;
    const [isSelectMultiple, setIsSelectMultiple] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [groupFilter, setGroupFilter] = useState<string>("all");
    const [savedGroups, setSavedGroups] = useState<SavedGroupSummary[]>([]);

    useEffect(() => {
        if (!isSelectMultiple || savedGroups.length > 0) return;

        fetch(`/api/classrooms/${classroomId}/groups`)
            .then((response) => (response.ok ? response.json() : []))
            .then((groups: SavedGroupApiRecord[]) => {
                setSavedGroups(groups.map(parseSavedGroupRecord));
            })
            .catch(() => {});
    }, [isSelectMultiple, classroomId, savedGroups.length]);

    const visibleStudentIds = useMemo(() => (
        groupFilter === "all"
            ? studentIds
            : (savedGroups.find((group) => group.id === groupFilter)?.studentIds ?? [])
    ), [groupFilter, savedGroups, studentIds]);

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudentIds((prev) =>
            prev.includes(studentId)
                ? prev.filter((id) => id !== studentId)
                : [...prev, studentId]
        );
    };

    const clearSelectionMode = () => {
        setIsSelectMultiple(false);
        setSelectedStudentIds([]);
        setGroupFilter("all");
    };

    return {
        isSelectMultiple,
        setIsSelectMultiple,
        selectedStudentIds,
        setSelectedStudentIds,
        groupFilter,
        setGroupFilter,
        savedGroups,
        setSavedGroups,
        visibleStudentIds,
        toggleStudentSelection,
        clearSelectionMode,
    };
}
