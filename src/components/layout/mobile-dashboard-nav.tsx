"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { Sidebar } from "@/components/layout/sidebar"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function MobileDashboardNav() {
    const { t } = useLanguage()
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="touch-target md:hidden shrink-0"
                    aria-label={t("openMenu")}
                >
                    <Menu className="h-5 w-5" aria-hidden />
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-[min(100vw-2rem,16rem)] max-w-[16rem] border-r border-sidebar-border bg-sidebar p-0 [&>button]:text-sidebar-foreground"
            >
                <SheetTitle className="sr-only">{t("mainNavigation")}</SheetTitle>
                <Sidebar
                    className="h-full w-full border-0"
                    onNavigate={() => setOpen(false)}
                />
            </SheetContent>
        </Sheet>
    )
}
