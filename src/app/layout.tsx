import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/components/providers/socket-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { AccessibilityProvider } from "@/components/providers/accessibility-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SoundProvider } from "@/hooks/use-sound";
import { Toaster } from "@/components/ui/toaster";
import { LANGUAGE_COOKIE_NAME } from "@/lib/language-cookie";
import type { Language } from "@/lib/translations";
import { siteMetadata } from "../../content/public-pages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

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
  const initialLanguage: Language = cookieLang === "th" ? "th" : "en";

  return (
    <html lang={initialLanguage}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} antialiased`}
      >
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
