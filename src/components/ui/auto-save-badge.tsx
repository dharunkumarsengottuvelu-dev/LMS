"use client";

import React from "react";
import { Check, Cloud, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AutoSaveBadgeProps {
  isSaved: boolean;
  lastSaved: string | null;
  onManualSave?: () => void;
  className?: string;
}

export function AutoSaveBadge({
  isSaved,
  lastSaved,
  onManualSave,
  className = ""
}: AutoSaveBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {lastSaved ? (
        <Badge
          variant="outline"
          className={`h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg transition-all ${
            isSaved
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
          }`}
        >
          {isSaved ? (
            <>
              <Check className="h-3 w-3" />
              <span>Draft auto-saved {lastSaved}</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Saving draft...</span>
            </>
          )}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg bg-muted/60 text-muted-foreground border-border"
        >
          <Cloud className="h-3 w-3 opacity-60" />
          <span>Auto-save active</span>
        </Badge>
      )}

      {onManualSave && (
        <Button
          type="button"
          onClick={onManualSave}
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground gap-1 rounded-lg"
          title="Force save draft now"
        >
          <Save className="h-3 w-3" />
          <span>Save Draft</span>
        </Button>
      )}
    </div>
  );
}
