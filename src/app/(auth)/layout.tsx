import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication — EduNexus",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#FAFAFA] dark:bg-[#09090B]">
      {/* Left: Minimalist Enterprise Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#09090B] text-[#FAFAFA] p-12 border-r border-[#27272A]">
        {/* Top Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-lg">
            E
          </div>
          <span className="text-lg font-semibold tracking-tight text-white" style={{ fontFamily: "Inter, sans-serif" }}>
            EduNexus
          </span>
        </div>

        {/* Hero Content */}
        <div className="my-auto py-12 space-y-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181B] border border-[#27272A] text-xs font-medium text-[#A1A1AA]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            Enterprise Training SaaS Platform
          </div>

          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-white">
            Level up your team&apos;s skills and engineering performance
          </h1>

          <p className="text-[#A1A1AA] text-base leading-relaxed">
            EduNexus provides world-class interactive learning, automated coding assessments, and real-time capability analytics for modern teams.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { value: "50,000+", label: "Learners" },
              { value: "1,200+", label: "Courses" },
              { value: "99.9%", label: "Satisfaction" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] text-center"
              >
                <div className="text-xl font-semibold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-[#A1A1AA] mt-1 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial Quote Card */}
        <div className="p-6 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
          <p className="text-xs text-[#A1A1AA] leading-relaxed italic">
            &ldquo;EduNexus transformed how we upskill our 2,000-person engineering organization. The automated coding assessments and analytics are unmatched.&rdquo;
          </p>
          <div className="flex items-center gap-3 pt-1">
            <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold">
              SC
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Sarah Chen</p>
              <p className="text-[11px] text-[#A1A1AA]">VP of Engineering, TechCorp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Clean Auth Form Surface */}
      <div className="flex items-center justify-center p-8 lg:p-16 bg-[#FAFAFA] dark:bg-[#09090B]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
