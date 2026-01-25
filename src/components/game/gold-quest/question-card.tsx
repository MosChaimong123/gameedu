import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { MathRender } from "@/components/math-render"

type Props = {
    question: {
        id: string;
        question: string;

        options: string[];
        optionTypes?: string[];
        image?: string | null;
    };
    onAnswer: (index: number) => void;
}

export function QuestionCard({ question, onAnswer }: Props) {
    const colors = [
        "bg-red-500 border-red-700",
        "bg-blue-500 border-blue-700",
        "bg-amber-500 border-amber-700",
        "bg-green-500 border-green-700"
    ];

    const shapes = ["▲", "◆", "■", "●"];

    return (
        <div className="flex flex-col h-full w-full max-w-lg mx-auto p-4 justify-center">
            {/* Question Text */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8 text-center border-b-4 border-slate-200"
            >
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                    <MathRender text={question.question} />
                </h2>
                {/* Image if exists */}
                {question.image && (
                    <div className="mt-4 rounded-lg overflow-hidden border-2 border-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={question.image} alt="Question" className="w-full h-48 object-cover" />
                    </div>
                )}
            </motion.div>

            {/* Answer Grid */}
            <div className="grid grid-cols-2 gap-4">
                {question.options.map((option, index) => (
                    <motion.button
                        key={index}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                            "h-32 rounded-xl text-white font-bold p-4 flex flex-col items-center justify-center shadow-md border-b-4 text-center relative overflow-hidden group",
                            colors[index % 4]
                        )}
                        onClick={() => onAnswer(index)}
                    >
                        {/* Background Pattern */}
                        <div className="absolute top-2 left-2 opacity-20 text-4xl">
                            {shapes[index % 4]}
                        </div>
                        <div className="relative z-10 drop-shadow-md w-full h-full flex items-center justify-center p-2">
                            {question.optionTypes?.[index] === 'IMAGE' ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={option} alt={`Option ${index + 1}`} className="max-w-full max-h-full object-contain rounded-md" />
                            ) : (
                                <span className="text-lg md:text-xl">
                                    <MathRender text={option} />
                                </span>
                            )}
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    )
}
