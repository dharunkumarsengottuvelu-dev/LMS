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
        {/* Client-side cookie hygiene script: runs synchronously before body render */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof document === 'undefined' || !document.cookie) return;
                  var host = window.location.hostname || '';
                  function expire(n) {
                    document.cookie = n + '=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    if (host && host.indexOf('localhost') === -1) {
                      document.cookie = n + '=; path=/; domain=' + host + '; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                      document.cookie = n + '=; path=/; domain=.' + host + '; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    }
                  }

                  var cookieStr = document.cookie;
                  var cookies = cookieStr.split(';');
                  var hasChunk0 = false;
                  var hasActiveSession = false;

                  for (var i = 0; i < cookies.length; i++) {
                    var cName = cookies[i].split('=')[0].trim();
                    if (cName.indexOf('-auth-token.0') > -1) {
                      hasChunk0 = true;
                      hasActiveSession = true;
                      break;
                    }
                  }

                  for (var j = 0; j < cookies.length; j++) {
                    var name = cookies[j].split('=')[0].trim();
                    if (!name) continue;

                    // 1. Remove duplicate unchunked session cookie when chunked (.0) exists
                    if (hasChunk0 && name.endsWith('-auth-token') && name.indexOf('.') === -1) {
                      expire(name);
                    }

                    // 2. Remove bulky provider-token chunks (Google raw tokens ~2-3KB, unneeded for session)
                    if (name.indexOf('-provider-token') > -1 || name.indexOf('-provider-refresh-token') > -1) {
                      expire(name);
                    }

                    // 3. Remove legacy brand cookies
                    if (name.indexOf('falcon_') === 0 || name.indexOf('falcon') > -1) {
                      expire(name);
                    }

                    // 4. Remove stale code-verifier if user already has an active session and is not in OAuth callback
                    if (hasActiveSession && name.indexOf('-code-verifier') > -1 && window.location.pathname.indexOf('/api/auth/callback') === -1) {
                      expire(name);
                    }
                  }

                  // 5. Emergency defense: if cookie header is approaching limit (> 3500 chars), purge legacy cookies
                  if (cookieStr.length > 3500) {
                    for (var k = 0; k < cookies.length; k++) {
                      var n = cookies[k].split('=')[0].trim();
                      if (n.indexOf('g_state') > -1 || n.indexOf('oauth_state') > -1) {
                        expire(n);
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
