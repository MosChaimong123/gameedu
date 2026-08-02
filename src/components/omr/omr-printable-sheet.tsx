"use client";

import { useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import {
  OMR_ANSWER_GEOMETRY,
  OMR_BUBBLE_RADIUS,
  OMR_CANONICAL_HEIGHT,
  OMR_CANONICAL_WIDTH,
  OMR_OPTION_LABELS_TH,
  OMR_REGISTRATION_MARKERS,
  OMR_STUDENT_ID_GEOMETRY,
  OMR_TEMPLATE_ID,
} from "@/lib/omr-template";

interface OMRPrintableSheetProps {
  quizTitle?: string;
}

const OPTION_HEADER_QUESTIONS = new Set([1, 11, 21, 31, 41]);

export function OMRPrintableSheet({ quizTitle }: OMRPrintableSheetProps) {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const resolvedTitle = quizTitle?.trim() || t("omrPrintableDefaultQuizTitle");

  const downloadImage = async () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(OMR_CANONICAL_WIDTH * 2));
    clone.setAttribute("height", String(OMR_CANONICAL_HEIGHT * 2));
    const source = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OMR_CANONICAL_WIDTH * 2;
      canvas.height = OMR_CANONICAL_HEIGHT * 2;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const link = document.createElement("a");
      const safeName = resolvedTitle.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 80);
      link.href = canvas.toDataURL("image/png", 1);
      link.download = `OMR_${OMR_TEMPLATE_ID}_${safeName}.png`;
      link.click();
      URL.revokeObjectURL(url);
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  };

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <Button
        onClick={downloadImage}
        className="h-14 rounded-2xl bg-slate-900 px-8 text-base font-black text-white shadow-xl transition-transform hover:scale-[1.02] hover:bg-brand-purple"
      >
        <Download className="mr-2 h-5 w-5" />
        {t("omrPrintableDownloadPng")}
      </Button>

      <div className="w-full overflow-auto rounded-[2rem] border border-slate-200 bg-slate-100 p-3 shadow-inner sm:p-6">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${OMR_CANONICAL_WIDTH} ${OMR_CANONICAL_HEIGHT}`}
          role="img"
          aria-label={t("omrTemplatesPreviewTitle")}
          className="mx-auto block h-auto w-full max-w-[794px] bg-white shadow-xl"
          style={{ fontFamily: '"Noto Sans Thai", "Tahoma", sans-serif' }}
        >
          <rect width={OMR_CANONICAL_WIDTH} height={OMR_CANONICAL_HEIGHT} fill="white" />

          {OMR_REGISTRATION_MARKERS.map((marker) => (
            <rect
              key={marker.id}
              x={marker.x - marker.size / 2}
              y={marker.y - marker.size / 2}
              width={marker.size}
              height={marker.size}
              rx="1"
              fill="black"
            />
          ))}

          <g fill="none" stroke="black" strokeWidth="3">
            <rect x="180" y="78" width="650" height="112" rx="28" />
            <line x1="180" y1="132" x2="830" y2="132" />
            <line x1="290" y1="78" x2="290" y2="132" />
            <line x1="620" y1="78" x2="620" y2="132" />
            <line x1="680" y1="78" x2="680" y2="132" />
            <line x1="260" y1="132" x2="260" y2="190" />
            <line x1="505" y1="132" x2="505" y2="190" />
            <line x1="565" y1="132" x2="565" y2="190" />
          </g>

          <g fill="black" fontSize="20" fontWeight="700">
            <text x="198" y="114">{t("omrSheetLabelFullName")}</text>
            <text x="635" y="114">{t("omrSheetDate")}</text>
            <text x="198" y="168">{t("omrSheetLabelClass")}</text>
            <text x="518" y="168">{t("omrSheetLabelSeatNo")}</text>
            <text x="180" y="220">{t("omrSheetStudentId")}</text>
          </g>

          <g fill="none" stroke="#d7dce2" strokeWidth="2">
            {Array.from({ length: 5 }, (_, index) => (
              <rect key={index} x={176 + index * 38} y="228" width="38" height="38" />
            ))}
          </g>

          <g fill="black" fontSize="18" fontWeight="700">
            {OMR_STUDENT_ID_GEOMETRY.flatMap((column) =>
              column.bubbles.map((bubble) => (
                <g key={`student-${column.position}-${bubble.value}`}>
                  {column.position === 0 ? (
                    <text x={bubble.x - 38} y={bubble.y + 6} textAnchor="middle">
                      {bubble.value}
                    </text>
                  ) : null}
                  <circle
                    cx={bubble.x}
                    cy={bubble.y}
                    r={OMR_BUBBLE_RADIUS}
                    fill="white"
                    stroke="#aeb5bd"
                    strokeWidth="2"
                  />
                </g>
              ))
            )}
          </g>

          {OMR_ANSWER_GEOMETRY.map((geometry) => (
            <g key={geometry.question}>
              {OPTION_HEADER_QUESTIONS.has(geometry.question) ? (
                <g fill="black" fontSize="19" fontWeight="700">
                  {geometry.bubbles.map((bubble, optionIndex) => (
                    <text
                      key={`header-${geometry.question}-${bubble.value}`}
                      x={bubble.x}
                      y={geometry.bubbles[0].y - 34}
                      textAnchor="middle"
                    >
                      {OMR_OPTION_LABELS_TH[optionIndex]}
                    </text>
                  ))}
                </g>
              ) : null}
              <text
                x={geometry.label.x}
                y={geometry.label.y}
                fill="black"
                fontSize="20"
                fontWeight="700"
                textAnchor="middle"
              >
                {geometry.question}
              </text>
              {geometry.bubbles.map((bubble) => (
                <circle
                  key={`${geometry.question}-${bubble.value}`}
                  cx={bubble.x}
                  cy={bubble.y}
                  r={OMR_BUBBLE_RADIUS}
                  fill="white"
                  stroke="#aeb5bd"
                  strokeWidth="2"
                />
              ))}
            </g>
          ))}

          <g fill="#5d6670" fontSize="11" fontWeight="700">
            <text x="500" y="1380" textAnchor="middle">
              {resolvedTitle} • {OMR_TEMPLATE_ID}
            </text>
            <text x="500" y="1397" textAnchor="middle">
              {t("omrSheetPrintInstruction")}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
