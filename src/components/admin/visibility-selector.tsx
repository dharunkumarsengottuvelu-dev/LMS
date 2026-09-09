"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface BatchOption {
  id: string;
  name: string;
  collegeName?: string;
  studentCount?: number;
}

interface VisibilitySelectorProps {
  isCommon: boolean;
  selectedBatches: string[];
  onChange: (state: { isCommon: boolean; selectedBatches: string[] }) => void;
  batches: Array<BatchOption | string | any>;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function VisibilitySelector({
  isCommon,
  selectedBatches,
  onChange,
  batches = [],
  label = "Visibility & Access Control",
  description = "Define who can view and access this content in the LMS.",
  disabled = false,
}: VisibilitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Normalize batches to uniform BatchOption structure
  const normalizedBatches: BatchOption[] = useMemo(() => {
    return (batches || []).map((b) => {
      if (typeof b === "string") {
        return { id: b, name: b };
      }
      return {
        id: b.id || b.name || "",
        name: b.name || b.batch_name || b.batchName || b.id || "Cohort Batch",
        collegeName: b.collegeName || b.college_name || "",
        studentCount: b.studentCount || b.student_count,
      };
    });
  }, [batches]);

  // Valid batch keys that exist in current database batches
  const validBatchKeys = useMemo(() => {
    const set = new Set<string>();
    normalizedBatches.forEach((b) => {
      if (b.id) set.add(b.id.toLowerCase());
      if (b.name) set.add(b.name.toLowerCase());
    });
    return set;
  }, [normalizedBatches]);

  // Active selected batches (excluding dangling deleted batches)
  const activeSelectedBatches = useMemo(() => {
    if (normalizedBatches.length === 0) return [];
    return (selectedBatches || []).filter((b) => validBatchKeys.has(b.toLowerCase()));
  }, [selectedBatches, validBatchKeys, normalizedBatches]);

  // Filter batches by search query
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return normalizedBatches;
    const q = searchQuery.toLowerCase();
    return normalizedBatches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.collegeName && b.collegeName.toLowerCase().includes(q))
    );
  }, [normalizedBatches, searchQuery]);

  // Mode 1: Select Common (Global access)
  const handleSelectCommon = () => {
    if (disabled) return;
    onChange({
      isCommon: true,
      selectedBatches: [],
    });
  };

  // Mode 2: Select Specific Batches
  const handleSelectSpecificBatchesMode = () => {
    if (disabled) return;
    if (isCommon) {
      // If currently Common, switch to specific batches mode
      onChange({
        isCommon: false,
        selectedBatches: selectedBatches.length > 0 ? selectedBatches : [],
      });
    }
  };

  // Toggle single batch selection
  const handleToggleBatch = (batchKey: string, batchId: string) => {
    if (disabled) return;

    const isMatch = (b: string) =>
      b.toLowerCase() === batchKey.toLowerCase() ||
      (batchId && b.toLowerCase() === batchId.toLowerCase());

    const exists = selectedBatches.some(isMatch);
    let nextBatches: string[];

    if (exists) {
      nextBatches = selectedBatches.filter((b) => !isMatch(b));
    } else {
      nextBatches = [...selectedBatches, batchKey];
    }

    onChange({
      isCommon: false,
      selectedBatches: nextBatches,
    });
  };

  // Select / Deselect all batches
  const handleToggleAllBatches = () => {
    if (disabled) return;
    const allNames = normalizedBatches.map((b) => b.name || b.id);
    if (selectedBatches.length === allNames.length) {
      onChange({
        isCommon: false,
        selectedBatches: [],
      });
    } else {
      onChange({
        isCommon: false,
        selectedBatches: allNames,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Status Indicator */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
            {label}
          </Label>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold ${
              isCommon
                ? "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30"
                : activeSelectedBatches.length > 0
                ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
            }`}
          >
            {isCommon
              ? "Global Access (All Students)"
              : activeSelectedBatches.length > 0
              ? `${activeSelectedBatches.length} Batch(es) Assigned`
              : "Specific / Restricted Access"}
          </Badge>
        </div>
        {description && (
          <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Two Clear Mode Cards: Common vs Specific Batches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mode Card 1: Common */}
        <div
          onClick={handleSelectCommon}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
            isCommon
              ? "bg-[#2563EB]/5 border-[#2563EB] ring-2 ring-[#2563EB]/30 shadow-xs"
              : "bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/40 hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/40"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Common (All Students)
              </div>
              <Badge className="bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/20 text-[9px] font-bold px-1.5 py-0 mt-1">
                Global Access
              </Badge>
            </div>

            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                isCommon
                  ? "border-[#2563EB] bg-[#2563EB]"
                  : "border-[#D1D5DB] dark:border-[#52525B] bg-transparent"
              }`}
            >
              {isCommon && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </div>

          <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
            Visible to every student regardless of batch or cohort assignment.
          </p>
        </div>

        {/* Mode Card 2: Specific Batches */}
        <div
          onClick={handleSelectSpecificBatchesMode}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
            !isCommon
              ? "bg-[#2563EB]/5 border-[#2563EB] ring-2 ring-[#2563EB]/30 shadow-xs"
              : "bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/40 hover:bg-[#F9FAFB] dark:hover:bg-[#27272A]/40"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Specific Batches
              </div>
              <Badge
                className={`text-[9px] font-bold px-1.5 py-0 mt-1 ${
                  !isCommon && activeSelectedBatches.length > 0
                    ? "bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/30"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700"
                }`}
              >
                {!isCommon && activeSelectedBatches.length > 0
                  ? `${activeSelectedBatches.length} Selected`
                  : "Cohort Restricted"}
              </Badge>
            </div>

            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                !isCommon
                  ? "border-[#2563EB] bg-[#2563EB]"
                  : "border-[#D1D5DB] dark:border-[#52525B] bg-transparent"
              }`}
            >
              {!isCommon && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </div>

          <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
            Visible only to students belonging to one or more selected batches.
          </p>
        </div>
      </div>

      {/* Batch Selection Subsection (When Specific Batches Mode is Selected) */}
      {!isCommon && (
        <div className="p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB]/70 dark:bg-[#111827]/40 space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Select Target Cohort Batches:
              </span>
              <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                ({activeSelectedBatches.length} of {normalizedBatches.length} selected)
              </span>
            </div>

            {normalizedBatches.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAllBatches}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  {activeSelectedBatches.length === normalizedBatches.length
                    ? "Deselect All"
                    : "Select All Batches"}
                </button>
              </div>
            )}
          </div>

          {/* Search Batches */}
          {normalizedBatches.length > 4 && (
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batches by name or college..."
                className="h-8 px-3 text-xs bg-white dark:bg-[#18181B]"
              />
            </div>
          )}

          {/* Batches Checkbox Grid */}
          {normalizedBatches.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-center text-xs text-[#6B7280]">
              No cohort batches found in database. Create a batch first in Batch Management.
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-3 text-center text-xs text-[#6B7280]">
              No batches matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredBatches.map((batch) => {
                const batchKey = batch.name || batch.id;
                const isSelected = selectedBatches.some(
                  (b) =>
                    b.toLowerCase() === batchKey.toLowerCase() ||
                    (batch.id && b.toLowerCase() === batch.id.toLowerCase())
                );

                return (
                  <div
                    key={batch.id || batchKey}
                    onClick={() => handleToggleBatch(batchKey, batch.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-[#2563EB]/10 border-[#2563EB] text-[#2563EB] ring-1 ring-[#2563EB]/40 font-semibold"
                        : "bg-white dark:bg-[#18181B] border-[#E5E7EB] dark:border-[#27272A] hover:border-[#2563EB]/40 text-[#374151] dark:text-[#D1D5DB]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate leading-tight">
                        {batch.name}
                      </p>
                      {batch.collegeName && (
                        <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] truncate mt-0.5">
                          {batch.collegeName}
                        </p>
                      )}
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleBatch(batchKey, batch.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Validation Notice when 0 batches are selected in specific mode AND batches exist */}
          {activeSelectedBatches.length === 0 && normalizedBatches.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs">
              <span>Please select at least one batch above, or choose <strong>Common (All Students)</strong>.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
