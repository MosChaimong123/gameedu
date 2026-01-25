"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/components/providers/language-provider"
import { Delete, Eraser, Check } from "lucide-react"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onInsert: (latex: string) => void
}

const SYMBOLS = {
    basic: [
        { label: "+", val: "+" },
        { label: "-", val: "-" },
        { label: "×", val: "\\times" },
        { label: "÷", val: "\\div" },
        { label: "=", val: "=" },
        { label: "≠", val: "\\neq" },
        { label: "±", val: "\\pm" },
        { label: "π", val: "\\pi" },
        { label: "x²", val: "^{2}" },
        { label: "√", val: "\\sqrt{}" },
        { label: ">", val: ">" },
        { label: "<", val: "<" },
        { label: "≥", val: "\\geq" },
        { label: "≤", val: "\\leq" },
        { label: "( )", val: "()" },
        { label: "[ ]", val: "[]" },
        { label: "{ }", val: "{}" },
        { label: "|x|", val: "| |" },

    ],
    greek: [
        { label: "α", val: "\\alpha" },
        { label: "β", val: "\\beta" },
        { label: "γ", val: "\\gamma" },
        { label: "δ", val: "\\delta" },
        { label: "ε", val: "\\epsilon" },
        { label: "θ", val: "\\theta" },
        { label: "λ", val: "\\lambda" },
        { label: "μ", val: "\\mu" },
        { label: "π", val: "\\pi" },
        { label: "ρ", val: "\\rho" },
        { label: "σ", val: "\\sigma" },
        { label: "τ", val: "\\tau" },
        { label: "φ", val: "\\phi" },
        { label: "ω", val: "\\omega" },
        { label: "Ω", val: "\\Omega" },
        { label: "Δ", val: "\\Delta" },
    ],
    advanced: [
        { label: "x/y", val: "\\frac{}{}" },
        { label: "xʸ", val: "^{}" },
        { label: "xₙ", val: "_{}" },
        { label: "∞", val: "\\infty" },
        { label: "∫", val: "\\int" },
        { label: "∑", val: "\\sum" },
        { label: "lim", val: "\\lim" },
        { label: "log", val: "\\log" },
        { label: "sin", val: "\\sin" },
        { label: "cos", val: "\\cos" },
        { label: "tan", val: "\\tan" },
        { label: "→", val: "\\rightarrow" },
    ]
}

export function MathKeyboard({ open, onOpenChange, onInsert }: Props) {
    const { t } = useLanguage()
    const [input, setInput] = useState("")

    const handleInsertSymbol = (val: string) => {
        // Simple append for now. Advanced logic would track cursor position.
        setInput(prev => prev + val)
    }

    const handleConfirm = () => {
        onInsert(input)
        setInput("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white select-none">
                <DialogHeader>
                    <DialogTitle className="text-center text-purple-600 font-bold text-xl drop-shadow-sm">Equation Editor</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Display Area */}
                    <div className="relative">
                        <Input
                            className="h-16 text-2xl font-mono text-center bg-slate-50 border-2 border-purple-200 focus-visible:ring-purple-500"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type or click symbols..."
                        />
                        {input && (
                            <button
                                onClick={() => setInput("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1"
                            >
                                <Delete className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Keyboard Tabs */}
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-purple-100 p-1 rounded-xl">
                            <TabsTrigger value="basic" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 font-bold rounded-lg">Basic</TabsTrigger>
                            <TabsTrigger value="greek" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 font-bold rounded-lg">Greek</TabsTrigger>
                            <TabsTrigger value="advanced" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 font-bold rounded-lg">Advanced</TabsTrigger>
                        </TabsList>

                        <div className="bg-slate-100 p-4 rounded-xl mt-2 min-h-[250px] border border-slate-200">
                            {Object.entries(SYMBOLS).map(([key, symbols]) => (
                                <TabsContent key={key} value={key} className="mt-0">
                                    <div className="grid grid-cols-6 gap-2">
                                        {symbols.map((s, i) => (
                                            <Button
                                                key={i}
                                                variant="outline"
                                                className="h-12 text-lg font-serif hover:bg-purple-100 hover:text-purple-700 hover:border-purple-300 transition-all active:scale-95"
                                                onClick={() => handleInsertSymbol(s.val)}
                                            >
                                                {s.label}
                                            </Button>
                                        ))}
                                    </div>
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="gap-2 sm:justify-center">
                    <Button variant="outline" className="w-full sm:w-1/3 font-bold" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button className="w-full sm:w-1/3 bg-purple-600 hover:bg-purple-700 font-bold" onClick={handleConfirm}>
                        <Check className="mr-2 h-4 w-4" /> Insert
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
