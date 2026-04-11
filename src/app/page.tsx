import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Gamepad2 } from "lucide-react"
import { PublicBrandMark } from "@/components/layout/public-brand-mark"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <PublicBrandMark href="/" size="md" />
        <div className="flex gap-2 sm:gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-semibold text-slate-600">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-md shadow-indigo-200/50 hover:from-indigo-700 hover:to-purple-700">
              Sign Up
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center p-4 text-center sm:p-6">
        <div className="mt-8 max-w-3xl space-y-8 duration-700 animate-in fade-in slide-in-from-bottom-10 sm:mt-12">
          <div className="mx-auto mb-8 flex h-24 w-24 -rotate-6 transform items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-2xl shadow-indigo-200/50 transition-transform duration-300 hover:rotate-0">
            <Gamepad2 className="h-12 w-12 text-white" />
          </div>

          <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-900 md:text-7xl">
            Level Up Your <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Classroom Engagement
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-slate-600">
            Join the fun! Create interactive quizzes, compete in real-time, and make learning an adventure.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row">
            <Link href="/play" className="w-full sm:w-auto">
              <Button className="h-16 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 text-xl font-bold text-white shadow-[0_6px_0_rgb(67,56,202)] transition-all hover:from-indigo-700 hover:to-purple-700 active:translate-y-1.5 active:shadow-none sm:w-auto">
                Join a Game <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="h-16 w-full rounded-2xl border-2 border-slate-300 bg-white px-10 text-xl font-bold text-slate-700 shadow-[0_6px_0_rgb(203,213,225)] transition-all hover:border-indigo-400 hover:text-indigo-700 active:translate-y-1.5 active:shadow-none sm:w-auto"
              >
                Host a Game
              </Button>
            </Link>
          </div>
        </div>

        <div className="pointer-events-none mt-20 grid w-full max-w-4xl select-none grid-cols-3 gap-4 opacity-20">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-slate-200"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} GameEdu. Built with Next.js & Socket.io
      </footer>
    </div>
  )
}
