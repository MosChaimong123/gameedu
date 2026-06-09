import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
    return (
        <AuthSplitLayout mode="login" loginHref="/login">
            <ForgotPasswordForm />
        </AuthSplitLayout>
    );
}
