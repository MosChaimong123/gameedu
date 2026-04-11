import LoginForm from "./login-form"
import { AuthSplitLayout } from "@/components/auth/auth-split-layout"

export default function LoginPage() {
    return (
        <AuthSplitLayout mode="login">
            <LoginForm />
        </AuthSplitLayout>
    )
}
