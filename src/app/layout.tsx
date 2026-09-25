import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AutoLogoutProvider } from "@/components/providers/auto-logout-provider";
import { LMSProvider } from "@/lib/store/lms-store";
import { ActiveTimeProvider } from "@/components/providers/active-time-provider";
import { GlobalErrorListener } from "@/components/providers/global-error-listener";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — Enterprise Learning Platform`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    siteConfig.name,
    siteConfig.companyName,
    "LMS",
    "e-learning",
    "corporate training",
    "online courses",
    "coding assessment",
  ],
  authors: [{ name: siteConfig.companyName }],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: `${siteConfig.name} — Enterprise Learning Platform`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    ...(siteConfig.url ? { url: siteConfig.url } : {}),
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
};

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
