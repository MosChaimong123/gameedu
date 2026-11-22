import { notFound, redirect } from "next/navigation";
import { CivilizationGame } from "@/components/civilization-idle/civilization-game";
import { getStudentAccessSession } from "@/lib/auth/student-access-session";
import { isCivilizationIdleEnabled, isCivilizationIdleEnabledForClass } from "@/lib/civilization-idle";

export const metadata = {
  title: "Civilization Idle | TeachPlayEdu",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};

export default async function CivilizationIdlePage() {
  if (!isCivilizationIdleEnabled()) notFound();

  const session = await getStudentAccessSession("student:read");
  if (!session) redirect("/student?error=session_expired");
  if (!isCivilizationIdleEnabledForClass(session.classId)) notFound();

  return <CivilizationGame />;
}
