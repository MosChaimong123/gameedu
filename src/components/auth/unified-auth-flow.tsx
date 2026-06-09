"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, User } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { appendCallbackUrl } from "@/lib/auth/callback-url";
import { cn } from "@/lib/utils";
import LoginForm from "@/app/login/login-form";
import SignupWizard from "@/app/register/signup-wizard";
import { isPublicSignupEnabledClient } from "@/lib/auth/signup-policy-client";

function RolePickCard({
    icon,
    title,
    description,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex w-full flex-col items-center rounded-xl border-2 border-slate-200 bg-white p-6 text-center transition-all hover:border-indigo-400 hover:shadow-md"
            )}
        >
            {icon}
            <h3 className="mt-3 text-lg font-bold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
        </button>
    );
}

export function UnifiedAuthFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const mode = searchParams.get("mode");
    const callbackUrl = searchParams.get("callbackUrl");
    const audienceRaw = searchParams.get("audience");
    const audience =
        audienceRaw === "teacher" ? "teacher" : audienceRaw === "student" ? "student" : null;
    const isRegister = mode === "register";
    const signupEnabled = isPublicSignupEnabledClient();

    React.useEffect(() => {
        if (isRegister && !signupEnabled) {
            router.replace(appendCallbackUrl("/login", callbackUrl));
        }
    }, [isRegister, signupEnabled, router, callbackUrl]);

    if (isRegister && !signupEnabled) {
        return null;
    }

    if (isRegister) {
        const preset =
            audience === "teacher" ? ("TEACHER" as const) : audience === "student" ? ("STUDENT" as const) : null;
        return (
            <AuthSplitLayout mode="register" loginHref={appendCallbackUrl("/login", callbackUrl)}>
                <SignupWizard presetRole={preset} />
            </AuthSplitLayout>
        );
    }

    if (!audience) {
        return (
            <AuthSplitLayout mode="login">
                <div className="space-y-6">
                    <div className="space-y-1 text-center">
                        <h3 className="text-lg font-bold text-slate-800">{t("authEntryTitle")}</h3>
                        <p className="text-sm text-slate-500">{t("authEntrySubtitle")}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <RolePickCard
                            icon={<User className="h-10 w-10 text-purple-500" />}
                            title={t("authEntryTeacher")}
                            description={t("authEntryTeacherDesc")}
                            onClick={() => router.replace(appendCallbackUrl("/login?audience=teacher", callbackUrl))}
                        />
                        <RolePickCard
                            icon={<GraduationCap className="h-10 w-10 text-emerald-500" />}
                            title={t("authEntryStudent")}
                            description={t("authEntryStudentDesc")}
                            onClick={() => router.replace(appendCallbackUrl("/login?audience=student", callbackUrl))}
                        />
                    </div>
                </div>
            </AuthSplitLayout>
        );
    }

    return (
        <AuthSplitLayout
            mode="login"
            registerHref={
                signupEnabled
                    ? appendCallbackUrl(
                          `/login?mode=register&audience=${audience === "teacher" ? "teacher" : "student"}`,
                          callbackUrl
                      )
                    : undefined
            }
        >
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className="mb-2 -ml-2 w-fit"
                    onClick={() => router.replace(appendCallbackUrl("/login", callbackUrl))}
                >
                    {t("authBackToRolePick")}
                </Button>
                <LoginForm audience={audience} />
            </div>
        </AuthSplitLayout>
    );
}
