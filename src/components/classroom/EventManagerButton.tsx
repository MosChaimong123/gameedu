"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, Trash2, Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import {
  getLocalizedMessageFromApiErrorBody,
  tryLocalizeFetchNetworkFailureMessage,
} from "@/lib/ui-error-messages";
import {
    getThemeAccentColor,
    getThemeAccentRgba,
    getThemeBgStyle,
    getThemeHorizontalBgClass,
} from "@/lib/classroom-utils";
import { gamificationToolbarButtonClassName } from "./gamification-toolbar-styles";

interface ClassEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  multiplier: number;
  startAt: string;
  endAt: string;
  active: boolean;
}

const EVENT_ICONS = ["🏐", "🔥", "💅", "🌟", "🎉", "🎯", "🚀", "🌈", "💎", "👏", "🎊", "🌙"];

const EVENT_TYPE_DEFS = [
  { value: "GOLD_BOOST", labelKey: "classroomEventTypeGoldX2", multiplier: 2 },
  { value: "GOLD_BOOST_3", labelKey: "classroomEventTypeGoldX3", multiplier: 3 },
  { value: "CUSTOM", labelKey: "classroomEventTypeCustom", multiplier: 1 },
] as const;

export function EventManagerButton({ classId, theme = "" }: { classId: string; theme?: string | null }) {
  const { t, language } = useLanguage();
  const accent = getThemeAccentColor(theme);
  const dateLocale = language === "th" ? "th-TH" : "en-US";
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClassEvent | null>(null);
  const { toast } = useToast();

  const eventTypes = useMemo(
    () => EVENT_TYPE_DEFS.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t],
  );

  const [form, setForm] = useState({
    title: "",
    description: "",
    icon: "🏐",
    type: "GOLD_BOOST",
    multiplier: "2",
    startAt: new Date().toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString().slice(0, 16),
  });

  const loadEvents = useCallback(async () => {
    const res = await fetch(`/api/classrooms/${classId}/events`);
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
  }, [classId]);

  useEffect(() => {
    if (open) {
      void loadEvents();
    }
  }, [open, loadEvents]);

  const handleTypeChange = (type: string) => {
    const preset = eventTypes.find((item) => item.value === type);
    setForm((current) => ({
      ...current,
      type,
      multiplier: String(preset?.multiplier || 1),
    }));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          multiplier: Number(form.multiplier),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast({
            title: t("classroomEventCreateSuccessTitle"),
            description: form.title,
          });
          setShowForm(false);
          setForm((current) => ({ ...current, title: "", description: "" }));
          await loadEvents();
        } else {
          throw new Error(
            getLocalizedMessageFromApiErrorBody(data, t, {
              fallbackTranslationKey: "apiError_INTERNAL_ERROR",
            })
          );
        }
      } else {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          getLocalizedMessageFromApiErrorBody(errorData, t, {
            fallbackTranslationKey: "apiError_INTERNAL_ERROR",
          })
        );
      }
    } catch (error) {
      console.error("Error creating event:", error);
      const raw = error instanceof Error ? error.message : null;
      const networkMessage = tryLocalizeFetchNetworkFailureMessage(raw, t);
      toast({
        title: t("error"),
        description: networkMessage ?? (error instanceof Error ? error.message : t("apiError_INTERNAL_ERROR")),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    await fetch(`/api/classrooms/${classId}/events`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: deleteTarget.id }),
    });

    toast({
      title: t("classroomEventDeleteSuccessTitle"),
      description: t("classroomEventDeleteSuccessDesc", { title: deleteTarget.title }),
    });
    setDeleteTarget(null);
    await loadEvents();
  };

  const now = new Date();
  const isActive = (event: ClassEvent) =>
    new Date(event.startAt) <= now && new Date(event.endAt) >= now;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className={cn(gamificationToolbarButtonClassName, "gap-1.5")}>
          <Zap className="h-4 w-4 shrink-0 opacity-95" />
          {t("classroomEventSpecialButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[95vw] flex-col overflow-y-auto rounded-3xl border-0 bg-[#F8FAFC] p-6 shadow-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-black text-slate-800">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-inner",
                getThemeHorizontalBgClass(theme)
              )}
              style={getThemeBgStyle(theme)}
            >
              <Zap className="h-5 w-5" />
            </span>
            {t("classroomEventManageTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <Button
            onClick={() => setShowForm((value) => !value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border-0 text-sm font-black text-white shadow-md transition-opacity hover:opacity-90",
              getThemeHorizontalBgClass(theme)
            )}
            style={getThemeBgStyle(theme)}
          >
            <Plus className="h-4 w-4" />
            {t("classroomEventCreateNew")}
          </Button>

          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <GlassCard
                  className="space-y-4 border p-4"
                  style={{
                    borderColor: getThemeAccentRgba(theme, 0.28),
                    backgroundColor: getThemeAccentRgba(theme, 0.06),
                  }}
                >
                  <div className="flex flex-wrap gap-2">
                    {EVENT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, icon }))}
                        className={cn(
                          "rounded-xl border-2 p-1.5 text-xl transition-all",
                          form.icon === icon ? "scale-110" : "border-transparent hover:border-slate-200"
                        )}
                        style={
                          form.icon === icon
                            ? {
                                borderColor: accent,
                                backgroundColor: getThemeAccentRgba(theme, 0.12),
                              }
                            : undefined
                        }
                      >
                        {icon}
                      </button>
                    ))}
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{t("classroomEventTypeLabel")}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {eventTypes.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => handleTypeChange(item.value)}
                          className={cn(
                            "rounded-xl border-2 p-2 text-xs font-black transition-all",
                            form.type === item.value ? "" : "border-slate-100 bg-white hover:border-slate-200"
                          )}
                          style={
                            form.type === item.value
                              ? {
                                  borderColor: accent,
                                  backgroundColor: getThemeAccentRgba(theme, 0.1),
                                }
                              : undefined
                          }
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{t("classroomEventNameLabel")}</Label>
                      <Input
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder={t("classroomEventNamePlaceholder")}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{t("classroomEventMultiplierLabel")}</Label>
                      <Input
                        type="number"
                        value={form.multiplier}
                        onChange={(event) => setForm((current) => ({ ...current, multiplier: event.target.value }))}
                        min="1"
                        max="10"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{t("classroomEventDescriptionLabel")}</Label>
                    <Input
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder={t("classroomEventDescriptionPlaceholder")}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{t("classroomEventStartLabel")}</Label>
                      <Input
                        type="datetime-local"
                        value={form.startAt}
                        onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))}
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{t("classroomEventEndLabel")}</Label>
                      <Input
                        type="datetime-local"
                        value={form.endAt}
                        onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))}
                        className="rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreate}
                      disabled={saving || !form.title.trim()}
                      className={cn(
                        "rounded-xl border-0 text-xs font-black text-white transition-opacity hover:opacity-90",
                        getThemeHorizontalBgClass(theme)
                      )}
                      style={getThemeBgStyle(theme)}
                    >
                      {saving ? t("classroomEventCreating") : t("classroomEventCreateSubmit")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl text-xs font-black">
                      {t("cancel")}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm font-semibold text-slate-400">
                {t("classroomEventEmpty")}
              </div>
            ) : (
              events.map((event) => (
                <GlassCard key={event.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                      style={{ backgroundColor: getThemeAccentRgba(theme, 0.14) }}
                    >
                      {event.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-slate-800">{event.title}</p>
                        {isActive(event) && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500">{event.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(event.startAt).toLocaleString(dateLocale)} - {new Date(event.endAt).toLocaleString(dateLocale)}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 font-bold"
                          style={{
                            backgroundColor: getThemeAccentRgba(theme, 0.16),
                            color: accent,
                          }}
                        >
                          x{event.multiplier}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setDeleteTarget(event)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </GlassCard>
              ))
            )}
          </div>
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(value) => !value && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("classroomEventDeleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("classroomEventDeleteConfirmDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleDelete();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {t("classroomEventDeleteAction")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
