import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MfaSetup } from "@/components/auth/mfa-setup";
import { hasRecentStrongAuthentication } from "@/lib/auth/reauthentication";

export default async function MfaSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.mfaEnrolled) redirect("/auth/mfa");
  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <MfaSetup requiresPassword={!hasRecentStrongAuthentication(session)} />
    </main>
  );
}
