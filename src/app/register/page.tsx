import SignupWizard from "./signup-wizard"
import { AuthSplitLayout } from "@/components/auth/auth-split-layout"

export default function RegisterPage() {
    return (
        <AuthSplitLayout mode="register">
            <SignupWizard />
        </AuthSplitLayout>
    )
}
