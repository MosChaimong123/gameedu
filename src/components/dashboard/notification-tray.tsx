"use client"

import { useEffect, useState, useCallback, useId } from "react"
import { Bell, Check, Trash2, ExternalLink, Info, CheckCircle, AlertTriangle, XCircle, BookOpen, Star } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { enUS, th } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"
import { resolveNotificationCopy } from "@/lib/notification-display"

type ApiNotification = {
    id: string
    title: string
    message: string
    titleKey?: string | null
    messageKey?: string | null
    i18nParams?: unknown
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "ASSIGNMENT" | "POINT"
    isRead: boolean
    link: string | null
    createdAt: string
}

interface NotificationTrayProps {
    studentCode?: string
}

export function NotificationTray({ studentCode }: NotificationTrayProps) {
    const { t, language } = useLanguage()
    const dateLocale = language === "th" ? th : enUS
    const popoverId = useId()
    const [notifications, setNotifications] = useState<ApiNotification[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    const fetchUrl = studentCode
        ? `/api/student/${studentCode}/notifications`
        : `/api/notifications`

    const isAbortError = (error: unknown) =>
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")

    const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await fetch(fetchUrl, { signal, cache: "no-store" })
            if (!res.ok) {
                const text = await res.text()
                if (!signal?.aborted) {
                    console.warn(`Failed to fetch notifications from ${fetchUrl} with status ${res.status}: ${text}`)
                }
                return
            }
            const data = (await res.json()) as ApiNotification[]
            if (!signal?.aborted) {
                setNotifications(data)
            }
        } catch (error) {
            if (isAbortError(error)) return
            const isNetworkFailure =
                error instanceof Error &&
                ["TypeError", "NetworkError"].includes(error.name) &&
                error.message.toLowerCase().includes("fetch")
            if (!signal?.aborted && !isNetworkFailure) {
                console.error(`Failed to fetch notifications from ${fetchUrl}:`, error)
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false)
            }
        }
    }, [fetchUrl])

    useEffect(() => {
        const controller = new AbortController()
        void fetchNotifications(controller.signal)
        const interval = setInterval(fetchNotifications, 30000)
        return () => {
            clearInterval(interval)
            controller.abort()
        }
    }, [fetchNotifications])

    const unreadCount = notifications.filter((n) => !n.isRead).length

    const markAsRead = async (id: string | "all") => {
        try {
            const res = await fetch(fetchUrl, {
                method: "PATCH",
                body: JSON.stringify({ id, isRead: true }),
                headers: { "Content-Type": "application/json" },
            })
            if (res.ok) {
                if (id === "all") {
                    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
                } else {
                    const updated = (await res.json()) as ApiNotification
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === id ? { ...n, ...updated, isRead: true } : n))
                    )
                }
            }
        } catch (error) {
            console.error("Failed to mark as read", error)
        }
    }

    const deleteNotification = async (id: string) => {
        try {
            const res = await fetch(`${fetchUrl}?id=${id}`, { method: "DELETE" })
            if (res.ok) {
                setNotifications((prev) => prev.filter((n) => n.id !== id))
            }
        } catch (error) {
            console.error("Failed to delete notification", error)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "SUCCESS":
                return <CheckCircle className="w-4 h-4 text-green-500" />
            case "WARNING":
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />
            case "ERROR":
                return <XCircle className="w-4 h-4 text-red-500" />
            case "ASSIGNMENT":
                return <BookOpen className="w-4 h-4 text-indigo-500" />
            case "POINT":
                return <Star className="w-4 h-4 text-amber-500" />
            default:
                return <Info className="w-4 h-4 text-blue-500" />
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-slate-100 transition-colors">
                    <Bell className="h-5 w-5 text-slate-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white animate-in zoom-in">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent id={popoverId} className="w-80 md:w-96 p-0 bg-white/80 backdrop-blur-2xl border-white shadow-2xl rounded-[2rem] overflow-hidden" align="end">
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-100/50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">{t("notifTrayHeader")}</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                            {t("notifTrayNewBadge", { count: String(unreadCount) })}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 h-7"
                            onClick={() => markAsRead("all")}
                        >
                            <Check className="w-3 h-3 mr-1" /> {t("notifTrayMarkAllRead")}
                        </Button>
                    )}
                </div>

                <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
                    {loading ? (
                        <div className="p-8 text-center space-y-3">
                            <div className="flex justify-center flex-wrap gap-1">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="h-1 w-1 bg-slate-200 rounded-full animate-bounce"
                                        style={{ animationDelay: `${i * 0.2}s` }}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 font-medium">{t("notifTrayLoading")}</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-6 h-6 text-slate-200" />
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm">{t("notifTrayEmpty")}</h4>
                            <p className="text-xs text-slate-400 mt-1">{t("notifTrayEmptyHint")}</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            <AnimatePresence initial={false}>
                                {notifications.map((notif) => {
                                    const { title, message } = resolveNotificationCopy(notif, t)
                                    let relative = formatDistanceToNow(new Date(notif.createdAt), {
                                        addSuffix: true,
                                        locale: dateLocale,
                                    })
                                    if (language === "th") {
                                        relative = relative.replace("ประมาณ ", "")
                                    }
                                    return (
                                        <motion.div
                                            key={notif.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className={cn(
                                                "group relative flex gap-3 px-4 py-3 hover:bg-slate-50/80 transition-all cursor-pointer",
                                                !notif.isRead && "bg-indigo-50/30 hover:bg-indigo-50/50"
                                            )}
                                            onClick={() => {
                                                if (!notif.isRead) void markAsRead(notif.id)
                                                if (notif.link) {
                                                    setOpen(false)
                                                    window.location.href = notif.link
                                                }
                                            }}
                                        >
                                            {!notif.isRead && (
                                                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                            )}

                                            <div className="shrink-0 mt-0.5">{getIcon(notif.type)}</div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4
                                                        className={cn(
                                                            "text-sm leading-tight text-slate-800",
                                                            !notif.isRead ? "font-bold" : "font-medium"
                                                        )}
                                                    >
                                                        {title}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                                                        {relative}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{message}</p>

                                                {notif.link && (
                                                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-indigo-600">
                                                        {t("notifTrayViewDetails")} <ExternalLink className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 rounded-md hover:bg-red-50 hover:text-red-500 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        void deleteNotification(notif.id)
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {notifications.length > 5 && (
                    <div className="px-4 py-2 bg-slate-50 border-t text-center">
                        <Button variant="ghost" size="sm" className="text-[10px] font-bold text-slate-400 hover:text-slate-600 h-6">
                            {t("notifTrayViewAll")}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
