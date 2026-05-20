"use client"

import { useEffect, useRef } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"
import { cn } from "@/lib/utils"

type Props = {
    text: string
    className?: string
    inline?: boolean
}

/** Plain prose (e.g. Thai answers) should not go through KaTeX — it renders as a single non-wrapping line. */
export function textHasLatexMarkup(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return false
    if (/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/.test(trimmed)) return true
    if (/\\(?:frac|sqrt|sum|int|left|right|begin|end|text|mathrm|mathbf|overline|underline|cdot|times|div|pm|leq|geq|neq|approx|infty|alpha|beta|gamma|theta|pi)\b/.test(trimmed)) {
        return true
    }
    return false
}

const PLAIN_TEXT_CLASS = "whitespace-normal break-words [overflow-wrap:anywhere]"

export function MathRender({ text, className, inline = false }: Props) {
    const containerRef = useRef<HTMLSpanElement>(null)
    const isPlainText = !textHasLatexMarkup(text)

    useEffect(() => {
        if (isPlainText || !containerRef.current) return

        try {
            katex.render(text, containerRef.current, {
                throwOnError: false,
                displayMode: !inline,
                errorColor: "#cc0000",
            })
        } catch (e) {
            console.error("KaTeX Render Error", e)
            containerRef.current.innerText = text
        }
    }, [text, inline, isPlainText])

    if (isPlainText) {
        return (
            <span className={cn(PLAIN_TEXT_CLASS, className)}>
                {text}
            </span>
        )
    }

    return (
        <span
            ref={containerRef}
            className={cn(
                inline
                    ? "inline-block max-w-full whitespace-normal break-words [overflow-wrap:anywhere]"
                    : "block max-w-full overflow-x-auto whitespace-normal break-words [overflow-wrap:anywhere] [&_.katex-display]:!whitespace-normal [&_.katex-display]:!text-left",
                className
            )}
        />
    )
}
