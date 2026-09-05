"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BatchItem {
  id: string;
  name: string;
  code: string;
  trainerName: string;
  startDate: string;
  studentCount: number;
  status: string;
}

export default function InstitutionBatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchBatches = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/institution/batches");
      if (!res.ok) {
        throw new Error("Unable to load batches. Please try again.");
      }
      const d = await res.json();
      setBatches(d.batches || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to load batches. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return batches;
    const q = search.toLowerCase();
    return batches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.trainerName.toLowerCase().includes(q)
    );
  }, [batches, search]);

  return (
    <div className="space-y-6 pt-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Assigned Batches
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Directory of academic cohorts assigned to your institution with enrollment counts and trainer assignments.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="w-full max-w-sm">
          <Input
            placeholder="Search batches by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs h-9"
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          Total: {filteredBatches.length} {filteredBatches.length === 1 ? "Batch" : "Batches"}
        </span>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-accent/40 rounded-lg border border-border animate-pulse" />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-sm font-semibold text-destructive">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={fetchBatches}>
            Retry
          </Button>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center space-y-2">
          <p className="text-sm font-bold text-foreground">
            {batches.length === 0 ? "No batches assigned" : "No matching batches found"}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {batches.length === 0
              ? "Your institution does not have any assigned cohorts in the system yet. Please contact LMS administrators to allocate batches."
              : "Try adjusting your search query."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Batch Code</th>
                  <th className="py-3 px-4">Cohort Name</th>
                  <th className="py-3 px-4">Trainer</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {b.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {b.name}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {b.trainerName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {b.startDate}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                      {b.studentCount}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          b.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/institution/performance?batchId=${b.id}`}
                        className="inline-flex items-center px-3 py-1 rounded text-xs font-semibold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                      >
                        View Performance
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
