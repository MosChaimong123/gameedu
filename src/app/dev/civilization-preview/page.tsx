import { notFound } from "next/navigation";
import { CivilizationPreviewClient } from "@/components/civilization-idle/civilization-preview-client";

export default async function CivilizationPreviewPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { mode } = await searchParams;
  const previewMode = mode === "bronze" || mode === "industrial" || mode === "information" || mode === "space" || mode === "prestige" || mode === "transition" || mode === "offline" ? mode : "stone";
  return <CivilizationPreviewClient mode={previewMode} />;
}
