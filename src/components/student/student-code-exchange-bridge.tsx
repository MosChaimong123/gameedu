"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StudentCodeExchangeBridge({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void fetch("/api/student/access/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).then((response) => {
      if (!active) return;
      router.replace(response.ok ? "/student/access" : "/student?error=invalid_code");
    });
    return () => { active = false; };
  }, [code, router]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-6">
      <p className="text-sm font-semibold text-slate-600" role="status">กำลังเปิดพื้นที่นักเรียน…</p>
    </main>
  );
}
