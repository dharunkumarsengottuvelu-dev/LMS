"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Send, CheckCircle2, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
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
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({
      title: "Inquiry Received",
      description: "Thank you! Our enterprise solutions team will contact you shortly.",
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] pt-24 pb-16">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="font-bold text-lg text-[#111827] dark:text-[#FAFAFA]">
              SENSILEARN
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4B5563] dark:text-[#A1A1AA]">
            <Link href="/courses" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">Courses</Link>
            <Link href="/pricing" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">Pricing</Link>
            <Link href="/about" className="hover:text-[#111827] dark:hover:text-[#FAFAFA]">About</Link>
            <Link href="/contact" className="text-[#2563EB] font-bold">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold" asChild>
              <Link href="/register">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 font-bold px-3 py-1">
            ENTERPRISE SUPPORT & SALES
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Get in Touch with Our Team
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#A1A1AA]">
            Have questions about enterprise deployment, proctoring features, or custom pricing? We&apos;re here to help.
          </p>
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <a
            href="mailto:sensigroup.info@gamil.com"
            className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50 hover:border-blue-400 dark:hover:border-blue-600 transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Direct Email</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#2563EB] transition-colors">
                sensigroup.info@gamil.com
              </p>
            </div>
          </a>

          <a
            href="https://www.instagram.com/sensilearn?mdxt=M3RqeTUxMHpmeTF6"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50 hover:border-pink-400 dark:hover:border-pink-600 transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-950/50 text-pink-600 flex items-center justify-center shrink-0">
              <InstagramIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Instagram</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-pink-600 transition-colors">
                @sensilearn
              </p>
            </div>
          </a>
        </div>

        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-8 shadow-sm">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-[#16A34A] mx-auto animate-bounce" />
              <h2 className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">Message Sent Successfully!</h2>
              <p className="text-xs text-[#6B7280]">Our account executive will get back to {email} within 2 business hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Your Full Name</label>
                <Input
                  placeholder="e.g. Dharunkumar S"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Work Email Address</label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-[44px] text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">How can we help you?</label>
                <Textarea
                  placeholder="Tell us about your team size, training requirements, or inquiry..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="text-xs bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>

              <Button type="submit" className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-2">
                <Send className="h-4 w-4" /> Send Enterprise Inquiry
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
