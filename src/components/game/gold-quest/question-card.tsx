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
            className="flex min-h-0 w-full max-w-lg flex-1 flex-col mx-auto p-2 sm:p-4"
        >
            {/* Question Text */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-3 sm:mb-6 shrink-0 overflow-y-auto max-h-[40vh] sm:max-h-none rounded-xl border-b-4 border-slate-200 bg-white p-4 text-center shadow-lg sm:p-6"
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

            {/* Answer Grid — scroll + auto row height so long Thai options stay fully visible */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid min-h-0 flex-1 grid-cols-2 auto-rows-min gap-2 overflow-y-auto overscroll-contain sm:gap-4"
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
                            "flex min-h-[5.5rem] w-full min-w-0 flex-col rounded-xl border-b-4 p-2 text-center font-bold text-white shadow-md relative group sm:min-h-[7rem] sm:p-4",
                            colors[index % 4],
                            locked && "opacity-50 pointer-events-none"
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
                            className="relative z-10 flex w-full min-w-0 flex-1 items-center justify-center px-0.5 py-1 drop-shadow-md sm:px-1 sm:py-2"
                        >
                            {question.optionTypes?.[index] === "IMAGE" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={option}
                                    alt={t("optionImageAlt", { n: index + 1 })}
                                    className="max-h-20 max-w-full rounded-md object-contain sm:max-h-28"
                                />
                            ) : (
                                <MathRender
                                    text={option}
                                    className="block w-full min-w-0 text-xs leading-snug sm:text-base md:text-lg"
                                />
                            )}
                        </motion.div>
                    </motion.button>
                ))}
            </motion.div>
        </motion.div>
    )
}
