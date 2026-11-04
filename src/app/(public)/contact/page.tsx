"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  CheckCircle2,
  Menu,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function PublicContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "SensiLearn | Contact";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Clean form submission simulation
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSubmitted(true);
      toast({
        title: "Inquiry Received",
        description: "Thank you! Our enterprise solutions team will contact you shortly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#2563EB]/15 selection:text-[#2563EB] flex flex-col justify-between">
      
      {/* ──────────────────────────────────────────────────────────
          1. CLEAN ENTERPRISE NAVBAR (MATCHING LANDING PAGE)
          ────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 h-[72px] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Brand Mark */}
          <Link href="/" className="flex items-center group">
            <div className="flex flex-col">
              <span className="font-extrabold text-xl text-slate-900 tracking-tight leading-none">
                SENSILEARN<span className="text-[#2563EB]">.</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight mt-1 leading-none">
                Learning Technologies
              </span>
              <span className="text-[6.5px] text-slate-400/80 font-medium tracking-wider uppercase mt-0.5 leading-none">
                SENSI Group
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <Link href="/#approach" className="hover:text-slate-900 transition-colors">The Approach</Link>
            <Link href="/#why-sensilearn" className="hover:text-slate-900 transition-colors">Why SensiLearn</Link>
            <Link href="/#platform" className="hover:text-slate-900 transition-colors">What We Do</Link>
            <Link href="/#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</Link>
            <Link href="/#ecosystem" className="hover:text-slate-900 transition-colors">Ecosystem</Link>
            <Link href="/contact" className="text-[#2563EB] font-bold">Contact</Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-slate-900" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 h-9 rounded-lg shadow-xs transition-colors" asChild>
              <Link href="/login">Get Started</Link>
            </Button>

            {/* Mobile Sheet Trigger */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger className="lg:hidden p-2 rounded-lg border border-slate-200 inline-flex items-center justify-center text-slate-700 hover:bg-slate-100">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[340px] bg-white border-slate-200 p-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <SheetHeader className="text-left pb-4 border-b border-slate-100">
                    <SheetTitle className="text-base font-bold text-slate-900">
                      SENSILEARN<span className="text-[#2563EB]">.</span>
                    </SheetTitle>
                    <p className="text-xs text-slate-500 font-medium">Learning Technologies</p>
                    <p className="text-[6.5px] text-slate-400/80 font-medium tracking-wider uppercase">SENSI Group</p>
                  </SheetHeader>

                  <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700">
                    <Link href="/#approach" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">The Approach</Link>
                    <Link href="/#why-sensilearn" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Why SensiLearn</Link>
                    <Link href="/#platform" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">What We Do</Link>
                    <Link href="/#how-it-works" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">How It Works</Link>
                    <Link href="/#ecosystem" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Ecosystem</Link>
                    <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 font-bold">Contact</Link>
                  </nav>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-2.5">
                  <Button variant="outline" className="w-full justify-center text-xs font-semibold h-10 border-slate-200" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button className="w-full justify-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold h-10" asChild>
                    <Link href="/login">Get Started</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA (HERO, QUICK CARDS & INQUIRY FORM)
          ────────────────────────────────────────────────────────── */}
      <main className="flex-1 pt-28 sm:pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Header Banner */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[11px] font-bold text-[#2563EB] tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enterprise Support &amp; Sales</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Get in Touch with Our Team
            </h1>

            <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
              Have questions about enterprise deployment, proctoring features, custom learning programs, or institutional onboarding? We&apos;re here to help.
            </p>
          </div>

          {/* Luxury Quick Connect Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            {/* Direct Email Card */}
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=sensigroup.info@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Compose email to sensigroup.info@gmail.com in Gmail"
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400/80 hover:shadow-[0_8px_24px_-4px_rgba(37,99,235,0.12)] transition-all duration-200 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Direct Email</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-[#2563EB] transition-colors mt-0.5 font-mono">
                    sensigroup.info@gmail.com
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-[#2563EB] transition-colors shrink-0 ml-2" />
            </a>

            {/* Instagram Card */}
            <a
              href="https://www.instagram.com/sensilearn?mdxt=M3RqeTUxMHpmeTF6"
              target="_blank"
              rel="noopener noreferrer"
              title="Visit @sensilearn on Instagram"
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-pink-400/80 hover:shadow-[0_8px_24px_-4px_rgba(225,48,108,0.14)] transition-all duration-200 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <InstagramIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Instagram</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-pink-600 transition-colors mt-0.5">
                    @sensilearn
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-pink-600 transition-colors shrink-0 ml-2" />
            </a>
          </div>

          {/* Enterprise Form Card */}
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm space-y-6">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Inquiry Sent Successfully!</h2>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Thank you, <strong className="text-slate-800">{name || "there"}</strong>. Our enterprise solutions advisor will review your message and reach out to <strong className="text-slate-800 font-mono">{email}</strong> within 2 business hours.
                  </p>
                  <div className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSubmitted(false);
                        setName("");
                        setEmail("");
                        setMessage("");
                      }}
                      className="text-xs font-semibold rounded-xl border-slate-200 text-slate-700"
                    >
                      Send Another Message
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-base font-bold text-slate-900">Send an Enterprise Inquiry</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Fill out the form below and our team will get in touch directly.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      Your Full Name
                    </label>
                    <Input
                      placeholder="e.g. Dharunkumar S"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#2563EB] rounded-xl transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      Work Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#2563EB] rounded-xl transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      How can we help you?
                    </label>
                    <Textarea
                      placeholder="Tell us about your team size, curriculum requirements, or institutional goals..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={4}
                      className="text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#2563EB] rounded-xl transition-colors resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? "Sending Inquiry..." : "Send Enterprise Inquiry"}</span>
                  </Button>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ──────────────────────────────────────────────────────────
          3. ENTERPRISE FOOTER (MATCHING LANDING PAGE)
          ────────────────────────────────────────────────────────── */}
      <footer className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-200">
            
            {/* Brand Column (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                  SENSILEARN<span className="text-[#2563EB]">.</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700">
                SensiLearn Learning Technologies
              </p>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-medium">
                Learn • Build • Lead
              </p>
              <p className="text-xs text-[#2563EB] font-medium pt-1">
                Part of SENSI Group of Companies
              </p>

              {/* Direct Contact & Social Links (Expanding Luxury Pill Buttons) */}
              <div className="pt-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Connect &amp; Support
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Mail Expanding Pill Button: opens logged-in Gmail web composer */}
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=sensigroup.info@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Email: sensigroup.info@gmail.com"
                    title="Send Email (Opens in your logged-in Gmail)"
                    className="group relative inline-flex items-center h-10 px-3 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-4px_rgba(37,99,235,0.28)] hover:border-blue-400/80 hover:bg-blue-50/30 text-slate-700 hover:text-blue-600 transition-all duration-300 ease-out cursor-pointer overflow-hidden"
                  >
                    <Mail className="h-4.5 w-4.5 shrink-0 text-blue-600 transition-transform duration-300 group-hover:scale-110" />
                    <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2.5 transition-all duration-300 ease-out overflow-hidden whitespace-nowrap text-xs font-semibold font-mono text-slate-800">
                      sensigroup.info@gmail.com
                    </span>
                  </a>

                  {/* Instagram Expanding Pill Button */}
                  <a
                    href="https://www.instagram.com/sensilearn?mdxt=M3RqeTUxMHpmeTF6"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram - @sensilearn"
                    title="Visit @sensilearn on Instagram"
                    className="group relative inline-flex items-center h-10 px-3 rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-4px_rgba(225,48,108,0.35)] hover:border-transparent hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] text-slate-700 hover:text-white transition-all duration-300 ease-out cursor-pointer overflow-hidden"
                  >
                    <InstagramIcon className="h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2.5 transition-all duration-300 ease-out overflow-hidden whitespace-nowrap text-xs font-semibold text-white">
                      @sensilearn
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* Platform Column */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Platform</span>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li><Link href="/#platform" className="hover:text-slate-900 transition-colors">Courses</Link></li>
                <li><Link href="/#platform" className="hover:text-slate-900 transition-colors">Practices</Link></li>
                <li><Link href="/#platform" className="hover:text-slate-900 transition-colors">Coding</Link></li>
                <li><Link href="/#platform" className="hover:text-slate-900 transition-colors">Assessments</Link></li>
                <li><Link href="/#platform" className="hover:text-slate-900 transition-colors">Live Classes</Link></li>
                <li><Link href="/#platform" className="hover:text-slate-900 transition-colors">Assignments</Link></li>
              </ul>
            </div>

            {/* Ecosystem Column */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ecosystem</span>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li><Link href="/#who-we-are" className="hover:text-slate-900 transition-colors">Students</Link></li>
                <li><Link href="/#who-we-are" className="hover:text-slate-900 transition-colors">Trainers</Link></li>
                <li><Link href="/#who-we-are" className="hover:text-slate-900 transition-colors">Institutions</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Company</span>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li><Link href="/#who-we-are" className="hover:text-slate-900 transition-colors">Who We Are</Link></li>
                <li><Link href="/#approach" className="hover:text-slate-900 transition-colors">The Approach</Link></li>
                <li><Link href="/#why-sensilearn" className="hover:text-slate-900 transition-colors">Why SensiLearn</Link></li>
                <li><Link href="/#platform" className="hover:text-slate-900 transition-colors">What We Do</Link></li>
                <li><Link href="/contact" className="hover:text-slate-900 transition-colors text-[#2563EB] font-bold">Contact</Link></li>
              </ul>
            </div>

          </div>

          {/* Copyright & Leadership */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} SensiLearn Learning Technologies (SENSI Group). All rights reserved.</p>
            <p className="font-medium text-slate-700">Founder &amp; CEO: Dharunkumar S</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
