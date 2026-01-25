import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Gamepad2, ArrowRight, UserPlus, LogIn } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            Blooket Clone
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-semibold text-slate-600">Login</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-purple-600 hover:bg-purple-700 font-bold">Sign Up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8 animate-in mt-12 slide-in-from-bottom-10 fade-in duration-700">
          {/* Logo/Icon */}
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl shadow-2xl flex items-center justify-center mb-8 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <Gamepad2 className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight">
            Level Up Your <br />
            <span className="text-purple-600">Classroom Engagement</span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Join the fun! Create interactive quizzes, compete in real-time, and make learning an adventure.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-8">
            {/* Big Join Button */}
            <Link href="/play" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-16 px-10 text-xl font-bold bg-green-500 hover:bg-green-600 shadow-[0_6px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1.5 transition-all rounded-2xl">
                Join a Game <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>

            {/* Dashboard / Host Button */}
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-16 px-10 text-xl font-bold border-2 border-slate-300 text-slate-700 hover:border-purple-500 hover:text-purple-600 bg-white shadow-[0_6px_0_rgb(203,213,225)] active:shadow-none active:translate-y-1.5 transition-all rounded-2xl">
                Host a Game
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid Decoration */}
        <div className="grid grid-cols-3 gap-4 mt-20 opacity-20 max-w-4xl w-full pointer-events-none select-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-400 text-sm">
        © 2024 Gamedu Project. Built with Next.js & Socket.io
      </footer>
    </div>
  )
}
