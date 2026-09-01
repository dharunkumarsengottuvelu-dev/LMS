import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AutoLogoutProvider } from "@/components/providers/auto-logout-provider";

import { LMSProvider } from "@/lib/store/lms-store";

export const metadata: Metadata = {
  title: {
    default: "FALCON Learning Technologies — Enterprise Learning Platform",
    template: "%s | FALCON",
  },
  description:
    "FALCON Learning Technologies is a next-generation learning and technology-driven training company under SENSI Group. Focused. Adaptive. Learning. Curated. Organized. Next-Gen.",
  keywords: [
    "FALCON",
    "FALCON Learning Technologies",
    "SENSI Group",
    "LMS",
    "e-learning",
    "corporate training",
    "online courses",
    "coding assessment",
  ],
  authors: [{ name: "FALCON Learning Technologies" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env["NEXT_PUBLIC_APP_URL"],
    title: "FALCON Learning Technologies — Enterprise Learning Platform",
    description: "Next-generation enterprise learning platform under SENSI Group.",
    siteName: "FALCON",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { GlobalErrorListener } from "@/components/providers/global-error-listener";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Fira+Code:wght@400;500;600;700&family=Inter:wght@100..900&family=Sora:wght@100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <GlobalErrorListener />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AuthProvider>
              <AutoLogoutProvider>
                <LMSProvider>
                  {children}
                </LMSProvider>
                <Toaster />
              </AutoLogoutProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
