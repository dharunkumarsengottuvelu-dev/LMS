"use client";

import React, { useState, useMemo } from "react";
import { Globe, Users, Check, Boxes, Search, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
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
          <Label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
            {label}
          </Label>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold ${
              isCommon
                ? "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30"
                : selectedBatches.length > 0
                ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30"
                : "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30"
            }`}
          >
            {isCommon
              ? "Global Access (All Students)"
              : selectedBatches.length > 0
              ? `${selectedBatches.length} Batch(es) Assigned`
              : "No Batches Selected (Hidden)"}
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
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isCommon
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]"
                }`}
              >
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Common (All Students)
                  </span>
                </div>
                <Badge className="bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/20 text-[9px] font-bold px-1.5 py-0 mt-0.5">
                  Global Access
                </Badge>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                isCommon
                  ? "bg-[#2563EB] border-[#2563EB] text-white"
                  : "border-[#D1D5DB] dark:border-[#52525B]"
              }`}
            >
              {isCommon && <Check className="h-3 w-3 stroke-[3]" />}
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
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  !isCommon
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280]"
                }`}
              >
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Specific Batches
                  </span>
                </div>
                <Badge
                  className={`text-[9px] font-bold px-1.5 py-0 mt-0.5 ${
                    !isCommon && selectedBatches.length > 0
                      ? "bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/30"
                      : "bg-[#6B7280]/15 text-[#6B7280] border border-[#6B7280]/20"
                  }`}
                >
                  {!isCommon ? `${selectedBatches.length} Selected` : "Batch Restricted"}
                </Badge>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                !isCommon
                  ? "bg-[#2563EB] border-[#2563EB] text-white"
                  : "border-[#D1D5DB] dark:border-[#52525B]"
              }`}
            >
              {!isCommon && <Check className="h-3 w-3 stroke-[3]" />}
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
                ({selectedBatches.length} of {normalizedBatches.length} selected)
              </span>
            </div>

            {normalizedBatches.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAllBatches}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  {selectedBatches.length === normalizedBatches.length
                    ? "Deselect All"
                    : "Select All Batches"}
                </button>
              </div>
            )}
          </div>

          {/* Search Batches */}
          {normalizedBatches.length > 4 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B7280]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batches by name or college..."
                className="h-8 pl-8 text-xs bg-white dark:bg-[#18181B]"
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
              No batches matching "{searchQuery}".
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

                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleBatch(batchKey, batch.id)}
                      className="data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Validation Notice when 0 batches are selected in specific mode */}
          {selectedBatches.length === 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FEF2F2] dark:bg-[#450A0A]/40 border border-[#FCA5A5] text-[#DC2626] dark:text-[#F87171] text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Please check at least one batch above, or click <strong>Common (All Students)</strong>.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
