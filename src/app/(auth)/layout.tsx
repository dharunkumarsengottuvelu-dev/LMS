import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication — FALCON Learning Technologies",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen max-h-screen overflow-hidden grid lg:grid-cols-12 bg-white antialiased">
      
      {/* ──────────────────────────────────────────────────────────
          LEFT PANEL: FALCON BRAND PRESENTATION (5 cols)
          Apple / Google-level typographical hierarchy & whitespace
          ────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between text-white p-12 xl:p-16 relative border-r border-slate-200/20 bg-[#070D1E] overflow-hidden h-full select-none">
        
        {/* Extremely Subtle Architectural Depth Texture */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 scale-105"
          style={{ backgroundImage: "url('/images/cta-bg.jpg')" }}
        />

        {/* Minimal Depth Gradient (Calm & Timeless) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-[#070D1E]/95 to-[#0A122A]/90" />
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 30% 25%, rgba(37, 99, 235, 0.15), transparent 60%)"
          }}
        />

        {/* Top Brand Mark (Left-Aligned Grid) */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex flex-col">
            <span className="font-bold text-2xl tracking-tight text-white leading-none">
              FALCON<span className="text-[#2563EB]">.</span>
            </span>
            <span className="text-xs text-slate-400 font-normal tracking-wide mt-2">
              Learning Technologies
            </span>
          </Link>
        </div>

        {/* Hero Narrative (Left-Aligned Grid, Single Axis) */}
        <div className="relative z-10 my-auto py-6 space-y-6 max-w-[420px]">
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-[1.18] tracking-tight text-white">
            Transforming Learning
            <br />
            Into Capability.
          </h1>

          <p className="text-slate-300 text-sm xl:text-base leading-relaxed font-normal">
            Structured learning, practical training, continuous assessment, and project-based execution — designed to build real capability.
          </p>
        </div>

        {/* Bottom Status / Institutional Standard (Left-Aligned Grid) */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-normal">
          <span>Enterprise Learning Platform</span>
          <span className="text-slate-500">Institutional Edition</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          RIGHT PANEL: AUTHENTICATION CONSOLE (7 cols)
          Floating naturally through whitespace, zero borders or cards
          ────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-10 relative bg-white h-full overflow-y-auto lg:overflow-hidden">
        
        {/* Mobile Header */}
        <div className="lg:hidden w-full max-w-[420px] flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <Link href="/" className="inline-flex flex-col">
            <span className="font-bold text-xl tracking-tight text-slate-900 leading-none">
              FALCON<span className="text-[#2563EB]">.</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal mt-0.5">
              Learning Technologies
            </span>
          </Link>
          <span className="text-xs text-slate-500 font-medium">Enterprise Access</span>
        </div>

        {/* Centered Form Surface */}
        <div className="w-full max-w-[420px] flex items-center justify-center">
          {children}
        </div>
      </div>

    </div>
  );
}
