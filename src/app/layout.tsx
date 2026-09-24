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
    default: "SensiLearn Learning Technologies — Enterprise Learning Platform",
    template: "%s | SensiLearn",
  },
  description:
    "SensiLearn Learning Technologies is a next-generation learning and technology-driven training company under SENSI Group. Focused. Adaptive. Learning. Curated. Organized. Next-Gen.",
  keywords: [
    "SensiLearn",
    "SensiLearn Learning Technologies",
    "SENSI Group",
    "LMS",
    "e-learning",
    "corporate training",
    "online courses",
    "coding assessment",
  ],
  authors: [{ name: "SensiLearn Learning Technologies" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env["NEXT_PUBLIC_APP_URL"],
    title: "SensiLearn Learning Technologies — Enterprise Learning Platform",
    description: "Next-generation enterprise learning platform under SENSI Group.",
    siteName: "SensiLearn",
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof document !== 'undefined' && document.cookie) {
                    var cookies = document.cookie.split(';');
                    var hasChunk0 = false;
                    for (var i = 0; i < cookies.length; i++) {
                      var name = cookies[i].split('=')[0].trim();
                      if (name.indexOf('-auth-token.0') > -1) {
                        hasChunk0 = true;
                        break;
                      }
                    }
                    for (var i = 0; i < cookies.length; i++) {
                      var name = cookies[i].split('=')[0].trim();
                      if (hasChunk0 && name.endsWith('-auth-token')) {
                        document.cookie = name + '=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                      }
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
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
