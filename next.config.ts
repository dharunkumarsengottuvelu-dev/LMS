import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better dev experience
  reactStrictMode: true,

  // Standalone output — required for Docker deployment
  // Disable it on Vercel to fix the build error
  output: process.env.VERCEL ? undefined : "standalone",

  // Turbopack compatibility setting
  turbopack: {},

  // Image domains for Supabase storage and external providers
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth avatars
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Route rewrites for backward compatibility and canonical auth routing
  async rewrites() {
    return [
      {
        source: "/auth/forgot-password",
        destination: "/forgot-password",
      },
      {
        source: "/auth/reset-password",
        destination: "/reset-password",
      },
      {
        source: "/auth/login",
        destination: "/login",
      },
      {
        source: "/auth/register",
        destination: "/register",
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(), display-capture=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.youtube.com https://*.youtube.com https://s.ytimg.com https://*.ytimg.com https://player.vimeo.com https://*.loom.com",
              "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.youtube.com https://*.youtube.com https://s.ytimg.com https://*.ytimg.com https://player.vimeo.com https://*.loom.com",
              "worker-src 'self' blob: data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "style-src-elem 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https: https://*.googleusercontent.com https://*.gstatic.com",
              "media-src 'self' blob: data: https: https://commondatastorage.googleapis.com https://*.googleapis.com https://*.supabase.co https://*.cloudinary.com https://*.mux.com https://*.youtube.com https://*.googlevideo.com",
              "connect-src 'self' blob: data: https: wss: https://accounts.google.com https://*.googleapis.com https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://*.youtube.com https://*.googlevideo.com",
              "frame-src 'self' blob: data: https://accounts.google.com https://*.youtube.com https://*.youtube-nocookie.com https://www.youtube.com https://*.vimeo.com https://player.vimeo.com https://*.loom.com https://www.loom.com https://drive.google.com https://docs.google.com",
              "frame-ancestors 'none'",
            ].join("; ") + ";",
          },
        ],
      },
    ];
  },

  // Experimental features & compiler performance optimizations
  experimental: {
    cpus: 2,
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-avatar",
      "@radix-ui/react-slot",
      "@radix-ui/react-tooltip"
    ],
  },

  // Webpack config for Monaco Editor fallback
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
