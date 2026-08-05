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
              E
            </div>
            <span className="font-bold text-lg text-[#111827] dark:text-[#FAFAFA]">
              EduNexus
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
            Have questions about enterprise deployment, proctoring features, or custom pricing? We're here to help.
          </p>
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
