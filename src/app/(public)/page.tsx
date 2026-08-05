import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Code2, BookOpen, BarChart3, Award, Users, Shield,
  ArrowRight, CheckCircle2, Star, Zap, Globe, Clock
} from "lucide-react";

export const metadata: Metadata = {
  title: "EduNexus — Enterprise Learning Platform",
  description: "World-class corporate training platform with interactive courses, coding assessments, and real-time analytics. Trusted by 500+ enterprises.",
};

const features = [
  { icon: BookOpen, title: "Interactive Courses", desc: "Video lessons, PDFs, quizzes, and hands-on projects", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: Code2, title: "Coding Assessments", desc: "Monaco editor with 14+ languages powered by Judge0", color: "text-violet-600", bg: "bg-violet-50" },
  { icon: BarChart3, title: "Real-time Analytics", desc: "Track progress, scores, and team performance at a glance", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Award, title: "Certificates", desc: "Issue verified digital certificates upon course completion", color: "text-amber-600", bg: "bg-amber-50" },
  { icon: Users, title: "Team Management", desc: "Manage batches, assign courses, and track team learning", color: "text-cyan-600", bg: "bg-cyan-50" },
  { icon: Shield, title: "Enterprise Security", desc: "RBAC, RLS policies, audit logs, and GDPR compliance", color: "text-rose-600", bg: "bg-rose-50" },
];

const stats = [
  { value: "50K+", label: "Active Learners" },
  { value: "1,200+", label: "Courses" },
  { value: "500+", label: "Enterprise Clients" },
  { value: "98%", label: "Satisfaction Rate" },
];

const testimonials = [
  {
    name: "Sarah Chen",
    title: "VP Engineering, TechCorp",
    content: "EduNexus transformed how we upskill our 2,000-person engineering team. The coding assessments and real-time analytics are unmatched.",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    title: "L&D Director, GlobalBank",
    content: "The platform's certificate tracking and progress dashboards gave us complete visibility into our training ROI.",
    rating: 5,
  },
  {
    name: "Priya Nair",
    title: "CTO, StartupX",
    content: "Judge0-powered coding tests helped us identify top talent in our hiring pipeline. Incredible platform.",
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white font-bold">
              E
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>
              EduNexus
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button size="sm" className="bg-brand-gradient text-white hover:opacity-90" asChild>
              <Link href="/auth/register">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <Badge variant="outline" className="gap-2 px-4 py-1.5 text-sm">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Trusted by 500+ enterprises worldwide
          </Badge>
          <h1
            className="text-5xl md:text-7xl font-bold tracking-tight leading-tight"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            The{" "}
            <span className="gradient-text">enterprise LMS</span>
            <br />
            your team deserves
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upskill your entire organization with interactive courses, coding assessments, 
            real-time analytics, and AI-powered insights — all in one platform.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" className="bg-brand-gradient text-white hover:opacity-90 h-12 px-8 text-base gap-2" asChild>
              <Link href="/auth/register">
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="/ide/playground">Try Code Playground</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card required • Free for up to 25 users
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-muted/40 border-y border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className="text-4xl font-bold gradient-text"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="outline">Features</Badge>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
              Everything you need to train at scale
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From beginner courses to advanced coding challenges — EduNexus has it all.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="card-hover border-border/60">
                  <CardContent className="p-6 space-y-4">
                    <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${feature.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
              Loved by learning teams
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/60">
                <CardContent className="p-6 space-y-4">
                  <div className="flex">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">&ldquo;{t.content}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Globe className="h-4 w-4" />
            Ready to transform your team?
          </div>
          <h2
            className="text-4xl font-bold leading-tight"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Start your free trial today
          </h2>
          <p className="text-muted-foreground text-lg">
            Join 500+ companies that use EduNexus to train, assess, and certify their teams.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" className="bg-brand-gradient text-white hover:opacity-90 h-12 px-8 gap-2" asChild>
              <Link href="/auth/register">
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" asChild>
              <Link href="/contact">Talk to sales</Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
            {["Free 14-day trial", "No credit card", "Cancel anytime"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-gradient flex items-center justify-center text-white font-bold text-xs">E</div>
            <span className="font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>EduNexus</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EduNexus. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
