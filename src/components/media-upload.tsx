"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import { Link as LinkIcon, Loader2, Music4, Upload, Video, X } from "lucide-react";
import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages";
import type { AppErrorCode } from "@/lib/api-error";
import { cn } from "@/lib/utils";

const MEDIA_UPLOAD_ERR_KEYS: Partial<Record<AppErrorCode, string>> = {
  AUTH_REQUIRED: "boardUploadErrAuth",
  NO_FILE: "boardUploadErrNoFile",
  UNSUPPORTED_FILE_TYPE: "boardUploadErrUnsupported",
  FILE_TOO_LARGE: "boardUploadErrTooLarge",
};

type Props = {
  value?: string;
  mediaType: "audio" | "video";
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function MediaUpload({ value = "", mediaType, onChange, disabled = false }: Props) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const message = await getLocalizedErrorMessageFromResponse(
        res,
        "boardUploadFail",
        t,
        language,
        { overrideTranslationKeys: MEDIA_UPLOAD_ERR_KEYS }
      );
      throw new Error(message);
    }

    return (await res.json()) as { url: string; type: string };
  }

  async function processFile(file: File) {
    const expectedPrefix = `${mediaType}/`;
    if (!file.type.startsWith(expectedPrefix)) {
      toast({
        title: t("error"),
        description: t("assignmentWorksheetMediaTypeError", { type: mediaType }),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFile(file);
      onChange(result.url);
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("boardUploadFail"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-dashed p-4",
          value ? "border-slate-200 bg-white" : "border-slate-300 bg-slate-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={mediaType === "audio" ? "audio/*" : "video/*"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void processFile(file);
            }
            e.currentTarget.value = "";
          }}
          disabled={disabled || uploading}
        />

        {value ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                {mediaType === "audio" ? <Music4 className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                <span>{t("assignmentWorksheetMediaReadyLabel", { type: mediaType })}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange("")}
                disabled={disabled || uploading}
                className="text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {mediaType === "audio" ? (
              <audio controls src={value} className="w-full" />
            ) : (
              <video controls src={value} className="w-full rounded-lg bg-black/90" />
            )}
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <div className="text-sm font-semibold text-slate-700">
              {t("assignmentWorksheetMediaUploadLabel", { type: mediaType })}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {t("uploadFile")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || uploading}
                onClick={() => setIsLinkDialogOpen(true)}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {t("uploadUrl")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assignmentWorksheetMediaLinkTitle", { type: mediaType })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("assignmentWorksheetMediaLinkLabel")}</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder={t("assignmentWorksheetMediaLinkPlaceholder")}
              disabled={disabled}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onChange(linkUrl.trim());
                setLinkUrl("");
                setIsLinkDialogOpen(false);
              }}
              disabled={disabled || linkUrl.trim().length === 0}
            >
              {t("imageUploadImport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
