"use client"

import { AlertCircle } from "lucide-react"

import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, variant, ...props }) {
                const isDestructive = variant === "destructive"
                return (
                    <Toast key={id} variant={variant} {...props}>
                        <div
                            className={
                                isDestructive
                                    ? "flex min-w-0 flex-1 items-start gap-3"
                                    : "grid min-w-0 flex-1 gap-1"
                            }
                        >
                            {isDestructive && (
                                <div
                                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/90 text-rose-800 shadow-sm"
                                    aria-hidden
                                >
                                    <AlertCircle className="h-5 w-5 stroke-[2.25]" />
                                </div>
                            )}
                            <div className="grid min-w-0 flex-1 gap-1 pr-1">
                                {title && <ToastTitle>{title}</ToastTitle>}
                                {description && (
                                    <ToastDescription>{description}</ToastDescription>
                                )}
                            </div>
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}
