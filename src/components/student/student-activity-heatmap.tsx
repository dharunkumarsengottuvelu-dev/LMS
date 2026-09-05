"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ActivityDetailItem {
  id: string;
  category: "coding" | "learning" | "practice" | "assessment" | "session";
  title: string;
  subtitle?: string;
  status?: string;
  passed?: boolean;
  score?: number;
  timeStr: string;
  timestamp: number;
}

export interface DayActivityData {
  date: string; // YYYY-MM-DD
  count: number;
  successfulCount: number;
  performancePct: number;
  intensity: 0 | 1 | 2 | 3 | 4 | 5;
  categories: {
    coding: number;
    learning: number;
    practice: number;
    assessment: number;
    session: number;
  };
  details: ActivityDetailItem[];
}

interface HeatmapResponseData {
  totalActivities: number;
  totalActiveDays: number;
  maxStreak: number;
  currentStreak: number;
  startDate: string;
  endDate: string;
  calendarDays: DayActivityData[];
  availableYears: number[];
  range: string;
}

interface StudentActivityHeatmapProps {
  studentId?: string;
  className?: string;
}

/**
 * Deterministic color intensity calculation based on activity count & performance
 */
export function calculateHeatmapIntensity(
  count: number,
  successfulCount: number
): 0 | 1 | 2 | 3 | 4 | 5 {
  if (count <= 0) return 0;
  const performancePct = Math.round((successfulCount / count) * 100);

  let tier: number;
  if (count === 1) tier = 1;
  else if (count <= 3) tier = 2;
  else if (count <= 6) tier = 3;
  else if (count <= 10) tier = 4;
  else tier = 5;

  if (performancePct < 50) {
    tier = Math.max(1, tier - 1);
  } else if (performancePct >= 90 && count >= 4) {
    tier = Math.min(5, tier + 1);
  }

  return tier as 0 | 1 | 2 | 3 | 4 | 5;
}

export function StudentActivityHeatmap({
  studentId,
  className,
}: StudentActivityHeatmapProps) {
  const [selectedRange, setSelectedRange] = useState<string>("Current");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [data, setData] = useState<HeatmapResponseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Hover Tooltip state
  const [hoveredDay, setHoveredDay] = useState<DayActivityData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; arrowLeft: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleApplyCustomDate = () => {
    if (!customStartDate || !customEndDate) return;
    const start = customStartDate <= customEndDate ? customStartDate : customEndDate;
    const end = customStartDate <= customEndDate ? customEndDate : customStartDate;

    const f = new Date(start + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const t = new Date(end + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    setSelectedRange(`${f} - ${t}`);
    setSelectedYear(null);
    setCustomRange({ start, end });
    setIsCustomModalOpen(false);
  };

  // Fetch real activity data from our dedicated API
  const fetchHeatmapData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const userTz =
          typeof Intl !== "undefined" && Intl.DateTimeFormat
            ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
            : "Asia/Kolkata";

        let url = `/api/student/activity-heatmap?range=12m&tz=${encodeURIComponent(userTz)}`;
        if (customRange) {
          url = `/api/student/activity-heatmap?startDate=${customRange.start}&endDate=${customRange.end}&tz=${encodeURIComponent(userTz)}`;
        } else if (selectedYear) {
          url = `/api/student/activity-heatmap?year=${selectedYear}&tz=${encodeURIComponent(userTz)}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (json.success && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to load student activity heatmap:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedYear, customRange]
  );

  useEffect(() => {
    fetchHeatmapData();

    // Listen for tab focus to keep real-time activity updated
    const handleFocus = () => fetchHeatmapData(true);
    window.addEventListener("focus", handleFocus);

    // Listen for custom activity update event when student submits code/tests/assignments
    const handleActivityUpdate = () => fetchHeatmapData(true);
    window.addEventListener("student-activity-updated", handleActivityUpdate);
    window.addEventListener("storage", handleActivityUpdate);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("student-activity-updated", handleActivityUpdate);
      window.removeEventListener("storage", handleActivityUpdate);
    };
  }, [fetchHeatmapData]);

  // Organize calendarDays into 53 week columns (each containing 7 days: Sun=0 to Sat=6)
  const { weekColumns, monthLabels } = useMemo(() => {
    if (!data || !data.calendarDays || data.calendarDays.length === 0) {
      return { weekColumns: [], monthLabels: [] };
    }

    const days = data.calendarDays;
    const weeks: (DayActivityData | null)[][] = [];
    const months: { label: string; weekIndex: number }[] = [];

    // Identify first day of week
    const firstDate = new Date(days[0]?.date + "T00:00:00");
    const firstDayOfWeek = firstDate.getDay(); // 0 = Sun, 6 = Sat

    let currentWeek: (DayActivityData | null)[] = [];

    // Pad beginning of first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    let lastMonth = -1;

    days.forEach((day) => {
      const d = new Date(day.date + "T00:00:00");
      const m = d.getMonth();

      // Check if new month starts in this week
      if (m !== lastMonth) {
        lastMonth = m;
        const monthName = d.toLocaleDateString("en-US", { month: "short" });
        months.push({
          label: monthName,
          weekIndex: weeks.length,
        });
      }

      currentWeek.push(day);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    // Filter month labels so adjacent ones aren't too close (< 3 weeks)
    const filteredMonths: { label: string; weekIndex: number }[] = [];
    months.forEach((m, idx) => {
      if (idx === 0) {
        filteredMonths.push(m);
      } else {
        const prev = filteredMonths[filteredMonths.length - 1];
        if (prev && m.weekIndex - prev.weekIndex >= 3) {
          filteredMonths.push(m);
        }
      }
    });

    return { weekColumns: weeks, monthLabels: filteredMonths };
  }, [data]);

  // Handle day cell hover with floating tooltip (MNC Level Alignment)
  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    day: DayActivityData
  ) => {
    if (!gridContainerRef.current) return;
    const containerRect = gridContainerRef.current.getBoundingClientRect();
    const cellRect = e.currentTarget.getBoundingClientRect();

    const cellCenterX = cellRect.left - containerRect.left + cellRect.width / 2;
    const cellTopY = cellRect.top - containerRect.top;

    const tooltipWidth = 280;
    const minLeft = 8;
    const maxLeft = Math.max(minLeft, containerRect.width - tooltipWidth - 8);
    const desiredLeft = cellCenterX - tooltipWidth / 2;
    const boxLeft = Math.max(minLeft, Math.min(maxLeft, desiredLeft));

    // Arrow points directly to the cell center, clamped inside the tooltip box
    const arrowLeft = Math.max(16, Math.min(tooltipWidth - 16, cellCenterX - boxLeft));

    setHoveredDay(day);
    setTooltipPos({
      x: boxLeft,
      y: cellTopY - 10,
      arrowLeft,
    });
  };

  const handleCellMouseLeave = () => {
    setHoveredDay(null);
    setTooltipPos(null);
  };

  // Color intensities based on real activity count and performance (Levels 0 to 5)
  const getCellColor = (intensity: number) => {
    switch (intensity) {
      case 1:
        return "bg-[#dcfce7] dark:bg-[#14532d]/50 hover:bg-[#bbf7d0] dark:hover:bg-[#14532d]/80 border border-[#bbf7d0] dark:border-[#14532d]"; // 1 activity (Very light green)
      case 2:
        return "bg-[#86efac] dark:bg-[#166534] hover:bg-[#4ade80] dark:hover:bg-[#15803d] border border-[#4ade80] dark:border-[#166534]"; // 2-3 activities (Light green)
      case 3:
        return "bg-[#22c55e] dark:bg-[#15803d] hover:bg-[#16a34a] dark:hover:bg-[#22c55e] border border-[#16a34a] dark:border-[#22c55e] shadow-[0_0_4px_rgba(34,197,94,0.25)]"; // 4-6 activities (Medium green)
      case 4:
        return "bg-[#15803d] dark:bg-[#22c55e] hover:bg-[#166534] dark:hover:bg-[#4ade80] border border-[#166534] dark:border-[#4ade80] shadow-[0_0_6px_rgba(21,128,61,0.35)]"; // 7-10 activities (Dark green)
      case 5:
        return "bg-[#14532d] dark:bg-[#4ade80] hover:bg-[#052e16] dark:hover:bg-[#86efac] border border-[#052e16] dark:border-[#86efac] shadow-[0_0_8px_rgba(20,83,45,0.45)]"; // 10+ activities (Strongest green)
      case 0:
      default:
        return "bg-[#F3F4F6] dark:bg-[#27272A] hover:bg-[#E5E7EB] dark:hover:bg-[#3F3F46] border border-[#E5E7EB] dark:border-white/[0.03]"; // Empty / 0 activities
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-white dark:bg-[#18181B] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] shadow-sm p-6 sm:p-7 space-y-6 select-none transition-all",
        className
      )}
    >
      {/* ════════════════════════════════════════════════════════════
          TOP BAR: COUNTER | STATS | RANGE DROPDOWN
      ════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
        {/* Left: Total Activities in selected range */}
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-extrabold text-[#111827] dark:text-white tracking-tight font-mono">
            {isLoading ? "..." : data?.totalActivities ?? 0}
          </span>
          <span className="text-xs sm:text-sm text-[#4B5563] dark:text-zinc-300 font-medium">
            {selectedRange === "Current"
              ? "activities in the past one year"
              : `activities in ${selectedRange}`}
          </span>
          {isRefreshing && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium ml-2">
              Syncing...
            </span>
          )}
        </div>

        {/* Right: Metrics (Active Days, Max Streak, Range Dropdown) */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#6B7280] dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span>Total active days:</span>
            <span className="font-bold text-[#111827] dark:text-white font-mono text-xs sm:text-sm">
              {isLoading ? "—" : data?.totalActiveDays ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Max streak:</span>
            <span className="font-bold text-[#111827] dark:text-white font-mono text-xs sm:text-sm">
              {isLoading ? "—" : data?.maxStreak ?? 0}
            </span>
          </div>

          {data && data.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Streak:</span>
              <span className="font-bold font-mono text-xs sm:text-sm">
                {data.currentStreak}d
              </span>
            </div>
          )}

          {/* Time Range Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#27272A] hover:bg-[#F9FAFB] dark:hover:bg-[#3F3F46] text-[#374151] dark:text-zinc-200 text-xs font-semibold border border-[#E5E7EB] dark:border-zinc-700/60 shadow-2xs transition-all focus:outline-hidden">
              <span>{selectedRange}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[#374151] dark:text-zinc-200 shadow-xl rounded-xl text-xs min-w-[140px] p-1"
            >
              <DropdownMenuItem
                onClick={() => {
                  setSelectedRange("Current");
                  setSelectedYear(null);
                  setCustomRange(null);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 cursor-pointer font-medium hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 text-[#374151] dark:text-zinc-300",
                  selectedRange === "Current" && "bg-[#F3F4F6] dark:bg-zinc-800 font-bold text-[#111827] dark:text-white"
                )}
              >
                Current (12M)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedRange("2026");
                  setSelectedYear(2026);
                  setCustomRange(null);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 cursor-pointer font-medium hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 text-[#374151] dark:text-zinc-300",
                  selectedRange === "2026" && "bg-[#F3F4F6] dark:bg-zinc-800 font-bold text-[#111827] dark:text-white"
                )}
              >
                2026
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedRange("2025");
                  setSelectedYear(2025);
                  setCustomRange(null);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 cursor-pointer font-medium hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 text-[#374151] dark:text-zinc-300",
                  selectedRange === "2025" && "bg-[#F3F4F6] dark:bg-zinc-800 font-bold text-[#111827] dark:text-white"
                )}
              >
                2025
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-[#E5E7EB] dark:bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => {
                  setIsCustomModalOpen(true);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 cursor-pointer font-medium hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 text-[#374151] dark:text-zinc-300",
                  customRange !== null && "bg-[#F3F4F6] dark:bg-zinc-800 font-bold text-[#111827] dark:text-white"
                )}
              >
                Custom Date...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          HEATMAP GRID & MONTH LABELS
      ════════════════════════════════════════════════════════════ */}
      <div className="relative" ref={gridContainerRef}>
        {isLoading ? (
          /* Sleek Light/Dark Skeleton */
          <div className="h-32 flex items-center justify-center">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Loading student activity graph...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            <div className="w-full min-w-[700px]">
              {/* Day cells grid (53 columns x 7 rows) */}
              <div className="w-full flex justify-between gap-[2px] sm:gap-[3px]">
                {weekColumns.map((week, wIdx) => (
                  <div key={`w-${wIdx}`} className="flex-1 flex flex-col gap-[2px] sm:gap-[3px] min-w-[8px]">
                    {week.map((day, dIdx) => {
                      if (!day) {
                        return (
                          <div
                            key={`empty-${wIdx}-${dIdx}`}
                            className="w-full aspect-square rounded-[2.5px] opacity-0 pointer-events-none"
                          />
                        );
                      }

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => handleCellMouseEnter(e, day)}
                          onMouseLeave={handleCellMouseLeave}
                          className={cn(
                            "w-full aspect-square rounded-[2.5px] transition-transform duration-100 cursor-pointer",
                            getCellColor(day.intensity),
                            hoveredDay?.date === day.date && "scale-125 z-10 ring-2 ring-emerald-500"
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Month Labels underneath columns */}
              <div className="relative w-full h-6 mt-2 text-[10px] text-[#6B7280] dark:text-zinc-400 font-medium">
                {monthLabels.map((m, idx) => (
                  <span
                    key={`${m.label}-${idx}`}
                    className="absolute"
                    style={{
                      left: `${(m.weekIndex / 53) * 100}%`,
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            FLOATING INTERACTIVE TOOLTIP (MNC LIGHT ENTERPRISE THEME)
        ════════════════════════════════════════════════════════════ */}
        {hoveredDay && tooltipPos && (() => {
          const [yStr, mStr, dStr] = hoveredDay.date.split("-");
          const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
          const dateFormatted = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div
              className="absolute z-50 pointer-events-none -translate-y-full mb-2 transition-all duration-75"
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
              }}
            >
              <div className="w-[280px] bg-white text-slate-900 rounded-xl border border-slate-200 shadow-[0_12px_36px_rgba(0,0,0,0.14)] p-3.5 space-y-2.5 relative">
                {/* Tooltip Header / Summary */}
                <div className="border-b border-slate-100 pb-2">
                  <p className="text-xs font-semibold text-slate-500">
                    {dateFormatted}
                  </p>

                  {hoveredDay.count === 0 ? (
                    <p className="text-xs font-medium text-slate-700 mt-1">
                      No activity
                    </p>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">
                          {hoveredDay.count} activit{hoveredDay.count === 1 ? "y" : "ies"}
                        </p>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            hoveredDay.intensity >= 4
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : hoveredDay.intensity >= 2
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          Level {hoveredDay.intensity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {hoveredDay.successfulCount ?? hoveredDay.count} completed successfully
                      </p>
                      <p className="text-xs font-semibold text-emerald-600">
                        Performance: {hoveredDay.performancePct ?? 100}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Categorized Actions Details (Only when activities exist) */}
                {hoveredDay.count > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-[11px] scrollbar-thin scrollbar-thumb-slate-200">
                    {/* Category Breakdown Badges */}
                    <div className="flex flex-wrap gap-1 pb-1">
                      {hoveredDay.categories.coding > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded text-[10px] font-medium">
                          {hoveredDay.categories.coding} Coding
                        </span>
                      )}
                      {hoveredDay.categories.practice > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded text-[10px] font-medium">
                          {hoveredDay.categories.practice} Practice
                        </span>
                      )}
                      {hoveredDay.categories.assessment > 0 && (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded text-[10px] font-medium">
                          {hoveredDay.categories.assessment} Test
                        </span>
                      )}
                      {hoveredDay.categories.learning > 0 && (
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 rounded text-[10px] font-medium">
                          {hoveredDay.categories.learning} Learning
                        </span>
                      )}
                      {hoveredDay.categories.session > 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded text-[10px] font-medium">
                          {hoveredDay.categories.session} Live Session
                        </span>
                      )}
                    </div>

                    {/* Individual Action Items */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      {hoveredDay.details.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  item.passed ? "bg-emerald-500" : "bg-rose-500"
                                )}
                              />
                              <p className="font-semibold text-slate-800 truncate">
                                {item.title}
                              </p>
                            </div>
                            {item.subtitle && (
                              <p className="text-[10px] text-slate-500 pl-3 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono shrink-0 pt-0.5">
                            {item.timeStr}
                          </span>
                        </div>
                      ))}

                      {hoveredDay.details.length > 6 && (
                        <p className="text-[10px] text-slate-400 text-center italic pt-0.5">
                          +{hoveredDay.details.length - 6} more activities
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Mathematically Aligned Tooltip Arrow */}
                <div
                  className="w-2.5 h-2.5 bg-white border-r border-b border-slate-200 rotate-45 absolute -bottom-1.5"
                  style={{
                    left: `${tooltipPos.arrowLeft}px`,
                    transform: "translateX(-50%) rotate(45deg)",
                  }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* ════════════════════════════════════════════════════════════
          BOTTOM LEGEND: LESS [ ][ ][ ][ ][ ][ ] MORE
      ════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-end pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] text-xs text-[#6B7280] dark:text-zinc-400">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-white/[0.03]" title="0 activities" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#dcfce7] dark:bg-[#14532d]/50 border border-[#bbf7d0]" title="1 activity (Very light green)" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#86efac] dark:bg-[#166534] border border-[#4ade80]" title="2–3 activities (Light green)" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#22c55e] dark:bg-[#15803d] border border-[#16a34a]" title="4–6 activities (Medium green)" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#15803d] dark:bg-[#22c55e] border border-[#166534]" title="7–10 activities (Dark green)" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#14532d] dark:bg-[#4ade80] border border-[#052e16]" title="10+ activities (Strongest green)" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Custom Activity Date Range Modal Dialog */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Custom Activity Date Range
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Select a start date and end date to filter your activity heatmap and streak history.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">From Date</Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">To Date</Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCustomModalOpen(false)}
              className="text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyCustomDate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
