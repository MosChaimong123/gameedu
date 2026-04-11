"use client"

import Link from "next/link"
import { PageBackLink } from "@/components/ui/page-back-link"
import { PublicBrandMark } from "@/components/layout/public-brand-mark"
import { useLanguage } from "@/components/providers/language-provider"

type AuthSplitLayoutProps = {
    mode: "login" | "register"
    children: React.ReactNode
}

export function AuthSplitLayout({ mode, children }: AuthSplitLayoutProps) {
    const { t } = useLanguage()
    const isLogin = mode === "login"

    const heroLine1 = isLogin ? t("loginHeroLine1") : t("registerHeroLine1")
    const heroLine2 = isLogin ? t("loginHeroLine2") : t("registerHeroLine2")
    const heroBody = isLogin ? t("loginHeroBody") : t("registerHeroBody")

    const formTitle = isLogin ? t("loginFormTitle") : t("registerFormTitle")
    const formSubtitle = isLogin ? t("loginFormSubtitle") : t("registerFormSubtitle")

    const footerPrompt = isLogin ? t("loginFooterPrompt") : t("registerFooterPrompt")
    const footerHref = isLogin ? "/register" : "/login"
    const footerLinkText = isLogin ? t("loginFooterRegister") : t("registerFooterLogin")

    const loginFeatures = [
        { icon: "🏆", text: t("loginFeatureScores") },
        { icon: "📊", text: t("loginFeatureReports") },
        { icon: "🎮", text: t("loginFeatureGames") },
    ] as const

    return (
        <div className="flex min-h-screen w-full">
            <div
                className={`relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-12 lg:flex ${
                    isLogin ? "lg:w-1/2" : "lg:w-2/5"
                }`}
            >
                <div className="absolute top-0 right-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-64 w-64 translate-y-1/2 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

                <div className="relative z-10">
                    <div className="mb-16">
                        <PublicBrandMark variant="onDark" size="lg" />
                    </div>

                    <h1 className="mb-4 text-4xl font-black leading-tight text-white">
                        {heroLine1}
                        <br />
                        <span className="text-white/80">{heroLine2}</span>
                    </h1>
                    <p className="max-w-sm text-lg leading-relaxed text-white/70">{heroBody}</p>
                </div>

                <div className="relative z-10">
                    {isLogin ? (
                        <div className="flex flex-col gap-3">
                            {loginFeatures.map((item) => (
                                <div
                                    key={item.text}
                                    className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm"
                                >
                                    <span className="text-2xl">{item.icon}</span>
                                    <span className="font-semibold text-white">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                <div className="mb-1 flex items-center gap-3">
                                    <span className="text-xl">⚡</span>
                                    <p className="font-bold text-white">{t("registerBullet1Title")}</p>
                                </div>
                                <p className="pl-9 text-sm text-white/60">{t("registerBullet1Desc")}</p>
                            </div>
                            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                <div className="mb-1 flex items-center gap-3">
                                    <span className="text-xl">🔒</span>
                                    <p className="font-bold text-white">{t("registerBullet2Title")}</p>
                                </div>
                                <p className="pl-9 text-sm text-white/60">{t("registerBullet2Desc")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-50 p-6 sm:p-8">
                <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                    <PageBackLink href="/" labelKey="pageBackHome" />
                </div>

                <div className={`w-full py-6 sm:py-8 ${isLogin ? "max-w-md" : "max-w-lg"}`}>
                    <div className="mb-8 lg:hidden">
                        <PublicBrandMark href="/" size="md" />
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-800">{formTitle}</h2>
                        <p className="mt-2 text-slate-500">{formSubtitle}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-lg">{children}</div>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        {footerPrompt}{" "}
                        <Link
                            href={footerHref}
                            className="font-bold text-indigo-600 transition-colors hover:text-indigo-500"
                        >
                            {footerLinkText}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
