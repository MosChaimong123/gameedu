"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Clock, ExternalLink, Loader2, Search, Trash2, User as UserIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { deleteSet } from "../admin-actions";
import { useLanguage } from "@/components/providers/language-provider";

type AdminSet = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  creator: {
    name: string | null;
    email: string | null;
  };
};

export function SetList({ initialSets }: { initialSets: AdminSet[] }) {
  const [sets, setSets] = React.useState(initialSets);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminSet | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const filteredSets = sets.filter(
    (set) =>
      set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.creator.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.creator.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(deleteTarget.id);
    const result = await deleteSet(deleteTarget.id);
    setIsDeleting(null);

    if (result.success) {
      setSets((prev) => prev.filter((set) => set.id !== deleteTarget.id));
      toast({
        title: t("adminSetDeleteSuccessTitle"),
        description: t("adminSetDeleteSuccessDesc", { title: deleteTarget.title }),
      });
    } else {
      toast({
        title: t("adminSetDeleteFailTitle"),
        description: t(result.errorKey),
        variant: "destructive",
      });
    }

    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={t("adminSetSearchPlaceholder")}
          className="h-11 rounded-xl border-slate-200 pl-10"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSets.map((set) => (
          <div key={set.id} className="group space-y-4 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <BookOpen className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild title={t("adminSetViewTitle")}>
                  <Link href={`/dashboard/my-sets/preview/${set.id}`}>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setDeleteTarget(set)}
                  disabled={isDeleting === set.id}
                  title={t("adminSetDeleteTitle")}
                >
                  {isDeleting === set.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="line-clamp-1 font-bold text-slate-800">{set.title}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{set.description || t("noDescription")}</p>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-50 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Clock className="h-3 w-3" />
                {new Date(set.createdAt).toLocaleDateString("th-TH")}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <UserIcon className="h-3 w-3" />
                {set.creator.name || set.creator.email?.split("@")[0]}
              </div>
            </div>
          </div>
        ))}

        {filteredSets.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-200" />
            <p className="font-medium text-slate-400">{t("adminSetNoResults")}</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminSetDeleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminSetDeleteConfirmDesc", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isDeleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={!!isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting === deleteTarget?.id ? t("adminSetDeletePending") : t("adminSetDeleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
