"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export function ReportPrintButton({ className }: { className?: string }) {
    const { t } = useLanguage();
    return (
        <Button
            type="button"
            variant="outline"
            className={className}
            onClick={() => window.print()}
        >
            <BarChart3 className="h-4 w-4" /> {t("gameReportExportPdf")}
        </Button>
    );
}
