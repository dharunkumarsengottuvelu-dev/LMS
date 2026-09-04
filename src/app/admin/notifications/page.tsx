"use client";
import { Bell, Plus } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="System Announcements"
        actions={<Button className="h-[44px] bg-[#2563EB] text-white gap-2"><Plus className="h-4 w-4" /> Broadcast Notification</Button>}
      />
      <Card><CardContent className="p-6 text-sm text-[#6B7280]">Sent broadcast history and delivery logs.</CardContent></Card>
    </div>
  );
}
