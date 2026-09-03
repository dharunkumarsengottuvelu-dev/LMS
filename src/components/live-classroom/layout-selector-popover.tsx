"use client";

import React, { useEffect, useRef } from "react";
import { Sparkles, Maximize2, LayoutGrid, Columns, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MeetingLayoutMode = "auto" | "spotlight" | "tiled" | "sidebar";

interface LayoutSelectorPopoverProps {
  isOpen: boolean;
  currentLayout: MeetingLayoutMode;
  onSelectLayout: (layout: MeetingLayoutMode) => void;
  onClose: () => void;
}

interface LayoutOption {
  id: MeetingLayoutMode;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Adjusts automatically based on activity",
    icon: Sparkles,
  },
  {
    id: "tiled",
    name: "Tiled",
    description: "See everyone in an equal responsive grid",
    icon: LayoutGrid,
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "Focus on active speaker or presentation",
    icon: Maximize2,
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Main speaker with others in side filmstrip",
    icon: Columns,
  },
];

export function LayoutSelectorPopover({
  isOpen,
  currentLayout,
  onSelectLayout,
  onClose,
}: LayoutSelectorPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Also ensure not clicking the toggle button
        const target = e.target as HTMLElement;
        if (!target.closest("[aria-label='Change layout']")) {
          onClose();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 w-72 sm:w-80 bg-white border border-[#DADCE0] rounded-2xl p-2.5 shadow-2xl animate-in zoom-in-95 duration-150 text-[#202124] select-none"
    >
      {/* Header */}
      <div className="px-2 py-1 flex items-center justify-between border-b border-[#E8EAED] pb-2 mb-1.5">
        <div>
          <h3 className="text-xs font-bold text-[#202124]">Change layout</h3>
          <p className="text-[10px] text-[#5F6368]">Choose how participants appear</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close layout dropdown"
          className="h-6 w-6 rounded-full flex items-center justify-center text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Options List */}
      <div className="space-y-1">
        {LAYOUT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = currentLayout === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => {
                onSelectLayout(opt.id);
                onClose();
              }}
              className={cn(
                "w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer group",
                isSelected
                  ? "bg-[#E8F0FE] text-[#1A73E8] font-bold border border-[#D2E3FC]"
                  : "hover:bg-[#F1F3F4] text-[#3C4043] border border-transparent"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-[#1A73E8] text-white" : "bg-[#F1F3F4] text-[#5F6368] group-hover:bg-[#E8EAED]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="truncate">
                  <span className="text-xs font-semibold block leading-tight">{opt.name}</span>
                  <span
                    className={cn(
                      "text-[10px] truncate block leading-tight mt-0.5",
                      isSelected ? "text-[#1A73E8]/80 font-normal" : "text-[#5F6368]"
                    )}
                  >
                    {opt.description}
                  </span>
                </div>
              </div>

              {isSelected && <Check className="h-4 w-4 text-[#1A73E8] shrink-0 stroke-[2.5]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
