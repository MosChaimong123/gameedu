import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";

import { PublicBrandMark } from "@/components/layout/public-brand-mark";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { LANGUAGE_COOKIE_NAME } from "@/lib/language-cookie";
import { homeContent, siteMetadata, type PublicPageLanguage } from "../../content/public-pages";

export default async function Home() {
    const cookieStore = await cookies();
    const language: PublicPageLanguage =
        cookieStore.get(LANGUAGE_COOKIE_NAME)?.value === "th" ? "th" : "en";
    const copy = homeContent[language];

    return (
        <div className="flex min-h-dvh flex-col bg-brand-surface">
            <div className="flex h-1 w-full shrink-0 sm:h-1.5" aria-hidden>
                <div className="flex-1 bg-brand-yellow" />
                <div className="flex-1 bg-brand-cyan" />
                <div className="flex-1 bg-brand-lavender" />
            </div>

            <nav className="flex shrink-0 items-center justify-between gap-2 border-b border-brand-lavender/35 bg-white/75 px-3 py-1.5 backdrop-blur-md sm:px-5 sm:py-2.5">
                <div className="min-w-0 flex-1">
                    <PublicBrandMark
                        href="/"
                        size="md"
                        priority
                        showTitle
                        className="min-w-0 max-w-full [&_span]:max-sm:text-sm"
                    />
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <Link href="/login">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-2.5 text-[11px] font-semibold text-slate-800 sm:h-9 sm:px-3 sm:text-xs md:text-sm"
                        >
                            {copy.navLogin}
                        </Button>
                    </Link>
                    <Link href="/register">
                        <Button
                            size="sm"
                            className="h-8 rounded-full border border-white/50 bg-white/50 px-2.5 text-[11px] font-bold text-brand-navy shadow-sm backdrop-blur-sm sm:h-9 sm:px-3 sm:text-xs md:text-sm"
                        >
                            {copy.navSignup}
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* บน: hero อยู่กลางพื้นที่ว่าง — ล่าง: แถบจุดเด่น (ไม่ทิ้งพื้นว่างไร้ความหมาย) */}
            <main className="flex min-h-0 w-full flex-1 flex-col">
                <div className="flex min-h-0 flex-1 flex-col justify-center px-3 py-4 sm:px-5 sm:py-5 md:py-6 lg:py-8">
                    <div className="mx-auto w-full max-w-4xl space-y-1.5 text-center sm:space-y-2 md:space-y-3">
                        <div className="flex justify-center">
                            <BrandLogo
                                size="3xl"
                                priority
                                className="w-auto max-w-full object-contain object-center drop-shadow-[0_10px_28px_rgb(49_46_129_/_0.12)] max-sm:max-h-[min(30vh,11.5rem)] sm:max-h-[min(32vh,12rem)] md:max-h-[min(40vh,15rem)] lg:max-h-[min(46vh,18rem)] xl:max-h-[min(52vh,22rem)]"
                            />
                        </div>

                        <h1 className="text-[clamp(1.2rem,3.8vw+0.55rem,2.75rem)] font-black leading-[1.08] tracking-tight text-brand-navy max-sm:px-0.5">
                            {copy.heroLine1} <br />
                            <span className="text-brand-pink">{copy.heroLine2}</span>
                        </h1>

                        <p className="mx-auto max-w-xl px-0.5 text-[12px] leading-snug text-slate-600 max-sm:leading-snug sm:text-sm md:text-base">
                            {copy.heroBody}
                        </p>

                        <div className="flex flex-row flex-wrap items-center justify-center gap-2 pt-0.5 sm:gap-3 sm:pt-2">
                            <Link href="/play" className="min-w-0 flex-1 sm:flex-initial sm:min-w-[10.5rem]">
                                <Button className="h-10 w-full min-w-0 rounded-full bg-brand-pink px-4 text-sm font-bold text-white shadow-[0_3px_0_rgb(190,24,93)] sm:h-11 sm:px-5 sm:text-base md:h-12 md:text-lg">
                                    {copy.joinGame}
                                    <ArrowRight className="ml-1 h-4 w-4 shrink-0 sm:ml-1.5 sm:h-5 sm:w-5" />
                                </Button>
                            </Link>

                            <Link href="/dashboard" className="min-w-0 flex-1 sm:flex-initial sm:min-w-[10.5rem]">
                                <Button
                                    variant="outline"
                                    className="h-10 w-full min-w-0 rounded-full border-2 border-brand-yellow/80 bg-brand-yellow px-4 text-sm font-bold text-on-yellow shadow-[0_3px_0_rgb(202,138,4)] sm:h-11 sm:px-5 sm:text-base md:h-12 md:text-lg"
                                >
                                    {copy.hostGame}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <section
                    className="shrink-0 border-t border-brand-lavender/35 bg-white/55 py-3 backdrop-blur-[6px] sm:py-4"
                    aria-label={language === "th" ? "จุดเด่นของแพลตฟอร์ม" : "Platform highlights"}
                >
                    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-2 px-4 sm:grid-cols-3 sm:gap-3 md:px-6">
                        {[
                            { label: copy.homeBand1, accent: "bg-brand-yellow" },
                            { label: copy.homeBand2, accent: "bg-brand-cyan" },
                            { label: copy.homeBand3, accent: "bg-brand-lavender" },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="flex items-center gap-2.5 rounded-2xl border border-brand-lavender/40 bg-white/80 px-3 py-2.5 text-left shadow-sm sm:flex-col sm:items-center sm:text-center sm:py-3"
                            >
                                <span
                                    className={`h-2 w-2 shrink-0 rounded-full ${item.accent} sm:h-2.5 sm:w-2.5`}
                                    aria-hidden
                                />
                                <span className="text-xs font-bold leading-snug text-brand-navy sm:text-sm">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="shrink-0 border-t border-brand-lavender/25 px-3 py-1.5 text-center text-[10px] leading-tight text-slate-500 sm:py-2.5 sm:text-xs">
                © {new Date().getFullYear()} {siteMetadata.title}. {copy.footerBuiltWith}
            </footer>
        </div>
    );
}
