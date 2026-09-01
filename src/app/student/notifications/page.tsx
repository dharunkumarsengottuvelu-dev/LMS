"use client";

import { Bell, Check, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockNotifications: any[] = [];

export default function StudentNotificationsPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 pb-12 w-full">
      {/* Top Header - Spacious Enterprise MNC Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left Column: Breadcrumb + Title + Subtitle */}
          <div className="space-y-2 flex-1 min-w-0">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors group py-0.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                <span>Back</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-normal">
              Notifications & Announcements
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal">
              System announcements, assessment alerts, and course updates
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center pt-2 lg:pt-0">
            <Button variant="outline" className="h-10 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 shadow-2xs">
              Mark all as read
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {mockNotifications.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
            <Bell className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No notifications yet</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">When you get notifications, they'll show up here.</p>
          </div>
        ) : (
          mockNotifications.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-75" : "border-l-4 border-l-blue-600"}>
              <CardContent className="p-6 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-slate-400 pt-1">{n.time}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
