"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

export function PasswordUpgradeNotice({ required }: { required?: boolean }) {
  const { t } = useLanguage();
  if (!required) return null;
  return (
    <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      {t("passwordUpgradeNoticePrefix")}{" "}
      <Link className="font-semibold underline underline-offset-2" href="/forgot-password">{t("passwordUpgradeNoticeAction")}</Link>
      {" "}{t("passwordUpgradeNoticeSuffix")}
    </div>
  );
}
