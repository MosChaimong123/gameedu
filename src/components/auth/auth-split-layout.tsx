"use client"

import Link from "next/link"
import { BarChart3, Gamepad2, ShieldCheck, Sparkles, Trophy } from "lucide-react"
import { motion } from "framer-motion"
import { PublicBrandMark } from "@/components/layout/public-brand-mark"
import { useLanguage } from "@/components/providers/language-provider"
import { PageBackLink } from "@/components/ui/page-back-link"

type AuthSplitLayoutProps = {
    mode: "login" | "register"
    children: React.ReactNode
    /** Override "register" link target (e.g. preserve ?audience= when signing in as teacher/student) */
    registerHref?: string
    /** Override "login" link target (e.g. preserve callbackUrl when coming back from register) */
    loginHref?: string
}

export function AuthSplitLayout({ mode, children, registerHref, loginHref }: AuthSplitLayoutProps) {
    const { t } = useLanguage()
    const isLogin = mode === "login"

    const heroLine1 = isLogin ? t("loginHeroLine1") : t("registerHeroLine1")
    const heroLine2 = isLogin ? t("loginHeroLine2") : t("registerHeroLine2")
    const heroBody = isLogin ? t("loginHeroBody") : t("registerHeroBody")

    const formTitle = isLogin ? t("loginFormTitle") : t("registerFormTitle")
    const formSubtitle = isLogin ? t("loginFormSubtitle") : t("registerFormSubtitle")

    const footerPrompt = isLogin ? t("loginFooterPrompt") : t("registerFooterPrompt")
    const footerHref = isLogin ? registerHref ?? "/login?mode=register" : loginHref ?? "/login"
    const footerLinkText = isLogin ? t("loginFooterRegister") : t("registerFooterLogin")

    const loginFeatures = [
        { icon: Trophy, text: t("loginFeatureScores") },
        { icon: BarChart3, text: t("loginFeatureReports") },
        { icon: Gamepad2, text: t("loginFeatureGames") },
    ] as const

    return (
        <div className="flex min-h-screen w-full">
            <div
                className={`relative hidden flex-col justify-between overflow-hidden bg-brand-hero-gradient p-12 lg:flex ${
                    isLogin ? "lg:w-1/2" : "lg:w-2/5"
                }`}
            >
                <div className="pointer-events-none absolute inset-0 z-0 bg-black/10" aria-hidden />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <motion.div
                        className="mb-12 w-full"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                                duration: 5,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                            }}
                        >
                            <PublicBrandMark
                                variant="onDark"
                                size="xl"
                                centered
                                logoClassName="drop-shadow-[0_8px_24px_rgb(0_0_0_/_0.35)]"
                            />
                        </motion.div>
                    </motion.div>

                    <h1 className="mb-4 max-w-xl text-4xl font-black leading-tight text-white">
                        {heroLine1}
                        <br />
                        <span className="text-brand-yellow">{heroLine2}</span>
                    </h1>
                    <p className="max-w-md text-lg leading-relaxed text-white/70">{heroBody}</p>
                </div>

                <div className="relative z-10 w-full">
                    {isLogin ? (
                        <div className="mx-auto flex max-w-md flex-col gap-3">
                            {loginFeatures.map((item) => (
                                <div
                                    key={item.text}
                                    className="ring-sticker flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm"
                                >
                                    <item.icon className="h-6 w-6 text-brand-lavender" />
                                    <span className="font-semibold text-white">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mx-auto max-w-md space-y-4">
                            <div className="ring-sticker rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
                                <div className="mb-1 flex items-center gap-3">
                                    <Sparkles className="h-5 w-5 text-brand-lavender" />
                                    <p className="font-bold text-white">{t("registerBullet1Title")}</p>
                                </div>
                                <p className="pl-9 text-sm text-white/60">{t("registerBullet1Desc")}</p>
                            </div>
                            <div className="ring-sticker rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
                                <div className="mb-1 flex items-center gap-3">
                                    <ShieldCheck className="h-5 w-5 text-brand-lavender" />
                                    <p className="font-bold text-white">{t("registerBullet2Title")}</p>
                                </div>
                                <p className="pl-9 text-sm text-white/60">{t("registerBullet2Desc")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto bg-brand-surface p-6 sm:p-8">
                <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                    <PageBackLink href="/" labelKey="pageBackHome" />
                </div>

                <div className={`w-full py-6 sm:py-8 ${isLogin ? "max-w-md" : "max-w-lg"}`}>
                    <motion.div
                        className="mb-8 flex justify-center lg:hidden"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                                duration: 4.5,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                            }}
                        >
                            <PublicBrandMark
                                href="/"
                                size="lg"
                                logoClassName="drop-shadow-md"
                            />
                        </motion.div>
                    </motion.div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-800">{formTitle}</h2>
                        <p className="mt-2 text-slate-500">{formSubtitle}</p>
                    </div>

                    <div className="rounded-2xl border border-brand-lavender/30 bg-white/90 p-8 shadow-lg shadow-brand-lavender/10 backdrop-blur-sm">
                        {children}
                    </div>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        {footerPrompt}{" "}
                        <Link
                            href={footerHref}
                            className="font-bold text-brand-pink transition-colors hover:text-brand-navy"
                        >
                            {footerLinkText}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
