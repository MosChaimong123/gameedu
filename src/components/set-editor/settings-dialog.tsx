"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "@/components/image-upload"
import { useLanguage } from "@/components/providers/language-provider"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    coverImage: string
    isPublic: boolean
    onUpdate: (data: { title: string; description: string; coverImage: string; isPublic: boolean }) => void
}

export function SettingsDialog({ open, onOpenChange, title, description, coverImage, isPublic, onUpdate }: Props) {
    const { t } = useLanguage()

    // Internal state (uncontrolled inside, pushes out on save)
    // Actually, controlled from parent is better for simplicity with the monolithic state
    // But to make it cleaner, let's just use the props directly as it's a modal that updates immediately on change in the original code.
    // Wait, original code updates state immediately on change. Let's keep that pattern for now.

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white">
                <DialogHeader>
                    <DialogTitle>{t("editInfo")}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-2">
                        <Label>{t("coverImage")}</Label>
                        <ImageUpload
                            value={coverImage}
                            onChange={(val) => onUpdate({ title, description, isPublic, coverImage: val })}
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("titleRequired")}</Label>
                            <Input
                                value={title}
                                onChange={(e) => onUpdate({ title: e.target.value, description, coverImage, isPublic })}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("description")}</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => onUpdate({ title, description: e.target.value, coverImage, isPublic })}
                            />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                            <Label>{t("privacySetting")}</Label>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-slate-500">
                                    {isPublic ? t("public") : t("private")}
                                </span>
                                <Switch
                                    checked={!isPublic}
                                    onCheckedChange={(c) => onUpdate({ title, description, coverImage, isPublic: !c })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>{t("done")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
