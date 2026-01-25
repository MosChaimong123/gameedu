"use client"

import { useEffect, useRef } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

type Props = {
    text: string
    className?: string
    inline?: boolean
}

export function MathRender({ text, className, inline = false }: Props) {
    const containerRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        if (containerRef.current) {
            try {
                // Determine if we should render as display mode or inline
                // For this simple implementation, we try to render the whole string.
                // However, KaTeX expects pure LaTeX. 
                // Creating a mixed mode parser (like text + $math$) is complex.
                // Let's assume for the "Equation Preview" we just try to render it.
                // Or we can just use renderToString with throwOnError: false

                katex.render(text, containerRef.current, {
                    throwOnError: false,
                    displayMode: !inline,
                    errorColor: "#cc0000",
                })
            } catch (e) {
                console.error("KaTeX Render Error", e)
                containerRef.current.innerText = text
            }
        }
    }, [text, inline])

    return <span ref={containerRef} className={className} />
}
