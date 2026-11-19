"use client";

import React, { useMemo } from "react";
import { Table, AlertCircle, CheckCircle2, Clock, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SqlResultGridProps {
  data: string | Record<string, any>[] | any;
  executionTimeMs?: number;
  error?: string | null;
  className?: string;
  emptyMessage?: string;
  title?: string;
}

export function SqlResultGrid({
  data,
  executionTimeMs,
  error,
  className,
  emptyMessage = "Query executed successfully, but returned 0 rows.",
  title = "Query Result",
}: SqlResultGridProps) {
  // Parse rows and columns from input
  const { rows, columns, parseError } = useMemo(() => {
    if (!data) return { rows: [], columns: [], parseError: null };

    if (Array.isArray(data)) {
      if (data.length === 0) return { rows: [], columns: [], parseError: null };
      const cols = Array.from(
        new Set(data.flatMap((r) => (typeof r === "object" && r !== null ? Object.keys(r) : [])))
      );
      return { rows: data, columns: cols, parseError: null };
    }

    if (typeof data === "string") {
      const trimmed = data.trim();
      if (!trimmed) return { rows: [], columns: [], parseError: null };

      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const cols = Array.from(
            new Set(list.flatMap((r) => (typeof r === "object" && r !== null ? Object.keys(r) : [])))
          );
          return { rows: list, columns: cols, parseError: null };
        } catch {
          return { rows: [], columns: [], parseError: trimmed };
        }
      }
      return { rows: [], columns: [], parseError: trimmed };
    }

    return { rows: [], columns: [], parseError: null };
  }, [data]);

  // If there's an error
  if (error || parseError) {
    const errorText = error || parseError;
    return (
      <div className={cn("p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 space-y-2", className)}>
        <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>SQL Execution / Syntax Error</span>
        </div>
        <pre className="p-3 bg-white border border-rose-200 text-rose-800 rounded-lg font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-2xs">
          {errorText}
        </pre>
      </div>
    );
  }

  // If 0 rows returned
  if (rows.length === 0) {
    return (
      <div className={cn("p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-2", className)}>
        <Database className="w-6 h-6 text-slate-400 mx-auto" />
        <p className="text-xs font-semibold text-slate-700">{emptyMessage}</p>
        {executionTimeMs !== undefined && (
          <span className="text-[11px] font-mono text-slate-500">
            Execution time: {Math.round(executionTimeMs)} ms
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col", className)}>
      {/* Table Header Bar */}
      <div className="h-9 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Table className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-slate-800">{title}</span>
          <Badge variant="outline" className="text-[10px] bg-white text-slate-600 font-mono">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
          </Badge>
        </div>

        {executionTimeMs !== undefined && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{Math.round(executionTimeMs)} ms</span>
          </div>
        )}
      </div>

      {/* Structured Scrollable Grid */}
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 z-10 shadow-2xs">
            <tr>
              <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase w-10 text-center select-none">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="py-2 px-3 text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors">
                <td className="py-1.5 px-3 text-[10px] text-slate-400 text-center select-none">
                  {rIdx + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col];
                  const isNull = val === null || val === undefined;
                  const isNumber = typeof val === "number";
                  return (
                    <td
                      key={col}
                      className={cn(
                        "py-1.5 px-3 whitespace-nowrap text-xs",
                        isNull && "text-slate-400 italic",
                        isNumber && "text-emerald-700 font-semibold"
                      )}
                    >
                      {isNull ? "NULL" : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
