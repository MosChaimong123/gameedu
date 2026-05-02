"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Loader2, Lock, Globe, FileText, Database } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { ImageUpload } from "@/components/image-upload"
import { PageBackLink } from "@/components/ui/page-back-link"
import { useToast } from "@/components/ui/use-toast"
import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages"

export default function CreateSetPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    // Form state
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [coverImage, setCoverImage] = useState("")
    const [isPublic, setIsPublic] = useState(true)
    const [creationMethod, setCreationMethod] = useState<"manual" | "csv">("manual")

    useEffect(() => {
        if (status === "authenticated" && session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
            router.replace("/dashboard")
        }
    }, [router, session, status])

    if (status === "loading") {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        )
    }

    if (status === "authenticated" && session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
        return null
    }

    const handleSubmit = async () => {
        if (!title.trim()) return

        setLoading(true)
        try {
            const res = await fetch("/api/sets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    isPublic,
                    coverImage
                }),
            })

            if (res.ok) {
                const set = await res.json()
                toast({
                    title: t("createSetSuccessTitle"),
                    description:
                        creationMethod === "csv"
                            ? t("createSetSuccessDescCsv")
                            : t("createSetSuccessDescManual"),
                })
                if (creationMethod === "csv") {
                    router.push(`/dashboard/edit-set/${set.id}?openImport=true`)
                } else {
                    router.push(`/dashboard/edit-set/${set.id}`)
                }
                router.refresh()
            } else {
                const msg = await getLocalizedErrorMessageFromResponse(
                    res,
                    "createSetFailTryAgain",
                    t,
                    language
                )
                toast({
                    title: t("createSetFailTitle"),
                    description: msg || t("createSetFailTryAgain"),
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error(error)
            toast({
                title: t("createSetFailTitle"),
                description: t("createSetFailGeneric"),
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
            {/* Header */}
            <div className="space-y-4">
                <PageBackLink href="/dashboard/my-sets" labelKey="navBackMySets" />
                <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-slate-800">{t("questionSetCreator")}</h1>
                    <div className="rounded-full bg-slate-200 p-1 text-slate-500 cursor-help">
                        <span className="sr-only">{t("help")}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left Column - 2/5 width */}
                <div className="md:col-span-2 space-y-6">
                    {/* Cover Image */}
                    <div className="space-y-2">
                        <ImageUpload
                            value={coverImage}
                            onChange={setCoverImage}
                        />
                    </div>

                    {/* Privacy Setting */}
                    <Card className="p-4 bg-white shadow-sm rounded-xl">
                        <div className="flex flex-col space-y-3">
                            <div className="space-y-1">
                                <Label className="text-base font-bold text-slate-800">{t("privacySetting")}</Label>
                                <p className="text-xs text-slate-500">{t("privacyDesc")}</p>
                            </div>

                            <div className="flex items-center space-x-4 pt-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={isPublic}
                                        onCheckedChange={setIsPublic}
                                        className="data-[state=checked]:bg-teal-500"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    {isPublic ? (
                                        <>
                                            <Globe className="h-5 w-5 text-teal-500" />
                                            <span className="font-bold text-teal-600">{t("public")}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-5 w-5 text-slate-500" />
                                            <span className="font-bold text-slate-600">{t("private")}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column - 3/5 width */}
                <div className="md:col-span-3 space-y-6">
                    <Card className="p-6 bg-white shadow-sm rounded-xl space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-lg font-bold text-slate-700">
                                {t("titleRequired")}
                            </Label>
                            <Input
                                id="title"
                                placeholder={t("titlePlaceholder")}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-12 text-lg bg-slate-50 border-slate-200 focus-visible:ring-purple-500"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-lg font-bold text-slate-700">
                                {t("description")}
                            </Label>
                            <Textarea
                                id="description"
                                placeholder={t("descPlaceholder")}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="resize-none bg-slate-50 border-slate-200 focus-visible:ring-purple-500"
                            />
                        </div>
                    </Card>

                    {/* Creation Method */}
                    <Card className="p-6 bg-white shadow-sm rounded-xl space-y-4">
                        <div className="space-y-1">
                            <Label className="text-lg font-bold text-slate-700">{t("creationMethod")}</Label>
                            <p className="text-xs text-slate-500">{t("methodDesc")}</p>
                        </div>

                        <div className="flex space-x-4">
                            <Button
                                type="button"
                                variant={creationMethod === "manual" ? "default" : "outline"}
                                className={`flex-1 h-12 font-bold ${creationMethod === "manual" ? "bg-teal-500 hover:bg-teal-600 border-none" : "border-2"}`}
                                onClick={() => setCreationMethod("manual")}
                            >
                                <FileText className="mr-2 h-5 w-5" />
                                {t("manual")}
                            </Button>
                            <Button
                                type="button"
                                variant={creationMethod === "csv" ? "default" : "outline"}
                                className={`flex-1 h-12 font-bold ${creationMethod === "csv" ? "bg-teal-500 hover:bg-teal-600 border-none" : "border-2"}`}
                                onClick={() => setCreationMethod("csv")}
                            >
                                <Database className="mr-2 h-5 w-5" />
                                {t("csvImport")}
                            </Button>
                        </div>
                    </Card>

                    {/* Footer Actions */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !title.trim()}
                            className="h-12 px-8 text-lg font-bold bg-teal-500 hover:bg-teal-600 shadow-md transform active:scale-95 transition-all text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {t("createSetCreating")}
                                </>
                            ) : (
                                t("create")
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
