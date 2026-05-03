"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, KeyRound, User } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { appendCallbackUrl } from "@/lib/auth/callback-url";
import { cn } from "@/lib/utils";
import LoginForm from "@/app/login/login-form";
import SignupWizard from "@/app/register/signup-wizard";

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
                        <Link
                            href="/student"
                            className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50"
                        >
                            <KeyRound className="h-10 w-10 text-indigo-600" />
                            <h3 className="mt-3 text-lg font-bold text-slate-800">{t("authEntryCodeOnly")}</h3>
                            <p className="mt-1 text-sm text-slate-600">{t("authEntryCodeOnlyDesc")}</p>
                        </Link>
                    </div>
                </div>
            </AuthSplitLayout>
        );
    }

    return (
        <AuthSplitLayout
            mode="login"
            registerHref={appendCallbackUrl(
                `/login?mode=register&audience=${audience === "teacher" ? "teacher" : "student"}`,
                callbackUrl
            )}
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
                {audience === "student" ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                        {t("authStudentLoginHint")}
                        <div className="mt-2">
                            <Link href="/student" className="font-semibold text-emerald-800 underline hover:text-emerald-950">
                                {t("authStudentCodeCta")}
                            </Link>
                        </div>
                    </div>
                ) : null}
                <LoginForm audience={audience} />
            </div>
        </AuthSplitLayout>
    );
}
