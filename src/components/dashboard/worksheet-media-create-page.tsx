"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileImage,
  FilePlus2,
  FileText,
  Loader2,
  PanelsTopLeft,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { WorksheetBuilder } from "@/components/classroom/worksheet-builder";
import { createTeachingMedia } from "@/lib/actions/teaching-media-actions";
import {
  buildDefaultWorksheetData,
  validateWorksheetData,
  type WorksheetData,
  type WorksheetPage,
} from "@/lib/worksheet-schema";
import {
  countWorksheetItems,
  hasWorksheetBackgrounds,
  sumWorksheetMaxScore,
} from "@/lib/worksheet-assignment";
import {
  clampWorksheetPageHeight,
  clampWorksheetPageWidth,
} from "@/lib/worksheet-page-size";

type CreateStep = "import" | "design";

async function uploadFileAsset(file: Blob, fileName: string) {
  const formData = new FormData();
  formData.append("file", file, fileName);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");
  }

  return (await res.json()) as {
    url: string;
    fileName: string;
    originalFileName?: string;
    size: number;
    type: string;
  };
}

function buildWorksheetFromPages(
  pages: WorksheetPage[],
  source: WorksheetData["source"]
): WorksheetData {
  return {
    ...buildDefaultWorksheetData(),
    source,
    pages,
  };
}

async function getImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth || 1200,
          height: image.naturalHeight || 1600,
        });
      };
      image.onerror = () => reject(new Error("อ่านขนาดรูปภาพไม่สำเร็จ"));
      image.src = objectUrl;
    });

    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function WorksheetMediaCreatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [worksheetData, setWorksheetData] = useState<WorksheetData>(buildDefaultWorksheetData());
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState<"pdf" | "image" | null>(null);
  const [step, setStep] = useState<CreateStep>("import");

  const worksheetReady =
    countWorksheetItems(worksheetData) > 0 &&
    hasWorksheetBackgrounds(worksheetData) &&
    validateWorksheetData(worksheetData).ok;

  const sourceSummary =
    worksheetData.source.originalFileName ||
    (worksheetData.source.type === "pdf" ? "ไฟล์ PDF" : "รูปภาพใบงาน");

  async function handleImportPdf(file: File) {
    setImporting("pdf");
    try {
      const pdfUpload = await uploadFileAsset(file, file.name);
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url
      ).toString();

      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data: fileBytes }).promise;
      const nextPages: WorksheetPage[] = [];

      for (let index = 1; index <= pdf.numPages; index += 1) {
        const pdfPage = await pdf.getPage(index);
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("แปลง PDF เป็นภาพไม่สำเร็จ");
        }

        await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;

        const imageBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("แปลงหน้า PDF เป็นภาพไม่สำเร็จ"));
              return;
            }
            resolve(blob);
          }, "image/png");
        });

        const imageUpload = await uploadFileAsset(imageBlob, `${file.name}-page-${index}.png`);
        nextPages.push({
          id: `page-${crypto.randomUUID()}`,
          pageNumber: index,
          backgroundUrl: imageUpload.url,
          width: clampWorksheetPageWidth(canvas.width),
          height: clampWorksheetPageHeight(canvas.height),
          items: [],
        });
      }

      setWorksheetData(
        buildWorksheetFromPages(nextPages, {
          type: "pdf",
          url: pdfUpload.url,
          originalFileName: pdfUpload.originalFileName ?? file.name,
          pageCount: nextPages.length,
        })
      );
      setStep("design");
      toast({
        title: "นำเข้าใบงานสำเร็จ",
        description: `แปลง PDF เป็น ${nextPages.length} หน้าแล้ว พร้อมตั้งค่าใบงานต่อได้เลย`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "นำเข้า PDF ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
      });
    } finally {
      setImporting(null);
    }
  }

  async function handleImportImage(file: File) {
    setImporting("image");
    try {
      const [imageUpload, dimensions] = await Promise.all([
        uploadFileAsset(file, file.name),
        getImageDimensions(file),
      ]);

      setWorksheetData(
        buildWorksheetFromPages(
          [
            {
              id: `page-${crypto.randomUUID()}`,
              pageNumber: 1,
              backgroundUrl: imageUpload.url,
              width: clampWorksheetPageWidth(dimensions.width),
              height: clampWorksheetPageHeight(dimensions.height),
              items: [],
            },
          ],
          {
            type: "image",
            url: imageUpload.url,
            originalFileName: imageUpload.originalFileName ?? file.name,
            pageCount: 1,
          }
        )
      );
      setStep("design");
      toast({
        title: "นำเข้ารูปภาพสำเร็จ",
        description: "พร้อมวางช่องคำตอบและจัดตำแหน่งใบงานต่อได้เลย",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "นำเข้ารูปภาพไม่สำเร็จ",
        description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
      });
    } finally {
      setImporting(null);
    }
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedSubject = subject.trim();
    const trimmedGradeLevel = gradeLevel.trim();

    if (!trimmedTitle) {
      toast({
        variant: "destructive",
        title: "กรุณาตั้งชื่อใบงาน",
        description: "ชื่อใบงานจะใช้ค้นหาในคลังสื่อและเลือกไปมอบหมายภายหลัง",
      });
      return;
    }

    if (!worksheetReady) {
      toast({
        variant: "destructive",
        title: "ใบงานยังไม่พร้อม",
        description: "เพิ่มพื้นหลังและช่องคำตอบอย่างน้อย 1 จุดก่อนบันทึกเข้าคลัง",
      });
      return;
    }

    const metadataParts = [trimmedSubject, trimmedGradeLevel].filter(Boolean);
    const metadataSummary = metadataParts.length > 0 ? ` | ${metadataParts.join(" | ")}` : "";

    setSaving(true);
    try {
      await createTeachingMedia({
        type: "worksheet",
        title: trimmedTitle,
        description: `ใบงานโต้ตอบ ${countWorksheetItems(worksheetData)} จุดตอบ คะแนนรวม ${sumWorksheetMaxScore(
          worksheetData
        )}${metadataSummary}`,
        worksheetData,
        tags: ["ใบงานโต้ตอบ", ...metadataParts],
        source: "media-library",
      });

      toast({
        title: "บันทึกใบงานเข้าคลังแล้ว",
        description: trimmedTitle,
      });
      router.push("/dashboard/media-library?type=worksheet");
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "บันทึกใบงานไม่สำเร็จ",
        description: error instanceof Error ? error.message : "ลองใหม่อีกครั้ง",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-slate-50">
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={saving || importing !== null}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportPdf(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={saving || importing !== null}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportImage(file);
          }
          event.currentTarget.value = "";
        }}
      />

      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex flex-col gap-4 px-4 py-4 xl:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
                onClick={() => router.push("/dashboard/media-library?type=worksheet")}
                aria-label="กลับคลังสื่อ"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-xs font-black text-fuchsia-700">
                  <PanelsTopLeft className="h-4 w-4" />
                  สร้างใบงาน
                </div>
                <h1 className="truncate text-2xl font-black text-slate-900">สร้างใบงานเข้าคลังสื่อ</h1>
                <p className="text-sm font-medium text-slate-500">
                  ขั้นแรกเลือกไฟล์ต้นฉบับก่อน แล้วค่อยจัดวางคำตอบบนใบงานแบบเต็มจอในขั้นถัดไป
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  step === "import" ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                1. เลือกไฟล์ใบงาน
              </div>
              <div
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  step === "design" ? "bg-fuchsia-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                2. ตั้งค่าใบงาน
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,380px)_180px_140px_auto] lg:items-end">
              <div className="min-w-0">
                <Label htmlFor="worksheet-title" className="text-xs font-black text-slate-600">
                  ชื่อใบงาน
                </Label>
                <Input
                  id="worksheet-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="เช่น ใบงานหน่วยที่ 1"
                  maxLength={180}
                  className="mt-1 h-11 rounded-xl bg-white"
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="worksheet-subject" className="text-xs font-black text-slate-600">
                  วิชา
                </Label>
                <Input
                  id="worksheet-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="เช่น ฟิสิกส์"
                  maxLength={120}
                  className="mt-1 h-11 rounded-xl bg-white"
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="worksheet-grade" className="text-xs font-black text-slate-600">
                  ชั้น
                </Label>
                <Input
                  id="worksheet-grade"
                  value={gradeLevel}
                  onChange={(event) => setGradeLevel(event.target.value)}
                  placeholder="เช่น ม.4"
                  maxLength={40}
                  className="mt-1 h-11 rounded-xl bg-white"
                />
              </div>
              {step === "design" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => setStep("import")}
                  disabled={saving}
                >
                  เปลี่ยนไฟล์ต้นฉบับ
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {step === "design" ? (
                <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 px-3 py-2 text-xs font-black text-fuchsia-700">
                  {countWorksheetItems(worksheetData)} จุดตอบ • {sumWorksheetMaxScore(worksheetData)} คะแนน
                </div>
              ) : null}
              <Button
                type="button"
                disabled={saving || step !== "design"}
                onClick={() => void handleSave()}
                className="h-11 rounded-xl font-black"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                บันทึกเข้าคลัง
              </Button>
            </div>
          </div>
        </div>
      </div>

      {step === "import" ? (
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-[28px] border border-fuchsia-100 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900">ขั้นที่ 1 เลือกไฟล์ใบงาน</h2>
              <p className="mt-2 text-sm text-slate-500">
                รองรับไฟล์ PDF สำหรับหลายหน้า หรือรูปภาพสำหรับใบงานหน้าเดียว
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <button
                type="button"
                disabled={saving || importing !== null}
                onClick={() => pdfInputRef.current?.click()}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-fuchsia-300 hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700">
                  {importing === "pdf" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6" />}
                </div>
                <div className="text-lg font-black text-slate-900">นำเข้า PDF</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  เหมาะกับใบงานหลายหน้า ระบบจะแปลงแต่ละหน้าเป็นพื้นหลังให้พร้อมจัดวางคำตอบ
                </p>
              </button>

              <button
                type="button"
                disabled={saving || importing !== null}
                onClick={() => imageInputRef.current?.click()}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-fuchsia-300 hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  {importing === "image" ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <FileImage className="h-6 w-6" />
                  )}
                </div>
                <div className="text-lg font-black text-slate-900">นำเข้ารูปภาพ</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  เหมาะกับใบงานหน้าเดียว เช่น PNG หรือ JPG แล้วไปต่อในหน้าตั้งค่าใบงานได้ทันที
                </p>
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              เมื่อเลือกไฟล์แล้ว ระบบจะพาไปขั้นที่ 2 อัตโนมัติ เพื่อจัดวางช่องคำตอบบนใบงานแบบเต็มจอ
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-5 xl:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-fuchsia-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700">
              {worksheetData.source.type === "pdf" ? (
                <FileText className="h-5 w-5" />
              ) : (
                <FileImage className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-slate-900">{sourceSummary}</div>
              <div className="text-xs font-medium text-slate-500">
                {worksheetData.source.type === "pdf"
                  ? `${worksheetData.pages.length} หน้า`
                  : "รูปภาพ 1 หน้า"}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={saving}
              onClick={() => setStep("import")}
            >
              <FilePlus2 className="mr-2 h-4 w-4" />
              เปลี่ยนไฟล์
            </Button>
          </div>

          <div className="rounded-[28px] border border-fuchsia-100 bg-fuchsia-50/60 p-3 shadow-sm xl:p-4">
            <WorksheetBuilder
              value={worksheetData}
              onChange={setWorksheetData}
              disabled={saving}
              layoutMode="immersive"
              allowSourceImport={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
