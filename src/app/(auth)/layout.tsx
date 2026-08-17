import type { Metadata } from "next";
import { Sparkles, Code2, Globe2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Authentication — FALCON Learning Technologies",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-[#030712] relative overflow-hidden">
      {/* Background Gradients for the whole page (subtle) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Left: Premium MNC Brand Panel */}
      <div 
        className="hidden lg:flex flex-col justify-between text-white p-14 relative z-10 border-r border-white/5 bg-[#030712]"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        {/* Dark overlay for image readability */}
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-[2px] z-0" />
        
        {/* Subtle internal gradient over the image */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-transparent to-blue-900/40 pointer-events-none z-0" />

        {/* Top Logo */}
        <div className="flex items-center gap-2 relative z-10">
          <span className="text-2xl font-extrabold tracking-tight text-white" style={{ fontFamily: "Inter, sans-serif" }}>
            FALCON<span className="text-blue-500 font-black">.</span> <span className="text-blue-400 font-semibold text-sm">SENSI Group</span>
          </span>
        </div>

        {/* Hero Content */}
        <div className="my-auto py-12 space-y-10 max-w-[520px] relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-blue-100 backdrop-blur-md shadow-xl">
            <Sparkles className="w-4 h-4 text-blue-300" />
            Next-Gen Capability Development Platform
          </div>

          <h1 
            className="text-[44px] font-bold leading-[1.15] tracking-tight text-white"
            style={{ color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
          >
            Transforming Learning Into Capability.
          </h1>

          <p className="text-gray-200 text-lg leading-relaxed font-medium max-w-[480px] drop-shadow">
            Focused. Adaptive. Learning. Curated. Organized. Next-Gen. Structured curriculum, practical training, continuous assessment, and project-based execution.
          </p>

          {/* Stats Bar (Glassmorphic) */}
          <div className="grid grid-cols-3 gap-5 pt-4">
            {[
              { value: "50,000+", label: "Active Learners", icon: Globe2 },
              { value: "1,200+", label: "Practical Modules", icon: Code2 },
              { value: "99.9%", label: "Platform Uptime", icon: Sparkles },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-5 rounded-2xl bg-white/10 border border-white/20 text-left backdrop-blur-md transition-all hover:bg-white/15 shadow-xl"
              >
                <stat.icon className="w-5 h-5 text-blue-300 mb-3 opacity-90" />
                <div className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                  {stat.value}
                </div>
                <div className="text-xs text-blue-100 mt-1 font-bold uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial Quote Card (Glassmorphic) */}
        <div className="p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md space-y-4 relative z-10 shadow-2xl">
          <p className="text-sm text-white leading-relaxed font-medium drop-shadow-sm">
            "FALCON completely transformed how we bridge academic theory and production-grade engineering skills. The hands-on practice tracks and real-time assessments deliver true capability."
          </p>
          <div className="flex items-center gap-3 pt-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white/30">
              SC
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">Sarah Chen</p>
              <p className="text-xs text-blue-200 font-semibold">VP of Engineering, Fortune 500</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Clean Auth Form Surface */}
      <div className="flex items-center justify-center p-6 lg:p-16 relative z-10">
        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}
