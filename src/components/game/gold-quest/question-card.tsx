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
                <h2 className="break-words text-base font-bold text-slate-800 sm:text-xl md:text-2xl">
                    <span className="block overflow-x-auto">
                        <MathRender text={question.question} />
                    </span>
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

            {/* Answer Grid */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4"
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
                            "min-h-[4.5rem] sm:min-h-[7rem] rounded-xl text-white font-bold p-2 sm:p-4 flex flex-col items-center justify-center shadow-md border-b-4 text-center relative overflow-hidden group",
                            colors[index % 4],
                            locked && "opacity-50 pointer-events-none"
                        )}
                        onClick={() => onAnswer(index)}
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute top-1 left-1 opacity-20 text-2xl sm:top-2 sm:left-2 sm:text-4xl"
                        >
                            {shapes[index % 4]}
                        </motion.div>
                        <div className="relative z-10 flex h-full w-full items-center justify-center p-1 sm:p-2 drop-shadow-md">
                            {question.optionTypes?.[index] === "IMAGE" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={option}
                                    alt={t("optionImageAlt", { n: index + 1 })}
                                    className="max-h-20 max-w-full rounded-md object-contain sm:max-h-28"
                                />
                            ) : (
                                <span className="break-words text-sm sm:text-lg md:text-xl">
                                    <MathRender text={option} />
                                </span>
                            )}
                        </div>
                    </motion.button>
                ))}
            </motion.div>
        </motion.div>
    )
}
