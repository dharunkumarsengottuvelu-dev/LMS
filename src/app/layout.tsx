import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AutoLogoutProvider } from "@/components/providers/auto-logout-provider";

import { LMSProvider } from "@/lib/store/lms-store";
import { ActiveTimeProvider } from "@/components/providers/active-time-provider";

export const metadata: Metadata = {
  title: {
    default: "SensilLearn",
    template: "SensilLearn | %s",
  },
  description:
    "SensilLearn is an enterprise learning platform.",
  keywords: [
    "SensilLearn",
    "LMS",
    "e-learning",
    "corporate training",
    "online courses",
    "coding assessment",
  ],
  authors: [{ name: "SensilLearn" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env["NEXT_PUBLIC_APP_URL"],
    title: "SensilLearn",
    description: "Enterprise learning platform.",
    siteName: "SensilLearn",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
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
                  <ActiveTimeProvider>
                    {children}
                  </ActiveTimeProvider>
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
