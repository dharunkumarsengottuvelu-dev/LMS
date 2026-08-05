"use client";

import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map(({ id, title, description, variant, open }) => {
        if (!open) return null;
        return (
          <div
            key={id}
            className={`p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 ${
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground border-destructive/50"
                : "bg-card text-card-foreground border-border"
            }`}
          >
            {title && <h4 className="font-semibold text-sm">{title}</h4>}
            {description && <p className="text-xs opacity-90 mt-1">{description}</p>}
          </div>
        );
      })}
    </div>
  );
}
