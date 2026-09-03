"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Calendar,
  Info,
  ChevronDown,
  Flame,
  Award,
  CheckCircle2,
  XCircle,
  Code2,
  BookOpen,
  Dumbbell,
  Clock,
  RotateCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  intensity: 0 | 1 | 2 | 3 | 4;
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

export function StudentActivityHeatmap({
  studentId,
  className,
}: StudentActivityHeatmapProps) {
  const [selectedRange, setSelectedRange] = useState<string>("Current");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [data, setData] = useState<HeatmapResponseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Hover Tooltip state
  const [hoveredDay, setHoveredDay] = useState<DayActivityData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Fetch real activity data from our dedicated API
  const fetchHeatmapData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        let url = `/api/student/activity-heatmap?range=12m`;
        if (selectedYear) {
          url = `/api/student/activity-heatmap?year=${selectedYear}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (json.success && json.data) {
          let resData: HeatmapResponseData = json.data;

          // Merge any unsynced client-side coding submissions from localStorage if available
          if (typeof window !== "undefined") {
            try {
              const rawLocal = localStorage.getItem("edunexus_coding_submissions_v1");
              if (rawLocal) {
                const localSubs = JSON.parse(rawLocal);
                if (Array.isArray(localSubs) && localSubs.length > 0) {
                  const dayMap = new Map<string, DayActivityData>();
                  resData.calendarDays.forEach((d) => dayMap.set(d.date, { ...d }));

                  let addedCount = 0;
                  localSubs.forEach((sub: any) => {
                    const tsStr = sub.created_at || sub.submitted_at;
                    if (!tsStr) return;
                    const ts = new Date(tsStr).getTime();
                    const iso = new Date(ts).toISOString().slice(0, 10);
                    const day = dayMap.get(iso);
                    if (day) {
                      // Check if already in details
                      const exists = day.details.some(
                        (item) => item.id === sub.id || (item.category === "coding" && Math.abs(item.timestamp - ts) < 2000)
                      );
                      if (!exists) {
                        const isAccepted = sub.status === "accepted" || sub.status === "passed";
                        day.count += 1;
                        day.categories.coding += 1;
                        day.details.unshift({
                          id: sub.id || `local-${ts}`,
                          category: "coding",
                          title: isAccepted ? `Solved Problem` : `Submitted Code`,
                          subtitle: `Language: ${(sub.language || "code").toUpperCase()} • ${isAccepted ? "Accepted" : "Wrong Answer"}`,
                          status: isAccepted ? "Accepted" : "Wrong Answer",
                          passed: isAccepted,
                          timeStr: new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                          timestamp: ts,
                        });
                        addedCount += 1;

                        // Recalculate intensity
                        if (day.count <= 0) day.intensity = 0;
                        else if (day.count <= 2) day.intensity = 1;
                        else if (day.count <= 5) day.intensity = 2;
                        else if (day.count <= 10) day.intensity = 3;
                        else day.intensity = 4;
                      }
                    }
                  });

                  if (addedCount > 0) {
                    const updatedCalendar = Array.from(dayMap.values()).sort((a, b) =>
                      a.date.localeCompare(b.date)
                    );
                    let totAct = 0;
                    let totActiveDays = 0;
                    let maxStr = 0;
                    let runStr = 0;

                    updatedCalendar.forEach((d) => {
                      totAct += d.count;
                      if (d.count > 0) {
                        totActiveDays += 1;
                        runStr += 1;
                        if (runStr > maxStr) maxStr = runStr;
                      } else {
                        runStr = 0;
                      }
                    });

                    resData = {
                      ...resData,
                      totalActivities: totAct,
                      totalActiveDays: totActiveDays,
                      maxStreak: maxStr,
                      calendarDays: updatedCalendar,
                    };
                  }
                }
              }
            } catch (err) {
              console.warn("Client localStorage submission merge skipped:", err);
            }
          }

          setData(resData);
        }
      } catch (err) {
        console.error("Failed to load student activity heatmap:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedYear]
  );

  useEffect(() => {
    fetchHeatmapData();

    // Listen for tab focus to keep real-time activity updated
    const handleFocus = () => fetchHeatmapData(true);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
    const firstDate = new Date(days[0]?.date || new Date().toISOString());
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

  // Handle day cell hover with floating tooltip
  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    day: DayActivityData
  ) => {
    if (!gridContainerRef.current) return;
    const containerRect = gridContainerRef.current.getBoundingClientRect();
    const cellRect = e.currentTarget.getBoundingClientRect();

    setHoveredDay(day);
    setTooltipPos({
      x: cellRect.left - containerRect.left + cellRect.width / 2,
      y: cellRect.top - containerRect.top - 8,
    });
  };

  const handleCellMouseLeave = () => {
    setHoveredDay(null);
    setTooltipPos(null);
  };

  // Color intensities based on real activity (Clean Light UI with Dark mode fallback)
  const getCellColor = (intensity: number) => {
    switch (intensity) {
      case 1:
        return "bg-[#bbf7d0] dark:bg-[#14532d] hover:bg-[#86efac] dark:hover:bg-[#166534] border border-[#86efac]/80 dark:border-[#166534]/60"; // 1-2 activities
      case 2:
        return "bg-[#4ade80] dark:bg-[#16a34a] hover:bg-[#22c55e] dark:hover:bg-[#22c55e] border border-[#22c55e]/80 dark:border-[#22c55e]/40"; // 3-5 activities
      case 3:
        return "bg-[#22c55e] dark:bg-[#22c55e] hover:bg-[#16a34a] dark:hover:bg-[#4ade80] border border-[#16a34a] shadow-[0_0_6px_rgba(34,197,94,0.3)]"; // 6-10 activities
      case 4:
        return "bg-[#15803d] dark:bg-[#4ade80] hover:bg-[#166534] dark:hover:bg-[#86efac] border border-[#166534] shadow-[0_0_8px_rgba(21,128,61,0.4)]"; // 10+ activities
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
          <div className="group relative cursor-pointer inline-flex items-center">
            <Info className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-zinc-500 hover:text-[#4B5563] dark:hover:text-zinc-300 transition-colors ml-0.5" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-50 pointer-events-none leading-relaxed">
              <span>Calculated dynamically from real verified student actions across coding, courses, practices, assessments, and active sessions.</span>
            </div>
          </div>
          {isRefreshing && (
            <RotateCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin ml-2" />
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
              <Flame className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500 animate-pulse" />
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
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-zinc-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[#374151] dark:text-zinc-200 shadow-xl rounded-xl text-xs min-w-[130px] p-1"
            >
              <DropdownMenuItem
                onClick={() => {
                  setSelectedRange("Current");
                  setSelectedYear(null);
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
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 cursor-pointer font-medium hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 text-[#374151] dark:text-zinc-300",
                  selectedRange === "2025" && "bg-[#F3F4F6] dark:bg-zinc-800 font-bold text-[#111827] dark:text-white"
                )}
              >
                2025
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
          /* Sleek Dark Skeleton */
          <div className="h-32 flex items-center justify-center">
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <RotateCw className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Loading student activity graph...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            <div className="inline-block min-w-full">
              {/* Day cells grid (53 columns x 7 rows) */}
              <div className="flex gap-[4px]">
                {weekColumns.map((week, wIdx) => (
                  <div key={`w-${wIdx}`} className="flex flex-col gap-[4px]">
                    {week.map((day, dIdx) => {
                      if (!day) {
                        return (
                          <div
                            key={`empty-${wIdx}-${dIdx}`}
                            className="w-[12px] h-[12px] sm:w-[13px] sm:h-[13px] rounded-[2.5px] opacity-0 pointer-events-none"
                          />
                        );
                      }

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => handleCellMouseEnter(e, day)}
                          onMouseLeave={handleCellMouseLeave}
                          className={cn(
                            "w-[12px] h-[12px] sm:w-[13px] sm:h-[13px] rounded-[2.5px] transition-transform duration-100 cursor-pointer",
                            getCellColor(day.intensity),
                            hoveredDay?.date === day.date && "scale-125 z-10 ring-2 ring-white"
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Month Labels underneath columns */}
              <div className="relative h-6 mt-2 text-[10px] text-[#6B7280] dark:text-zinc-400 font-medium">
                {monthLabels.map((m, idx) => (
                  <span
                    key={`${m.label}-${idx}`}
                    className="absolute"
                    style={{
                      left: `${m.weekIndex * 17}px`,
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
            FLOATING INTERACTIVE TOOLTIP
        ════════════════════════════════════════════════════════════ */}
        {hoveredDay && tooltipPos && (
          <div
            className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-2.5 transition-all duration-75"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
            }}
          >
            <div className="w-72 bg-zinc-950/95 backdrop-blur-md text-white rounded-xl border border-zinc-700/80 shadow-2xl p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
              {/* Header: Date + Total count */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400">
                    {new Date(hoveredDay.date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {hoveredDay.count === 0
                      ? "No activity"
                      : `${hoveredDay.count} activit${hoveredDay.count === 1 ? "y" : "ies"}`}
                  </p>
                </div>

                {hoveredDay.count > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      hoveredDay.intensity === 4
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : hoveredDay.intensity >= 2
                        ? "bg-green-500/20 text-green-400 border-green-500/40"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700"
                    )}
                  >
                    Level {hoveredDay.intensity}
                  </span>
                )}
              </div>

              {/* Categorized Actions Details */}
              {hoveredDay.count === 0 ? (
                <p className="text-[11px] text-zinc-500 italic py-1">
                  No learning activities recorded on this date.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-[11px] scrollbar-thin scrollbar-thumb-zinc-700">
                  {/* Category Breakdown Badges */}
                  <div className="flex flex-wrap gap-1 pb-1">
                    {hoveredDay.categories.coding > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-mono">
                        {hoveredDay.categories.coding} Coding
                      </span>
                    )}
                    {hoveredDay.categories.learning > 0 && (
                      <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] font-mono">
                        {hoveredDay.categories.learning} Learning
                      </span>
                    )}
                    {hoveredDay.categories.practice > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono">
                        {hoveredDay.categories.practice} Practice
                      </span>
                    )}
                    {hoveredDay.categories.assessment > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-mono">
                        {hoveredDay.categories.assessment} Exam
                      </span>
                    )}
                    {hoveredDay.categories.session > 0 && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-mono">
                        {hoveredDay.categories.session} Session
                      </span>
                    )}
                  </div>

                  {/* Individual Action Items */}
                  <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                    {hoveredDay.details.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-2 p-1.5 rounded-md bg-zinc-900/80 border border-zinc-800/60 text-[11px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {item.category === "coding" ? (
                              item.passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )
                            ) : item.category === "learning" ? (
                              <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : item.category === "practice" ? (
                              <Dumbbell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : item.category === "assessment" ? (
                              <Award className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <p className="font-semibold text-zinc-100 truncate">
                              {item.title}
                            </p>
                          </div>
                          {item.subtitle && (
                            <p className="text-[10px] text-zinc-400 pl-5 truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>

                        <span className="text-[10px] text-zinc-500 font-mono shrink-0 pt-0.5">
                          {item.timeStr}
                        </span>
                      </div>
                    ))}

                    {hoveredDay.details.length > 6 && (
                      <p className="text-[10px] text-zinc-500 text-center italic pt-0.5">
                        +{hoveredDay.details.length - 6} more activities on this date
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Little Tooltip Arrow */}
            <div className="w-2.5 h-2.5 bg-zinc-950 border-r border-b border-zinc-700/80 rotate-45 mx-auto -mt-1.5" />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          BOTTOM LEGEND: LESS [ ][ ][ ][ ][ ] MORE
      ════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-end pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] text-xs text-[#6B7280] dark:text-zinc-400">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-white/[0.03]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#bbf7d0] dark:bg-[#14532d]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#4ade80] dark:bg-[#16a34a]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#22c55e] dark:bg-[#22c55e]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#15803d] dark:bg-[#4ade80]" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
