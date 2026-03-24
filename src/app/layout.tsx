import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/components/providers/socket-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { AccessibilityProvider } from "@/components/providers/accessibility-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SoundProvider } from "@/hooks/use-sound";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GameEdu",
  description: "Educational Game Platform",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
            <AccessibilityProvider>
              <LanguageProvider>
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
