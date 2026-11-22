import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MfaChallenge } from "@/components/auth/mfa-challenge";
import { db } from "@/lib/db";

export default async function MfaChallengePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.mfaEnrolled && session.user.role === "ADMIN") redirect("/auth/mfa/setup");
  const destination = session.user.role === "ADMIN" ? "/admin" : session.user.role === "STUDENT" ? "/student/home" : "/dashboard";
  if (session.user.mfaLevel === 1) redirect(destination);
  const passkey = await db.passkeyCredential.findFirst({ where: { userId: session.user.id }, select: { id: true } });
  return <main className="mx-auto flex min-h-[100dvh] max-w-md items-center p-5"><MfaChallenge destination={destination} hasPasskey={Boolean(passkey)} /></main>;
}
