import { redirect } from "next/navigation";

type AuthErrorPageProps = {
    searchParams: Promise<{ error?: string }>;
};

/** Friendly redirect from NextAuth default error page (e.g. Configuration). */
export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
    const { error } = await searchParams;

    if (error === "Configuration") {
        redirect("/login?error=oauth_not_configured");
    }

    if (error) {
        redirect(`/login?error=${encodeURIComponent(error)}`);
    }

    redirect("/login");
}
