"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import { Button } from "@/components/ui/button"

export function OpenCVProvider({ children }: { children: React.ReactNode }) {
    const [cvStatus, setCvStatus] = useState<"loading" | "loaded" | "error">("loading")

    useEffect(() => {
        // Polling fallback
        const poll = setInterval(() => {
            // @ts-ignore
            if (window.cv && window.cv.Mat) {
                setCvStatus("loaded")
                clearInterval(poll)
            }
        }, 500)

        // Timeout after 45 seconds (OpenCV is very large)
        const timer = setTimeout(() => {
            if (cvStatus === "loading") {
                setCvStatus("error")
                clearInterval(poll)
            }
        }, 45000)

        return () => {
            clearInterval(poll)
            clearTimeout(timer)
        }
    }, [cvStatus])

    return (
        <>
            <Script 
                src="/opencv.js" 
                strategy="afterInteractive" 
                onLoad={() => {
                    // @ts-ignore
                    if (window.cv) {
                        // @ts-ignore
                        window.cv.onRuntimeInitialized = () => setCvStatus("loaded")
                        // Check if already ready
                        // @ts-ignore
                        if (window.cv.Mat) setCvStatus("loaded")
                    }
                }}
                onError={() => {
                    // Fallback to CDN if local fails
                    const script = document.createElement('script');
                    script.src = "https://unpkg.com/opencv.js@4.5.5/opencv.js";
                    script.async = true;
                    script.onload = () => {
                         // @ts-ignore
                        if (window.cv) {
                            // @ts-ignore
                            window.cv.onRuntimeInitialized = () => setCvStatus("loaded")
                            // @ts-ignore
                            if (window.cv.Mat) setCvStatus("loaded")
                        }
                    };
                    script.onerror = () => setCvStatus("error");
                    document.head.appendChild(script);
                }}
            />
            {cvStatus === "loaded" ? children : (
                <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
                    <div className={`w-16 h-16 border-4 ${cvStatus === "error" ? "border-red-500" : "border-purple-500 border-t-transparent animate-spin"} rounded-full mb-6 text-center flex items-center justify-center font-black`}>
                        {cvStatus === "error" && "!"}
                    </div>
                    
                    <h2 className="text-2xl font-black mb-2">
                        {cvStatus === "error" ? "โหลดระบบ AI ไม่สำเร็จ" : "กำลังเตรียมระบบ AI..."}
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">
                        {cvStatus === "error" ? "Connection Timeout or CDN Error" : "Loading Computer Vision Library (Large File)"}
                    </p>

                    {cvStatus === "error" && (
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <Button variant="outline" onClick={() => window.location.reload()} className="h-14 rounded-2xl border-2 font-black text-slate-800 bg-white">
                                ลองใหม่อีกครั้ง (Reload)
                            </Button>
                            <p className="text-[10px] text-slate-500 text-center font-medium uppercase tracking-widest">
                                * OpenCV.js has a large file size (8MB+).<br/>Please check your internet connection.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
