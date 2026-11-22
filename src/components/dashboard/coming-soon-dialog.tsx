"use client";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/providers/language-provider";

export type ComingSoonDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Feature name, already translated. */
    title: string;
    /** What the feature will do, already translated. */
    description: string;
};

/**
 * Explains why a menu tile is locked. A disabled control with a `title` tooltip
 * cannot say this on touch devices, so the locked tile opens this instead.
 */
export function ComingSoonDialog({ open, onOpenChange, title, description }: ComingSoonDialogProps) {
    const { t } = useLanguage();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-4 w-4 shrink-0" aria-hidden />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <p className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground">
                    {t("hostComingSoon")}
                </p>
                <DialogFooter>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        {t("close")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
