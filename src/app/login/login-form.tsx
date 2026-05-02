"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { getLocalizedAuthErrorMessage, tryLocalizeFetchNetworkFailureMessage } from "@/lib/ui-error-messages";
import { useLanguage } from "@/components/providers/language-provider";

export default function LoginForm() {
    const { language, t } = useLanguage();
    const [isLoading, setIsLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const formSchema = React.useMemo(
        () =>
            z.object({
                email: z.string().email(t("authValidationEmail")),
                password: z.string().min(6, t("authValidationPasswordMin")),
            }),
        [t]
    );

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
            });

            if (result?.error || !result?.ok) {
                setErrorMsg(getLocalizedAuthErrorMessage(result?.error, language, t));
            } else {
                const { getSession } = await import("next-auth/react");
                const session = await getSession();
                const role = session?.user?.role;
                if (role === "STUDENT") {
                    window.location.href = "/student/home";
                } else if (role === "ADMIN") {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/dashboard";
                }
            }
        } catch (error) {
            const raw = error instanceof Error ? error.message : null;
            const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
            setErrorMsg(net ?? getLocalizedAuthErrorMessage(raw, language, t));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div key={language} className="grid gap-5">
            {errorMsg && (
                <div className="flex animate-in slide-in-from-top-2 items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-slate-700">{t("loginLabelEmail")}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t("loginPlaceholderEmail")}
                                        className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-slate-700">{t("loginLabelPassword")}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={t("loginPlaceholderPassword")}
                                            className="h-11 rounded-xl border-slate-200 pr-10 focus:border-indigo-400 focus:ring-indigo-400"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((current) => !current)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("loginSubmit")}
                    </Button>
                </form>
            </Form>

            <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-slate-500">{t("signupOrContinueWith")}</span>
                </div>
            </div>

            <Button
                variant="outline"
                type="button"
                disabled={isLoading}
                className="h-11 w-full gap-3 rounded-xl border-2 border-slate-200 font-semibold hover:border-indigo-300 hover:bg-indigo-50"
                onClick={() => {
                    setIsLoading(true);
                    void signIn("google", { callbackUrl: "/dashboard" });
                }}
            >
                <svg className="h-5 w-5" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path
                        fill="#4285F4"
                        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                    />
                </svg>
                {t("signupWithGoogle")}
            </Button>
        </div>
    );
}
