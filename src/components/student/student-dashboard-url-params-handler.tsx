"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isCoursesUiEnabled } from "@/lib/courses-ui-enabled";

type Props = {
    setActiveTab: (tab: string) => void;
};

const LEARNING_TABS = new Set(["assignments", "lessons", "courses", "board", "history"]);

/**
 * อ่าน query ครั้งเดียวตอนโหลด: `tab`, `open` / `negamon` แล้วซิงก์แท็บหรือไปหน้า Negamon
 */
function StudentDashboardUrlParamsHandlerInner({ setActiveTab }: Props) {
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

        if (searchParams.has("open") || searchParams.has("negamon")) {
            appliedKey.current = key;
            setActiveTab("assignments");
            router.replace("/student/access", { scroll: false });
            return;
        }

        const tabParam = searchParams.get("tab");
        const isLearningTab = Boolean(tabParam && LEARNING_TABS.has(tabParam));
        const isAvailableCourseTab = tabParam !== "courses" || isCoursesUiEnabled();
        if (isLearningTab && isAvailableCourseTab && tabParam) {
            appliedKey.current = key;
            setActiveTab(tabParam);
            router.replace("/student/access", { scroll: false });
            return;
        }
        if (tabParam) {
            appliedKey.current = key;
            setActiveTab("assignments");
            router.replace("/student/access", { scroll: false });
        }
    }, [router, searchParams, setActiveTab]);

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
