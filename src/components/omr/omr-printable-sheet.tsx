"use client"

import React, { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import html2canvas from "html2canvas"

interface OMRPrintableSheetProps {
    type: "20" | "50" | "80"
    quizTitle?: string
}

export function OMRPrintableSheet({ type, quizTitle = "General Quiz" }: OMRPrintableSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null)

    const downloadImage = async () => {
        if (!sheetRef.current) return

        // Temporarily reset scale for perfect capture
        const originalScale = sheetRef.current.style.scale
        const originalTransform = sheetRef.current.style.transform
        
        const canvas = await html2canvas(sheetRef.current, {
            scale: 3, 
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: 794, // 210mm at 96dpi
            windowHeight: 1123, // 297mm at 96dpi
            onclone: (clonedDoc) => {
                const element = clonedDoc.getElementById('printable-omr-sheet');
                if (element) {
                    element.style.scale = "1";
                    element.style.transform = "none";
                    element.style.boxShadow = "none";
                }
                
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    :root {
                        --background: 255 255 255 !important;
                        --foreground: 0 0 0 !important;
                        --primary: 0 0 0 !important;
                        --border: 0 0 0 !important;
                    }
                    #printable-omr-sheet {
                        background-color: #ffffff !important;
                    }
                    #printable-omr-sheet * {
                        color: #000000 !important;
                        border-color: #000000 !important;
                        text-shadow: none !important;
                        box-sizing: border-box !important;
                    }
                    /* Bubble Specific Reset - ONLY for bubbles */
                    .omr-bubble {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        overflow: visible !important;
                    }
                    .omr-bubble span {
                        line-height: 0 !important; 
                    }
                    /* Labels - use absolute vertical center-ish */
                    .omr-label {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        padding-top: 2px !important; /* Optical correction for Thai font descenders */
                    }
                    .text-slate-400 { color: #94a3b8 !important; }
                    .bg-slate-50 { background-color: #f8fafc !important; }
                `;
                clonedDoc.head.appendChild(style);
            }
        })

        const imgData = canvas.toDataURL("image/png", 1.0)
        const link = document.createElement('a')
        link.href = imgData
        link.download = `OMR_Sheet_${type}q_${quizTitle}.png`
        link.click()
    }

    const getColCount = () => {
        if (type === "20") return 2
        if (type === "50") return 3
        if (type === "80") return 4 // 80/4 = 20 rows, fits perfectly
        return 2
    }
    const colCount = getColCount()

    // Mathematical Centering Helper (SVG)
    const SVGBubble = ({ text, size, isID = false }: { text: string, size: string, isID?: boolean }) => {
        // Calculate pixel size for the SVG container
        const pxSize = size.includes('w-6') ? 24 : size.includes('w-5') ? 20 : size.includes('w-3.5') ? 14 : 20;
        
        return (
            <svg 
                width={pxSize} 
                height={pxSize} 
                viewBox="0 0 100 100" 
                className={size}
            >
                <circle 
                    cx="50" 
                    cy="50" 
                    r="47" 
                    fill="none" 
                    stroke="black" 
                    strokeWidth="6" 
                />
                <text 
                    x="50" 
                    y={isID ? "52" : "55"} // Precise vertical balancing
                    textAnchor="middle" 
                    dominantBaseline="central" 
                    fontSize={isID ? "50" : "55"} 
                    fontFamily="sans-serif" 
                    fontWeight="900"
                    fill="black"
                    className="italic font-black"
                >
                    {text}
                </text>
            </svg>
        );
    };

    const renderBubbles = (count: number) => {
        const rows = []
        const options = ["A", "B", "C", "D", "E"]
        const questionsPerCol = Math.ceil(count / colCount)

        const bubbleSize = type === "20" ? "w-6 h-6" : "w-5 h-5"
        const numSize = type === "20" ? "w-6 text-base" : "w-5 text-sm"
        const textSize = type === "20" ? "text-[10px]" : "text-[8px]"

        for (let col = 0; col < colCount; col++) {
            const colQs = []
            for (let q = 1; q <= questionsPerCol; q++) {
                const qNum = col * questionsPerCol + q
                if (qNum > count) break

                colQs.push(
                    <div key={qNum} className={`flex items-center ${type === "20" ? "gap-1.5 mb-2.5" : "gap-1 mb-1.5"}`}>
                        <span className={`${numSize} font-black text-right`} style={{ color: 'rgb(0, 0, 0)' }}>{qNum}</span>
                        <div className={`flex ${type === "20" ? "gap-1.5" : "gap-1"}`}>
                            {options.map(opt => (
                                <SVGBubble key={opt} text={opt} size={bubbleSize} />
                            ))}
                        </div>
                    </div>
                )
            }
            rows.push(
                <div key={col} className={`flex flex-col ${type === "20" ? "gap-2.5 px-4" : "gap-1.5 px-2"} border-l-[2px] first:border-l-0`} style={{ borderLeftColor: 'rgb(241, 245, 249)' }}>
                    {/* Synchronized Header Row */}
                    <div className={`flex items-center ${type === "20" ? "gap-1.5 mb-2" : "gap-1 mb-1"}`}>
                        <div className={`${numSize}`} /> {/* Mirror number column spacer */}
                        <div className={`flex ${type === "20" ? "gap-1.5" : "gap-1"}`}>
                            {options.map(o => (
                                <div 
                                    key={o} 
                                    className={`${bubbleSize} flex items-center justify-center font-black text-black italic text-[11px] leading-none`}
                                >
                                    {o}
                                </div>
                            ))}
                        </div>
                    </div>
                    {colQs}
                </div>
            )
        }
        return rows
    }

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
            {/* Action Buttons */}
            <div className="flex gap-4">
                <Button 
                    onClick={downloadImage}
                    className="h-14 px-10 rounded-[2rem] bg-slate-900 text-white font-black text-lg shadow-xl hover:bg-purple-600 transition-all hover:scale-105"
                >
                    <Download className="mr-2 w-6 h-6" />
                    Download PNG Image
                </Button>
            </div>

            {/* A4 Sheet Container (Hidden/Printable) */}
            <div className="overflow-hidden bg-slate-100 p-8 rounded-[3rem] border border-slate-200 shadow-inner">
                <div 
                    ref={sheetRef}
                    id="printable-omr-sheet"
                    className="w-[210mm] h-[297mm] min-h-[297mm] bg-white p-[10mm] relative flex flex-col font-sans"
                    style={{ 
                        boxShadow: "0 0 20px rgba(0,0,0,0.05)",
                        scale: "0.65",
                        transformOrigin: "top center",
                        color: 'rgb(15, 23, 42)',
                        width: '210mm',
                        height: '297mm'
                    }}
                >
                    {/* A4 Dimension Indicator (Requested by User) */}
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-300 font-mono pointer-events-none">
                        A4 Paper Size: 210mm x 297mm
                    </div>
                    {/* Perspective Markers (Squares) */}
                    {/* Perspective Markers (Absolute edges of A4) */}
                    <div className="absolute top-2 left-2 w-10 h-10 bg-black z-10" />
                    <div className="absolute top-2 right-2 w-10 h-10 bg-black z-10" />
                    <div className="absolute bottom-2 left-2 w-10 h-10 bg-black z-10" />
                    <div className="absolute bottom-2 right-2 w-10 h-10 bg-black z-10" />
                    <div className="absolute top-1/2 left-2 -translate-y-1/2 w-10 h-10 bg-black z-10" />
                    <div className="absolute top-1/2 right-2 -translate-y-1/2 w-10 h-10 bg-black z-10" />

                    {/* Content Padder (Strictly constrained to A4 safe area) */}
                    <div className="flex-1 flex flex-col px-10 py-4 border-2" style={{ borderColor: 'rgb(248, 250, 252)' }}>
                        {/* Header Row (Name & ID) - Compact */}
                        <div className="mb-4 flex gap-6 items-start">
                            {/* Header Box (Compressed) */}
                            <div className="flex-1">
                                <div className="w-full border-[3px] rounded-xl overflow-hidden shadow-sm" style={{ borderColor: 'rgb(0, 0, 0)' }}>
                                    <div className="flex border-b-[3px]" style={{ borderBottomColor: 'rgb(0, 0, 0)' }}>
                                        <div className="px-4 py-2.5 font-black text-base border-r-[3px] min-w-32 bg-slate-50 omr-label" style={{ backgroundColor: 'rgb(241, 245, 249)', borderColor: 'rgb(0, 0, 0)' }}>ชื่อ - สกุล</div>
                                        <div className="flex-1"></div>
                                    </div>
                                    <div className="flex text-sm">
                                        <div className="px-4 py-1.5 font-black border-r-[3px] min-w-32 bg-slate-50 omr-label" style={{ backgroundColor: 'rgb(241, 245, 249)', borderColor: 'rgb(0, 0, 0)' }}>ชั้น</div>
                                        <div className="flex-1 border-r-[3px]" style={{ borderRightColor: 'rgb(0, 0, 0)' }}></div>
                                        <div className="px-4 py-1.5 font-black min-w-32 bg-slate-50 omr-label" style={{ backgroundColor: 'rgb(241, 245, 249)' }}>เลขที่</div>
                                        <div className="flex-1"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Student ID Grid (Ultra Compact Header Row) */}
                            <div className="flex flex-col border-[2px] p-1.5 rounded-xl w-fit shrink-0 bg-white" style={{ borderColor: 'rgb(0, 0, 0)' }}>
                                <span className="text-[8px] font-black uppercase mb-1 text-center tracking-widest omr-label" style={{ color: 'rgb(0, 0, 0)' }}>Student ID</span>
                                <div className="flex gap-1.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex flex-col gap-0.5">
                                            <div className="w-4 h-5 border-[2px] rounded-sm mb-0.5 flex items-center justify-center font-black text-[10px]" style={{ borderColor: 'rgb(0, 0, 0)' }} />
                                            <div className="flex flex-col gap-0.5">
                                                {Array.from({ length: 10 }).map((_, n) => (
                                                    <SVGBubble key={n} text={n.toString()} size={type === "20" ? "w-5 h-5" : "w-3.5 h-3.5"} isID />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Middle Section: Questions (Tightened) */}
                        <div className="flex justify-center pt-0">
                            <div className="flex gap-4">
                                {renderBubbles(parseInt(type))}
                            </div>
                        </div>

                        {/* Bottom Row: Branding (Compact) */}
                        <div className="mt-auto pt-6 flex items-end justify-end">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end">
                                    <div className="font-black text-lg italic leading-none">GameEdu | Project</div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] mt-1">OMR PAPER</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
