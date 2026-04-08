"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { RoleSelection } from "@/components/auth/role-selection";
import { getLocalizedErrorMessageFromResponse, tryLocalizeFetchNetworkFailureMessage } from "@/lib/ui-error-messages";
import { useLanguage } from "@/components/providers/language-provider";

export default function RegisterForm() {
    const router = useRouter();
    const { language, t } = useLanguage();
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const formSchema = React.useMemo(
        () =>
            z.object({
                role: z.enum(["STUDENT", "TEACHER"]),
                name: z.string().min(2, t("registerValidationNameMin")),
                username: z
                    .string()
                    .min(3, t("registerValidationUsernameMin"))
                    .regex(/^[a-zA-Z0-9_\-\.]+$/, t("registerValidationUsernameChars")),
                email: z.string().email(t("authValidationEmail")),
                password: z.string().min(6, t("authValidationPasswordMin")),
            }),
        [t]
    );

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            role: "STUDENT",
            name: "",
            username: "",
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const message = await getLocalizedErrorMessageFromResponse(
                    res,
                    "registerErrorFailed",
                    t,
                    language,
                    { overrideTranslationKeys: { INVALID_PAYLOAD: "registerErrorInvalidPayload" } }
                );
                throw new Error(message);
            }

            router.push("/login?registered=true");
        } catch (err: unknown) {
            const raw = err instanceof Error ? err.message : null;
            const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
            setError(net ?? (err instanceof Error ? err.message : t("registerErrorFailed")));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div key={language} className="grid gap-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("registerFormRoleLabel")}</FormLabel>
                                <FormControl>
                                    <RoleSelection
                                        onSelect={(role) => form.setValue("role", role)}
                                        selected={field.value}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("registerLabelUsername")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("registerPlaceholderUsername")} {...field} />
                                    </FormControl>
                                    <FormDescription>{t("registerDescUsername")}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("registerLabelFullName")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("registerPlaceholderFullName")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("registerLabelEmail")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("registerPlaceholderEmail")} {...field} />
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
                                    <FormLabel>{t("registerLabelPassword")}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder={t("registerPlaceholderPassword")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {error && <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-500">{error}</div>}

                    <Button type="submit" className="h-11 w-full bg-purple-600 text-base hover:bg-purple-700" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("registerSubmitCreateAccount")}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
