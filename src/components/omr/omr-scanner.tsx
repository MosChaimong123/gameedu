"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, X, ScanLine } from "lucide-react"
import { motion } from "framer-motion"
import { useLanguage } from "@/components/providers/language-provider"
import { getOmrCameraErrorMessage, parseOmrScannerQaFlags } from "@/lib/omr-scanner-fallbacks"

interface OMRScannerProps {
    onCapture: (imageData: string) => void
    onClose: () => void
}

export function OMRScanner({ onCapture, onClose }: OMRScannerProps) {
    const { t } = useLanguage()
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [error, setError] = useState<string | null>(null)
    const startCamera = useCallback(async () => {
        try {
            const qaFlags = parseOmrScannerQaFlags(window.location.search)
            if (qaFlags.forceCameraError) {
                setError(getOmrCameraErrorMessage(null, t, qaFlags))
                return
            }
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: "environment", // Use back camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            })
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
            setStream(mediaStream)
            setError(null)
        } catch (err) {
            console.error("Error accessing camera:", err)
            setError(getOmrCameraErrorMessage(err, t))
        }
    }, [t])

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
    }, [stream])

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            void startCamera()
        })
        return () => {
            window.cancelAnimationFrame(frameId)
            stopCamera()
        }
    }, [startCamera, stopCamera])

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return
        
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.drawImage(video, 0, 0)
            const imageData = canvas.toDataURL("image/jpeg")
            onCapture(imageData)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
            {/* Header Toolbar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple shadow-lg shadow-brand-purple/25">
                        <ScanLine className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-black text-lg">{t("omrScannerHeader")}</h2>
                        <p className="text-xs font-bold uppercase tracking-widest text-brand-yellow/90">
                            {t("omrScannerAlignmentMode")}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
                    <X className="w-6 h-6" />
                </Button>
            </div>

            {/* Viewfinder Area */}
            <div className="relative w-full aspect-[3/4] max-w-lg bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl">
                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        <p className="text-red-400 font-bold text-lg mb-4">{error}</p>
                        <Button onClick={startCamera} className="bg-white text-black font-black">
                            {t("omrRetryButton")}
                        </Button>
                    </div>
                ) : (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        
                        {/* Overlay Alignment Guide */}
                        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                            {/* Target Corners */}
                            <div className="absolute left-4 top-4 h-12 w-12 rounded-tl-xl border-l-4 border-t-4 border-brand-purple shadow-[0_0_20px_rgb(145,50,225)]"></div>
                            <div className="absolute right-4 top-4 h-12 w-12 rounded-tr-xl border-r-4 border-t-4 border-brand-purple shadow-[0_0_20px_rgb(145,50,225)]"></div>
                            <div className="absolute bottom-4 left-4 h-12 w-12 rounded-bl-xl border-b-4 border-l-4 border-brand-purple shadow-[0_0_20px_rgb(145,50,225)]"></div>
                            <div className="absolute bottom-4 right-4 h-12 w-12 rounded-br-xl border-b-4 border-r-4 border-brand-purple shadow-[0_0_20px_rgb(145,50,225)]"></div>
                            
                            {/* Scanning Animation Line */}
                            <motion.div 
                                animate={{ top: ["10%", "90%"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute left-4 right-4 z-20 h-1 bg-gradient-to-r from-transparent via-brand-sky to-transparent shadow-[0_0_15px_rgb(145,50,225)]"
                            />
                        </div>

                        {/* Status Label */}
                        <div className="absolute bottom-12 left-0 right-0 text-center">
                            <span className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase border border-white/10">
                                {t("omrAlignCornersHint")}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-12 flex items-center gap-12">
                <button 
                    onClick={startCamera}
                    className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                >
                    <RefreshCw className="w-6 h-6" />
                </button>

                <button 
                    onClick={captureImage}
                    disabled={!!error || !stream}
                    className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95 transition-all group disabled:opacity-50"
                >
                    <div className="w-16 h-16 rounded-full border-4 border-black/5 flex items-center justify-center">
                        <div className="h-14 w-14 rounded-full bg-slate-900 transition-colors group-hover:bg-brand-purple"></div>
                    </div>
                </button>

                <div className="w-12 h-12"></div> {/* Placeholder for balance */}
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}
