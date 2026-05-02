"use client";

import { signIn } from "next-auth/react";

export async function signInWithGoogleRole(role: "TEACHER" | "STUDENT"): Promise<void> {
    const res = await fetch("/api/auth/oauth-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
    });
    if (!res.ok) {
        throw new Error("oauth_intent_failed");
    }
    await signIn("google", { callbackUrl: "/auth/complete-oauth" });
}
