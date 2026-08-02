"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { PageBackLink } from "@/components/ui/page-back-link";
import { OMRPrintableSheet } from "@/components/omr/omr-printable-sheet";
import { useLanguage } from "@/components/providers/language-provider";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { isOmrDashboardEnabled } from "@/lib/omr-dashboard-enabled";

export default function OMRTemplatesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const omrEnabled = isOmrDashboardEnabled();

  useEffect(() => {
    if (!omrEnabled) router.replace("/dashboard");
  }, [omrEnabled, router]);

  useEffect(() => {
    if (status === "authenticated" && !isTeacherOrAdmin(session.user.role)) {
      router.replace("/dashboard");
    }
  }, [router, session, status]);

  if (status === "loading" || !omrEnabled) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
      </div>
    );
  }

  if (status === "authenticated" && !isTeacherOrAdmin(session.user.role)) {
    return null;
  }

  return (
    <div className="min-h-0 w-full font-sans">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <PageBackLink href="/dashboard/omr" labelKey="navBackOmr" />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">
              {t("omrTemplatesPageTitle")}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {t("omrTemplatesPageSubtitle")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="rounded-[2rem] border-2 border-slate-900 bg-slate-900 p-6 text-white shadow-xl">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-sky">
                THAI-50-V1
              </span>
              <h2 className="mt-3 text-2xl font-black">{t("omrTemplatesSize50Label")}</h2>
              <p className="mt-2 text-xs font-bold leading-relaxed text-slate-300">
                {t("omrFixedTemplateHint")}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-brand-purple p-7 text-white shadow-xl shadow-brand-purple/25">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <h3 className="relative z-10 mb-3 text-xl font-black">
                {t("omrTemplatesProTipTitle")}
              </h3>
              <p className="relative z-10 text-xs font-bold leading-relaxed opacity-90">
                {t("omrTemplatesProTipBody")}
              </p>
            </div>
          </aside>

          <section className="flex min-h-[80vh] w-full flex-col items-center rounded-[3rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex w-full flex-col items-center"
            >
              <div className="mb-8 text-center">
                <h2 className="mb-2 text-2xl font-black text-slate-800">
                  {t("omrTemplatesPreviewTitle")}
                </h2>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t("omrTemplatesPreviewSub")}
                </p>
              </div>
              <OMRPrintableSheet quizTitle={t("omrTemplatesMasterTitle")} />
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
}
