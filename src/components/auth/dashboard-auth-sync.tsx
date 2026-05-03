"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { appendCallbackUrl } from "@/lib/auth/callback-url";

export function DashboardAuthSync() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "loading") {
            return;
        }

        if (status === "unauthenticated") {
            const qs = searchParams.toString();
            const callbackUrl = `${pathname}${qs ? `?${qs}` : ""}`;
            router.replace(appendCallbackUrl("/login", callbackUrl));
            return;
        }

        if (status === "authenticated" && session?.user?.role === "STUDENT") {
            router.replace("/student/home");
        }
    }, [pathname, router, searchParams, session?.user?.role, status]);

    return null;
}
