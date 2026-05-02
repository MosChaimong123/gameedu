import { redirect } from "next/navigation";

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const q = new URLSearchParams();
    q.set("mode", "register");
    const raw = sp.audience;
    const aud = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (aud === "teacher" || aud === "student") {
        q.set("audience", aud);
    }
    redirect(`/login?${q.toString()}`);
}
