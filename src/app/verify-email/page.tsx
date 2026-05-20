import { redirect } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { VerifyEmailCodeForm } from "@/components/auth/verify-email-code-form";
import { isEmailVerificationRequired } from "@/lib/auth/signup-policy";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    audience?: string;
    callbackUrl?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  if (!isEmailVerificationRequired()) {
    const params = await searchParams;
    const q = new URLSearchParams();
    if (params.audience === "teacher" || params.audience === "student") {
      q.set("audience", params.audience);
    }
    redirect(q.size > 0 ? `/login?${q.toString()}` : "/login");
  }

  const params = await searchParams;
  const audience =
    params.audience === "teacher"
      ? "teacher"
      : params.audience === "student"
        ? "student"
        : null;

  return (
    <AuthSplitLayout mode="login" loginHref="/login">
      <VerifyEmailCodeForm
        initialEmail={params.email ?? ""}
        audience={audience}
        callbackUrl={params.callbackUrl ?? null}
      />
    </AuthSplitLayout>
  );
}
