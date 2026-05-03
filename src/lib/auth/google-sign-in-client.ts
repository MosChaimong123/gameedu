"use client";

import { signIn } from "next-auth/react";
import { appendCallbackUrl } from "@/lib/auth/callback-url";

export async function signInWithGoogleRole(role: "TEACHER" | "STUDENT", callbackUrl?: string | null): Promise<void> {
    const res = await fetch("/api/auth/oauth-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
    });
    if (!res.ok) {
        throw new Error("oauth_intent_failed");
    }
    await signIn("google", { callbackUrl: appendCallbackUrl("/auth/complete-oauth", callbackUrl) });
}
