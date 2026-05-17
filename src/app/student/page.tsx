import { auth } from "@/auth";
import { StudentLoginForm } from "@/components/student/student-login-form";

export default async function StudentLoginPage() {
    const session = await auth();
    const isLoggedIn = !!session?.user;

    return (
        <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-50 p-4 sm:p-6">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
            <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 rounded-full bg-violet-300 mix-blend-multiply opacity-30 blur-3xl filter animate-blob animation-delay-4000" />
            
            <StudentLoginForm isLoggedIn={isLoggedIn} />
        </div>
    );
}
