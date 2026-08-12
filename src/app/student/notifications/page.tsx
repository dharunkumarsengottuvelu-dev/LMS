"use client";

import { Bell, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const mockNotifications: any[] = [];

export default function StudentNotificationsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Notifications
          </h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            System announcements, assessment alerts, and course updates
          </p>
        </div>
        <Button variant="outline" className="h-[44px] text-xs">Mark all as read</Button>
      </div>

      <div className="space-y-3">
        {mockNotifications.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
            <Bell className="h-10 w-10 text-[#9CA3AF] mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">No notifications yet</h3>
            <p className="text-xs text-[#6B7280] mt-1">When you get notifications, they'll show up here.</p>
          </div>
        ) : (
          mockNotifications.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-75" : "border-l-4 border-l-[#2563EB]"}>
              <CardContent className="p-6 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">{n.title}</p>
                  <p className="text-xs text-[#6B7280] leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-[#6B7280] pt-1">{n.time}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
