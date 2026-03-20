"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, RefreshCw, X, CheckCircle2, ScanLine } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface OMRScannerProps {
    onCapture: (imageData: string) => void
    onClose: () => void
}

export function OMRScanner({ onCapture, onClose }: OMRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isCapturing, setIsCapturing] = useState(false)

    useEffect(() => {
        startCamera()
        return () => stopCamera()
    }, [])

    const startCamera = async () => {
        try {
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
            setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งาน")
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
    }

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
            setIsCapturing(true)
            onCapture(imageData)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
            {/* Header Toolbar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <ScanLine className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-black text-lg">OMR Scanner</h2>
                        <p className="text-purple-300 text-xs font-bold uppercase tracking-widest">Alignment Mode</p>
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
                        <Button onClick={startCamera} className="bg-white text-black font-black">ลองใหม่อีกครั้ง</Button>
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
                            <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-purple-500 rounded-tl-xl shadow-[0_0_20px_purple]"></div>
                            <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-purple-500 rounded-tr-xl shadow-[0_0_20px_purple]"></div>
                            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-purple-500 rounded-bl-xl shadow-[0_0_20px_purple]"></div>
                            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-purple-500 rounded-br-xl shadow-[0_0_20px_purple]"></div>
                            
                            {/* Scanning Animation Line */}
                            <motion.div 
                                animate={{ top: ["10%", "90%"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_15px_purple] z-20"
                            />
                        </div>

                        {/* Status Label */}
                        <div className="absolute bottom-12 left-0 right-0 text-center">
                            <span className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase border border-white/10">
                                วางกระดาษให้ตรงรอยหยัก 4 มุม
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
                        <div className="w-14 h-14 rounded-full bg-slate-900 group-hover:bg-purple-600 transition-colors"></div>
                    </div>
                </button>

                <div className="w-12 h-12"></div> {/* Placeholder for balance */}
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}
