import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { SocketProvider } from "@/components/providers/socket-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { AccessibilityProvider } from "@/components/providers/accessibility-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SoundProvider } from "@/hooks/use-sound";
import { Toaster } from "@/components/ui/toaster";
import { LANGUAGE_COOKIE_NAME, resolveLanguageFromCookie } from "@/lib/language-cookie";
import { siteMetadata } from "../../content/public-pages";

export const metadata: Metadata = {
  title: siteMetadata.title,
  description: siteMetadata.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  const initialLanguage = resolveLanguageFromCookie(cookieLang);

  return (
    <html lang={initialLanguage}>
      <body className="antialiased">
        <AuthProvider>
            <AccessibilityProvider>
              <LanguageProvider initialLanguage={initialLanguage}>
                <SocketProvider>
                  <SoundProvider>
                    {children}
                    <Toaster />
                  </SoundProvider>
                </SocketProvider>
              </LanguageProvider>
            </AccessibilityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

// Force rebuild
