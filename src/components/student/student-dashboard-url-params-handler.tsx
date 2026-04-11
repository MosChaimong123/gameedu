"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    parseStudentDashboardNegamonOpenParam,
    studentDashboardTabToMode,
} from "@/lib/student-dashboard-url-tabs";
import type { StudentDashboardMode } from "@/lib/services/student-dashboard/student-dashboard.types";

type Props = {
    code: string;
    setMode: (mode: StudentDashboardMode) => void;
    setActiveTab: (tab: string) => void;
};

/**
 * อ่าน query ครั้งเดียวตอนโหลด: `tab`, `open` / `negamon` แล้วซิงก์แท็บหรือไปหน้า Negamon
 */
function StudentDashboardUrlParamsHandlerInner({ code, setMode, setActiveTab }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const appliedKey = useRef<string | null>(null);

    useEffect(() => {
        const key = searchParams.toString();
        if (!key.trim()) {
            appliedKey.current = null;
            return;
        }
        if (appliedKey.current === key) return;

        const openRaw = searchParams.get("open") ?? searchParams.get("negamon");
        const negamonTarget = parseStudentDashboardNegamonOpenParam(openRaw);
        if (negamonTarget === "codex") {
            appliedKey.current = key;
            router.replace(`/student/${encodeURIComponent(code)}/negamon/codex`);
            return;
        }
        if (negamonTarget === "profile") {
            appliedKey.current = key;
            router.replace(`/student/${encodeURIComponent(code)}/negamon`);
            return;
        }

        const tabParam = searchParams.get("tab");
        if (tabParam) {
            const mode = studentDashboardTabToMode(tabParam);
            if (mode) {
                appliedKey.current = key;
                setMode(mode);
                setActiveTab(tabParam);
                router.replace(`/student/${encodeURIComponent(code)}`, { scroll: false });
            }
        }
    }, [code, router, searchParams, setMode, setActiveTab]);

    return null;
}

/** ต้องห่อ Suspense เพราะใช้ `useSearchParams` */
export function StudentDashboardUrlParamsHandler(props: Props) {
    return (
        <Suspense fallback={null}>
            <StudentDashboardUrlParamsHandlerInner {...props} />
        </Suspense>
    );
}
