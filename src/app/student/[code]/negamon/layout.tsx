import type { ReactNode } from "react";

export default function StudentNegamonInfoLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-violet-100/50">
            {children}
        </div>
    );
}
