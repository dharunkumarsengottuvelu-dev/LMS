"use client";

import React, { useState, useMemo } from "react";
import {
  Database,
  Table as TableIcon,
  ChevronDown,
  ChevronRight,
  Key,
  Layers,
  Copy,
  Check,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SQLTableSchema } from "@/types/coding";
import { toast } from "sonner";

interface SqlTableExplorerProps {
  tables?: SQLTableSchema[];
  schemaSql?: string;
  seedSql?: string;
  sqlEngine?: string;
  onInsertSnippet?: (snippet: string) => void;
  className?: string;
}

export function SqlTableExplorer({
  tables = [],
  schemaSql = "",
  seedSql = "",
  sqlEngine = "MySQL",
  onInsertSnippet,
  className,
}: SqlTableExplorerProps) {
  const [activeTableIdx, setActiveTableIdx] = useState(0);
  const [copiedTbl, setCopiedTbl] = useState<string | null>(null);

  // If structured tables array is empty, attempt to extract tables from schemaSql DDL
  const resolvedTables: SQLTableSchema[] = useMemo(() => {
    if (tables && tables.length > 0) return tables;
    if (!schemaSql) return [];

    const extracted: SQLTableSchema[] = [];
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
    let match;

    while ((match = tableRegex.exec(schemaSql)) !== null) {
      const tblName = match[1]!;
      const colBlock = match[2]!;
      const cols = colBlock
        .split("\n")
        .map((line) => line.trim().replace(/,$/, ""))
        .filter((line) => line && !line.startsWith("--") && !line.startsWith("PRIMARY KEY (") && !line.startsWith("CONSTRAINT"))
        .map((line) => {
          const parts = line.split(/\s+/);
          const colName = parts[0] || "";
          const colType = parts[1] || "TEXT";
          const isPrimary = line.toUpperCase().includes("PRIMARY KEY");
          const isNullable = !line.toUpperCase().includes("NOT NULL");
          return {
            name: colName,
            type: colType,
            isPrimary,
            isNullable,
          };
        });

      extracted.push({
        name: tblName,
        columns: cols,
        rows: [],
      });
    }

    return extracted;
  }, [tables, schemaSql]);

  const activeTable = resolvedTables[activeTableIdx] || resolvedTables[0];

  const handleCopyTableName = (tblName: string) => {
    navigator.clipboard.writeText(tblName);
    setCopiedTbl(tblName);
    toast.success(`Copied '${tblName}' to clipboard.`);
    setTimeout(() => setCopiedTbl(null), 2000);
  };

  const handleInsertSelectAll = (tblName: string) => {
    const snippet = `SELECT * FROM ${tblName};\n`;
    if (onInsertSnippet) {
      onInsertSnippet(snippet);
      toast.success(`Inserted 'SELECT * FROM ${tblName}' into editor.`);
    } else {
      navigator.clipboard.writeText(snippet);
      toast.success(`Copied query to clipboard.`);
    }
  };

  if (resolvedTables.length === 0) {
    return (
      <div className={cn("p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500", className)}>
        <Database className="w-5 h-5 mx-auto mb-1.5 opacity-50" />
        No database tables defined for this question.
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col", className)}>
      {/* Top Header */}
      <div className="h-10 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-900">Database Schema</span>
          <Badge variant="outline" className="text-[10px] bg-white text-blue-600 font-mono">
            {sqlEngine.toUpperCase()}
          </Badge>
        </div>

        <span className="text-[11px] text-slate-500">
          {resolvedTables.length} {resolvedTables.length === 1 ? "Table" : "Tables"}
        </span>
      </div>

      {/* Table Selector Tabs */}
      <div className="flex items-center gap-1 p-2 bg-slate-100/60 border-b border-slate-200 overflow-x-auto">
        {resolvedTables.map((tbl, idx) => (
          <button
            key={tbl.name || idx}
            type="button"
            onClick={() => setActiveTableIdx(idx)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
              activeTableIdx === idx
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200/80"
            )}
          >
            <TableIcon className="w-3 h-3" />
            <span>{tbl.name}</span>
            {tbl.rows && tbl.rows.length > 0 && (
              <span className="text-[10px] opacity-80">({tbl.rows.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Active Table Details */}
      {activeTable && (
        <div className="p-3.5 space-y-4 overflow-y-auto max-h-80">
          {/* Action Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-900">{activeTable.name}</span>
              <span className="text-[11px] text-slate-500">
                ({activeTable.columns.length} columns)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopyTableName(activeTable.name)}
                className="h-6 px-2 text-[10px] text-slate-600 hover:text-slate-900 gap-1 rounded"
                title="Copy table name"
              >
                {copiedTbl === activeTable.name ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy Name
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInsertSelectAll(activeTable.name)}
                className="h-6 px-2 text-[10px] font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 gap-1 rounded"
                title="Insert SELECT * query"
              >
                <Code2 className="w-3 h-3" />
                Query Table
              </Button>
            </div>
          </div>

          {/* Columns Schema Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-[11px] border-collapse font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-1.5 px-2.5 font-bold">Column</th>
                  <th className="py-1.5 px-2.5 font-bold">Type</th>
                  <th className="py-1.5 px-2.5 font-bold text-center">Attributes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTable.columns.map((col) => (
                  <tr key={col.name} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                      {col.isPrimary && (
                        <span className="px-1 py-0.2 rounded text-[9px] bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          PK
                        </span>
                      )}
                      {col.isForeign && (
                        <span className="px-1 py-0.2 rounded text-[9px] bg-purple-50 text-purple-700 font-bold border border-purple-200">
                          FK
                        </span>
                      )}
                      <span>{col.name}</span>
                    </td>
                    <td className="py-1.5 px-2.5 text-blue-600 font-semibold">{col.type}</td>
                    <td className="py-1.5 px-2.5 text-center text-[10px] text-slate-500">
                      {col.isNullable === false ? "NOT NULL" : "NULLABLE"}
                      {col.defaultValue ? ` (default: ${col.defaultValue})` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sample Data Records Table (if available) */}
          {activeTable.rows && activeTable.rows.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Sample Records ({activeTable.rows.length})
              </span>
              <div className="rounded-lg border border-slate-200 overflow-x-auto max-h-40">
                <table className="w-full text-left text-[11px] border-collapse font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      {activeTable.columns.map((c) => (
                        <th key={c.name} className="py-1 px-2 font-bold whitespace-nowrap">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTable.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {activeTable.columns.map((c) => (
                          <td key={c.name} className="py-1 px-2 whitespace-nowrap text-slate-800">
                            {row[c.name] ?? row[c.name.toLowerCase()] ?? "NULL"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
