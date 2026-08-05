"use client";

import { Award, Download, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const mockCertificates = [
  {
    id: "cert1",
    courseTitle: "Enterprise System Design & Microservices Architecture",
    issuedAt: "2026-07-28",
    credentialId: "CERT-NEXUS-882910",
  },
];

export default function StudentCertificatesPage() {
  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Earned Certificates
        </h1>
        <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
          Verify and download digital credentials for completed courses
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockCertificates.map((cert) => (
          <Card key={cert.id} className="hover:border-[#2563EB]/40 transition-colors">
            <CardHeader className="p-6 pb-3 space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                <Award className="h-6 w-6" />
              </div>
              <CardTitle className="text-[18px]">{cert.courseTitle}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="text-xs text-[#6B7280]">
                <p>Issued: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{cert.issuedAt}</span></p>
                <p>Credential ID: <span className="font-mono text-[#2563EB]">{cert.credentialId}</span></p>
              </div>
              <Button className="w-full h-[44px] bg-[#2563EB] text-white gap-2">
                <Download className="h-4 w-4" /> Download PDF Certificate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
