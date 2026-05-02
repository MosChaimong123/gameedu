import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { UnifiedAuthFlow } from "@/components/auth/unified-auth-flow";

function LoginFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" aria-hidden />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginFallback />}>
            <UnifiedAuthFlow />
        </Suspense>
    );
}
