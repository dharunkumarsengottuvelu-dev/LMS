"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyStudentTrackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trackId = (params?.id as string) || "";

  useEffect(() => {
    if (trackId) {
      router.replace(`/student/practices/${trackId}`);
    } else {
      router.replace("/student/practices");
    }
  }, [trackId, router]);

  return null;
}
