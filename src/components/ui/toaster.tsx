"use client";

import { useToast } from "@/hooks/use-toast";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999999] flex flex-col gap-2 max-w-md w-full pointer-events-none p-2 sm:p-0">
      {toasts.map(({ id, title, description, variant, open }) => {
        if (!open) return null;
        return (
          <div
            key={id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 flex items-start justify-between gap-3 animate-in slide-in-from-bottom-4 ${
              variant === "destructive"
                ? "bg-[#DC2626] text-white border-red-700 shadow-red-950/30"
                : "bg-white dark:bg-[#18181B] text-[#111827] dark:text-[#FAFAFA] border-[#E5E7EB] dark:border-[#27272A] shadow-black/15"
            }`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {variant === "destructive" ? (
                <AlertCircle className="h-5 w-5 text-white shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1 min-w-0">
                {title && <h4 className="font-semibold text-sm leading-tight break-words">{title}</h4>}
                {description && (
                  <p className={`text-xs mt-1 leading-relaxed break-words ${
                    variant === "destructive" ? "text-white/90" : "text-[#6B7280] dark:text-[#A1A1AA]"
                  }`}>
                    {description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(id)}
              className={`p-1 rounded-lg transition-colors shrink-0 ${
                variant === "destructive"
                  ? "text-white/80 hover:text-white hover:bg-white/20"
                  : "text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A]"
              }`}
              title="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

