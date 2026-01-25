import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Newspaper, Trophy, Play } from "lucide-react"

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white shadow-lg">
                <h1 className="text-3xl font-bold">Welcome to GamEdu!</h1>
                <p className="mt-2 text-indigo-100 max-w-2xl">
                    Create engaging quizzes, host live games, and track student progress.
                    Ready to make learning fun?
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* News Card */}
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium">News</CardTitle>
                        <Newspaper className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-4 border-b pb-4 last:border-0">
                                <div className="h-12 w-12 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    UPD
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">Season 4 is here!</h4>
                                    <p className="text-xs text-muted-foreground mt-1">New Blooks, new game modes, and more fun. Check out the market now.</p>
                                </div>
                            </div>
                            {/* More news items... */}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats / Shortcuts */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">My Sets</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">Created question sets</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Games Hosted</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">Lifetime games</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
