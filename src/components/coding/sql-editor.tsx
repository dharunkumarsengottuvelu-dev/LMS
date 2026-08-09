"use client";

import { useState } from "react";
import { Database, Table, Play, Clock, CheckCircle2, AlertCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SQLExecutionService } from "@/services/sql-execution.service";
import type { SQLQueryResult, SQLDatasetSchema } from "@/types/coding";
import { cn } from "@/lib/utils";

interface SQLEditorProps {
  datasetName?: string;
  defaultQuery?: string;
  onExecuteQuery?: (query: string) => void;
  height?: string;
}

export function SQLEditor({
  datasetName = "university",
  defaultQuery = "SELECT * FROM students WHERE mark > 80;",
  height = "450px",
}: SQLEditorProps) {
  const [query, setQuery] = useState<string>(defaultQuery);
  const [schema] = useState<SQLDatasetSchema>(() => SQLExecutionService.getDatasetSchema(datasetName));
  const [selectedTable, setSelectedTable] = useState<string>(schema.tables[0]?.name ?? "students");
  const [queryResult, setQueryResult] = useState<SQLQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleRunQuery = () => {
    setIsExecuting(true);
    setTimeout(() => {
      const result = SQLExecutionService.executeQuery(query, datasetName);
      setQueryResult(result);
      setIsExecuting(false);
    }, 150);
  };

  const activeTableObj = schema.tables.find((t) => t.name === selectedTable) ?? schema.tables[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-[#18181B] text-white border border-[#27272A] rounded-xl overflow-hidden p-3" style={{ minHeight: height }}>
      {/* Left Sidebar: Database Schema Inspector (1 col) */}
      <div className="lg:col-span-1 bg-[#09090B] border border-[#27272A] rounded-lg p-3 space-y-3 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#27272A]">
            <Database className="h-4 w-4 text-[#2563EB]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Database Schema</span>
            <Badge variant="outline" className="ml-auto text-[10px] border-[#2563EB]/40 text-[#2563EB] bg-[#2563EB]/10">
              {schema.name}
            </Badge>
          </div>

          {/* Tables List */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-white/50 px-1">Tables</span>
            {schema.tables.map((tbl) => (
              <button
                key={tbl.name}
                onClick={() => setSelectedTable(tbl.name)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors text-left",
                  selectedTable === tbl.name
                    ? "bg-[#2563EB] text-white font-bold"
                    : "text-white/70 hover:bg-[#27272A] hover:text-white"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Table className="h-3.5 w-3.5" />
                  {tbl.name}
                </span>
                <span className="text-[10px] opacity-70">({tbl.rows.length})</span>
              </button>
            ))}
          </div>

          {/* Columns Tree for Selected Table */}
          {activeTableObj && (
            <div className="pt-2 border-t border-[#27272A] space-y-1">
              <span className="text-[11px] font-semibold text-white/50 px-1">Columns in '{activeTableObj.name}'</span>
              <div className="max-h-44 overflow-auto space-y-1 pr-1">
                {activeTableObj.columns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between text-[11px] font-mono px-2 py-1 bg-[#18181B] border border-[#27272A] rounded">
                    <span className="text-white/90 flex items-center gap-1">
                      {col.isPrimary && <span className="text-amber-400 font-bold text-[9px] px-1 bg-amber-400/10 rounded">PK</span>}
                      {col.name}
                    </span>
                    <span className="text-white/40 text-[10px]">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setQuery(`SELECT * FROM ${selectedTable};`)}
          className="w-full text-xs bg-[#18181B] border-[#27272A] text-white hover:bg-[#27272A] h-7"
        >
          <Layers className="h-3 w-3 mr-1" /> Select * From {selectedTable}
        </Button>
      </div>

      {/* Right Column: SQL Query Editor & Dataset Results (3 cols) */}
      <div className="lg:col-span-3 flex flex-col gap-3">
        {/* SQL Text Area & Execute Toolbar */}
        <div className="bg-[#09090B] border border-[#27272A] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/70 flex items-center gap-1.5 font-mono">
              <span>MySQL Console</span>
            </span>
            <Button
              size="sm"
              onClick={handleRunQuery}
              disabled={isExecuting}
              className="h-7 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold gap-1.5 px-3"
            >
              <Play className="h-3 w-3 fill-current" />
              {isExecuting ? "Executing..." : "Run SQL Query"}
            </Button>
          </div>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-32 p-3 font-mono text-xs bg-[#18181B] border border-[#27272A] rounded-md text-emerald-400 focus:outline-none focus:border-[#2563EB] resize-none leading-relaxed"
            placeholder="Write SQL Query e.g. SELECT * FROM students WHERE mark > 80;"
          />
        </div>

        {/* SQL Execution Result Table Panel */}
        <div className="bg-[#09090B] border border-[#27272A] rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
          {!queryResult ? (
            <div className="h-40 flex items-center justify-center text-white/30 text-xs font-mono">
              Execute an SQL query to view output dataset
            </div>
          ) : queryResult.error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4" /> SQL Execution Failed
              </div>
              <p>{queryResult.error}</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Query OK
                  </Badge>
                  <span className="text-white/60 font-mono text-[11px]">{queryResult.rowCount} rows returned</span>
                </div>
                <span className="text-white/40 font-mono text-[11px] flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {queryResult.executionTimeMs}ms
                </span>
              </div>

              {/* Data Grid Table */}
              <div className="flex-1 overflow-auto border border-[#27272A] rounded">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-[#18181B] border-b border-[#27272A]">
                      {queryResult.columns.map((col) => (
                        <th key={col} className="p-2 border-r border-[#27272A] font-semibold text-white/80 uppercase text-[10px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-[#27272A]/50 hover:bg-[#18181B]">
                        {queryResult.columns.map((col) => (
                          <td key={col} className="p-2 border-r border-[#27272A]/50 text-white/90">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-white/30 italic">NULL</span>}
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
      </div>
    </div>
  );
}
