"use client";

import { use } from "react";
import { LiveInspectionHub } from "@/components/admin/live-inspection-hub";
import { AdminTopNav } from "@/components/layouts/admin-top-nav";

export default function InspectLiveTestPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  
  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#09090B] font-sans">
      <AdminTopNav />
      <div className="flex pt-[68px]">
        <main className="flex-1 p-8 h-[calc(100vh-68px)] overflow-hidden">
          <div className="w-full h-full">
            <LiveInspectionHub examId={unwrappedParams.id} />
          </div>
        </main>
      </div>
    </div>
  );
}
