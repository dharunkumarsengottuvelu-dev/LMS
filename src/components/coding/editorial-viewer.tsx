"use client";

import React, { useState } from "react";
import {
  Lightbulb,
  Code2,
  Clock,
  Database,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Terminal,
} from "lucide-react";

interface ApproachItem {
  name?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  explanation?: string;
  code?: Record<string, string>;
}

export interface EditorialViewerProps {
  editorial?: {
    overview?: string;
    approaches?: ApproachItem[];
  } | null;
}

/**
 * Format single-line Python code into properly indented multi-line code
 */
function beautifyPythonCode(rawCode: string): string {
  if (rawCode.includes("\n")) {
    return rawCode.trim();
  }

  // Tokenize / split by keywords
  let code = rawCode.trim();

  // Common statements to put on new lines
  const statementBreakpoints = [
    { pattern: /\b(def \w+\([^)]*\):)\s*/g, replace: "\n$1\n    " },
    { pattern: /\b(class \w+(?:\([^)]*\))?:)\s*/g, replace: "\n$1\n    " },
    { pattern: /\b(for \w+(?:,\s*\w+)* in [^:]+:)\s*/g, replace: "\n    $1\n        " },
    { pattern: /\b(while [^:]+:)\s*/g, replace: "\n    $1\n        " },
    { pattern: /\b(if [^:]+:)\s*/g, replace: "\n        $1\n            " },
    { pattern: /\b(elif [^:]+:)\s*/g, replace: "\n        $1\n            " },
    { pattern: /\b(else:)\s*/g, replace: "\n        $1\n            " },
    { pattern: /\b(print\([^)]*\))\s*/g, replace: "\n            $1\n" },
    { pattern: /\b(return(?:\s+[^;\n]+)?)\s*/g, replace: "\n            $1\n" },
    { pattern: /\b(seen\[[^\]]+\]\s*=\s*[^;\n]+)\s*/g, replace: "\n        $1\n" },
    { pattern: /\b(complement\s*=\s*[^;\n]+)\s*/g, replace: "\n        $1\n" },
    { pattern: /\b(if __name__\s*==\s*["']__main__["']:\s*)/g, replace: "\n\n$1\n    " },
    { pattern: /\b(solve\(\))\s*$/g, replace: "\n    $1" },
  ];

  for (const { pattern, replace } of statementBreakpoints) {
    code = code.replace(pattern, replace);
  }

  // Clean up extra blank lines
  return code
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => !(l.trim() === "" && arr[i - 1]?.trim() === ""))
    .join("\n")
    .trim();
}

/**
 * Parses raw overview string into structured sections:
 * - approach title & text
 * - reference code snippet & language
 * - time & space complexity
 */
function parseOverview(raw: string) {
  if (!raw) return null;

  const text = raw.trim();

  // 1. Look for code block markdown (```lang ... ```)
  const markdownCodeMatch = text.match(/```([a-zA-Z0-9+#_]+)?\n?([\s\S]*?)```/);
  if (markdownCodeMatch) {
    const lang = markdownCodeMatch[1] || "python";
    const codeSnippet = (markdownCodeMatch[2] || "").trim();
    const matchIdx = markdownCodeMatch.index ?? 0;
    const beforeCode = text.substring(0, matchIdx).trim();
    const afterCode = text.substring(matchIdx + markdownCodeMatch[0].length).trim();

    return {
      approachTitle: "Algorithmic Approach",
      approachText: beforeCode,
      code: {
        language: lang,
        snippet: codeSnippet,
      },
      complexityText: afterCode,
      timeComplexity: extractComplexity(afterCode, "Time"),
      spaceComplexity: extractComplexity(afterCode, "Space"),
    };
  }

  // 2. Look for keywords: "Python Reference Solution", "Reference Solution", "Solution Code", or "def solve():"
  const solutionMarkerRegex = /(?:(Python|Java|C\+\+|JavaScript|TypeScript|SQL)?\s*(?:Reference Solution|Solution Code|Implementation):?|(def \w+\([^)]*\):))/i;
  const solMatch = text.match(solutionMarkerRegex);

  const complexityMarkerRegex = /(?:Complexity Analysis|Time Complexity:)/i;
  const compMatch = text.match(complexityMarkerRegex);

  if (solMatch && solMatch.index !== undefined) {
    const beforeSol = text.substring(0, solMatch.index).trim();
    const lang = solMatch[1] || "python";

    let codeSection = "";
    let afterSol = "";

    if (compMatch && compMatch.index !== undefined && compMatch.index > solMatch.index) {
      codeSection = text.substring(solMatch.index, compMatch.index).trim();
      afterSol = text.substring(compMatch.index).trim();
    } else {
      codeSection = text.substring(solMatch.index).trim();
    }

    // Strip the label from codeSection
    const cleanCode = codeSection
      .replace(/^(?:Python|Java|C\+\+|JavaScript|TypeScript|SQL)?\s*(?:Reference Solution|Solution Code|Implementation):?\s*/i, "")
      .trim();

    // Extract approach title if starts with "Approach:"
    let approachTitle = "Algorithmic Approach";
    let approachBody = beforeSol;
    const approachPrefixMatch = beforeSol.match(/^Approach:\s*([^\n.]+)(?:\.|\n|\s)/i);
    if (approachPrefixMatch && approachPrefixMatch[0] && approachPrefixMatch[1]) {
      approachTitle = `Approach: ${approachPrefixMatch[1].trim()}`;
      approachBody = beforeSol.substring(approachPrefixMatch[0].length).trim();
    }

    return {
      approachTitle,
      approachText: approachBody,
      code: {
        language: lang,
        snippet: beautifyPythonCode(cleanCode),
      },
      complexityText: afterSol,
      timeComplexity: extractComplexity(afterSol, "Time"),
      spaceComplexity: extractComplexity(afterSol, "Space"),
    };
  }

  // Fallback: Check if there's complexity analysis without inline code
  if (compMatch && compMatch.index !== undefined) {
    const beforeComp = text.substring(0, compMatch.index).trim();
    const afterComp = text.substring(compMatch.index).trim();
    return {
      approachTitle: "Algorithmic Approach",
      approachText: beforeComp,
      complexityText: afterComp,
      timeComplexity: extractComplexity(afterComp, "Time"),
      spaceComplexity: extractComplexity(afterComp, "Space"),
    };
  }

  // Raw text without special markers
  return {
    approachTitle: "Overview & Approach",
    approachText: text,
  };
}

function extractComplexity(text: string, type: "Time" | "Space"): string | null {
  if (!text) return null;
  const regex = new RegExp(`${type}\\s*Complexity:\\s*([^.\\n]+)`, "i");
  const m = text.match(regex);
  return (m && m[1]) ? m[1].trim() : null;
}

export function EditorialViewer({ editorial }: EditorialViewerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!editorial || (!editorial.overview && (!editorial.approaches || editorial.approaches.length === 0))) {
    return (
      <div className="py-12 text-center space-y-2">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">No official editorial available for this problem yet.</p>
      </div>
    );
  }

  const handleCopy = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const parsed = editorial.overview ? parseOverview(editorial.overview) : null;
  const hasApproachesList = editorial.approaches && editorial.approaches.length > 0;

  return (
    <div className="space-y-5 text-slate-800">
      {/* ─── SECTION 1: APPROACH / INTUITION ─── */}
      {parsed && parsed.approachText && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-600 text-white shadow-2xs">
                <Lightbulb className="w-3.5 h-3.5" />
              </span>
              <h3 className="font-bold text-xs text-slate-900 tracking-tight">
                {parsed.approachTitle || "Intuition & Strategy"}
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider bg-blue-100/70 px-2 py-0.5 rounded">
              Algorithm
            </span>
          </div>

          <div className="p-4 space-y-3 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
            {parsed.approachText}
          </div>
        </div>
      )}

      {/* ─── SECTION 2: REFERENCE SOLUTION CODE ─── */}
      {parsed && parsed.code && parsed.code.snippet && (
        <div className="rounded-xl border border-slate-200 shadow-2xs overflow-hidden bg-slate-900 text-slate-100">
          <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="p-1 rounded bg-slate-800 text-emerald-400">
                <Terminal className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {parsed.code.language || "Python"} Reference Solution
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleCopy("parsed-code", parsed.code!.snippet)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
            >
              {copiedKey === "parsed-code" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 text-xs font-mono text-emerald-300 bg-slate-950/90 overflow-x-auto leading-relaxed selection:bg-emerald-900 selection:text-white">
            <code>{parsed.code.snippet}</code>
          </pre>
        </div>
      )}

      {/* ─── SECTION 3: COMPLEXITY ANALYSIS ─── */}
      {parsed && (parsed.timeComplexity || parsed.spaceComplexity || parsed.complexityText) && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <span className="p-1 rounded-md bg-amber-500 text-white shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <h3 className="font-bold text-xs text-slate-900">Complexity Analysis</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Time Complexity
                </span>
                <span className="font-mono text-xs font-bold text-slate-900 block truncate">
                  {parsed.timeComplexity ? `O(${parsed.timeComplexity.replace(/^O\(/i, "")}` : "O(n) average"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
              <Database className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Space Complexity
                </span>
                <span className="font-mono text-xs font-bold text-slate-900 block truncate">
                  {parsed.spaceComplexity ? `O(${parsed.spaceComplexity.replace(/^O\(/i, "")}` : "O(n) auxiliary"}
                </span>
              </div>
            </div>
          </div>

          {parsed.complexityText && (
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              {parsed.complexityText
                .replace(/Complexity Analysis:?\s*/i, "")
                .replace(/Time Complexity:[^\n.]+\.?/i, "")
                .replace(/Space Complexity:[^\n.]+\.?/i, "")
                .trim()}
            </p>
          )}
        </div>
      )}

      {/* ─── SECTION 4: DETAILED APPROACHES LIST (IF PROVIDED AS ARRAY) ─── */}
      {hasApproachesList && (
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Available Approaches ({editorial.approaches!.length})
          </h3>

          {editorial.approaches!.map((app, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <h4 className="font-bold text-xs text-slate-900">
                  {app.name || `Approach ${idx + 1}`}
                </h4>

                <div className="flex items-center gap-2">
                  {app.timeComplexity && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Time: {app.timeComplexity}
                    </span>
                  )}
                  {app.spaceComplexity && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Space: {app.spaceComplexity}
                    </span>
                  )}
                </div>
              </div>

              {app.explanation && (
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {app.explanation}
                </p>
              )}

              {app.code && Object.entries(app.code).length > 0 && (
                <div className="space-y-2 pt-1">
                  {Object.entries(app.code).map(([langKey, codeSnippet]) => {
                    const cKey = `${idx}-${langKey}`;
                    return (
                      <div
                        key={langKey}
                        className="rounded-lg border border-slate-200 overflow-hidden bg-slate-950 text-slate-100"
                      >
                        <div className="bg-slate-900 px-3 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                            {langKey}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(cKey, codeSnippet)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            {copiedKey === cKey ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                          <code>{codeSnippet}</code>
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
