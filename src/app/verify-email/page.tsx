import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { VerifyEmailCodeForm } from "@/components/auth/verify-email-code-form";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    audience?: string;
    callbackUrl?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
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

