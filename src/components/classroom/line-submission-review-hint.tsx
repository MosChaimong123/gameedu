"use client";

import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ParsedLineTextSubmissionContent } from "@/lib/line-bot/submission-content";

type LineSubmissionReviewHintProps = {
    content: ParsedLineTextSubmissionContent;
    onApplySuggestedScore?: () => void;
    applying?: boolean;
    compact?: boolean;
};

export function LineSubmissionReviewHint({
    content,
    onApplySuggestedScore,
    applying = false,
    compact = false,
}: LineSubmissionReviewHintProps) {
    const graded = content.aiPreliminaryGrading.status === "graded" ? content.aiPreliminaryGrading : null;
    const review = content.aiPreliminaryReview ?? null;
    const preview = content.text.length > 64 ? `${content.text.slice(0, 64)}...` : content.text;

    return (
        <div
            className={cn(
                "rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-left text-[10px] leading-snug text-sky-900",
                compact ? "max-w-[7.5rem]" : "max-w-sm"
            )}
        >
            <div className="font-black">
                LINE {graded ? `AI ${graded.suggestedScore}/${graded.maxScore}` : "รอตรวจ"}
            </div>
            {review ? (
                <div className="font-bold text-emerald-700">
                    {review.status === "accepted" ? "ครูใช้คะแนน AI แล้ว" : review.status === "edited" ? "ครูแก้คะแนนแล้ว" : "ครูไม่ใช้คะแนน AI"}
                </div>
            ) : null}
            <div className="line-clamp-2 text-sky-700">{preview}</div>
            {graded && !review && onApplySuggestedScore ? (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={applying}
                    className={cn(
                        "mt-1 h-7 border-sky-300 bg-white px-2 text-[10px] font-black text-sky-800 hover:bg-sky-100",
                        compact && "h-6 px-1.5"
                    )}
                    onClick={onApplySuggestedScore}
                >
                    {applying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                    ใช้ AI
                </Button>
            ) : null}
        </div>
    );
}
