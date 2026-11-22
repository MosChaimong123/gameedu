import { redirect } from "next/navigation";
import { StudentCodeExchangeBridge } from "@/components/student/student-code-exchange-bridge";
import { isCurrentStudentLoginCode, normalizeStudentLoginCode } from "@/lib/student-login-code";

export const metadata = {
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};

export default async function StudentCodeEntryPage(props: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await props.params;
  const code = normalizeStudentLoginCode(rawCode);
  if (!isCurrentStudentLoginCode(code)) redirect("/student?error=invalid_code");
  return <StudentCodeExchangeBridge code={code} />;
}
