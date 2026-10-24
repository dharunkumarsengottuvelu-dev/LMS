"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div
          className="text-9xl font-black gradient-text"
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
            Page not found
          </h1>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm cursor-pointer px-5"
          >
            <Link href="/" className="inline-flex items-center text-white">
              <Home className="h-4 w-4 mr-2 text-white" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
