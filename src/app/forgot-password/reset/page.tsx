import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
    searchParams: Promise<{ email?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
    const params = await searchParams;
    return (
        <AuthSplitLayout mode="login" loginHref="/login">
            <ResetPasswordForm initialEmail={params.email ?? ""} />
        </AuthSplitLayout>
    );
}
