import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { MathRender } from "@/components/math-render"
import { useLanguage } from "@/components/providers/language-provider"

type Props = {
    question: {
        id: string;
        question: string;

        options: string[];
        optionTypes?: string[];
        image?: string | null;
    };
    onAnswer: (index: number) => void;
    /** Disable answering, for example after submitting in Negamon Battle. */
    locked?: boolean;
}

export function QuestionCard({ question, onAnswer, locked = false }: Props) {
    const { t } = useLanguage();
    const colors = [
        "bg-red-500 border-red-700",
        "bg-blue-500 border-blue-700",
        "bg-amber-500 border-amber-700",
        "bg-green-500 border-green-700"
    ];

    const shapes = ["▲", "◆", "■", "●"];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto flex h-full min-h-0 w-full max-w-none flex-1 flex-col gap-2 sm:max-w-xl sm:gap-3"
        >
            {/* Question Text — capped height so answer grid can use the rest of the viewport */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-h-[min(38vh,14rem)] shrink-0 overflow-y-auto rounded-xl border-b-4 border-slate-200 bg-white p-3 text-center shadow-lg sm:max-h-[40vh] sm:p-6"
            >
                <h2 className="text-base font-bold text-slate-800 sm:text-xl md:text-2xl">
                    <MathRender text={question.question} className="block w-full text-center" />
                </h2>
                {question.image && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 sm:mt-4 rounded-lg overflow-hidden border-2 border-slate-100"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={question.image}
                            alt={t("questionImageAlt")}
                            className="h-32 w-full object-cover sm:h-48"
                        />
                    </motion.div>
                )}
            </motion.div>

            {/* Answer Grid — 2×2 fills remaining screen height on mobile */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 [grid-template-rows:repeat(2,minmax(0,1fr))] sm:gap-3"
            >
                {question.options.map((option, index) => (
                    <motion.button
                        key={index}
                        type="button"
                        disabled={locked}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={locked ? undefined : { scale: 1.02 }}
                        whileTap={locked ? undefined : { scale: 0.95 }}
                        className={cn(
                            "relative flex h-full min-h-0 w-full min-w-0 flex-col rounded-xl border-b-4 p-2 text-center font-bold text-white shadow-md group sm:p-3",
                            colors[index % 4],
                            locked && "pointer-events-none opacity-50"
                        )}
                        onClick={() => onAnswer(index)}
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="pointer-events-none absolute top-1 left-1 text-2xl opacity-20 sm:top-2 sm:left-2 sm:text-4xl"
                        >
                            {shapes[index % 4]}
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="relative z-10 flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain px-1 py-1.5 drop-shadow-md sm:px-2 sm:py-2"
                        >
                            {question.optionTypes?.[index] === "IMAGE" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={option}
                                    alt={t("optionImageAlt", { n: index + 1 })}
                                    className="max-h-full max-w-full rounded-md object-contain"
                                />
                            ) : (
                                <MathRender
                                    text={option}
                                    className="block w-full min-w-0 text-sm leading-snug sm:text-base md:text-lg"
                                />
                            )}
                        </motion.div>
                    </motion.button>
                ))}
            </motion.div>
        </motion.div>
    )
}
