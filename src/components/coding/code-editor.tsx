"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Play, RotateCcw, ChevronDown, Loader2,
  CheckCircle2, XCircle, Clock, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CodingLanguage, ExecuteCodeResult, CodingProblem } from "@/types";
import { LANGUAGE_DISPLAY_NAMES } from "@/types/coding";

// Lazy load Monaco to reduce initial bundle size
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
      <Loader2 className="h-6 w-6 animate-spin text-white/50" />
    </div>
  ),
});

const STARTER_TEMPLATES: Record<CodingLanguage, string> = {
  javascript: `// JavaScript Solution\n\nfunction solution(input) {\n  // Write your solution here\n  \n}\n\n// Read input\nconst lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');\nconsole.log(solution(lines));`,
  typescript: `// TypeScript Solution\n\nfunction solution(input: string[]): string {\n  // Write your solution here\n  return "";\n}\n\nconst lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');\nconsole.log(solution(lines));`,
  python: `# Python Solution\nimport sys\n\ndef solution(lines):\n    # Write your solution here\n    pass\n\nlines = sys.stdin.read().strip().split('\\n')\nresult = solution(lines)\nif result is not None:\n    print(result)`,
  java: `// Java Solution\nimport java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`,
  cpp: `// C++ Solution\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your solution here\n    \n    return 0;\n}`,
  c: `// C Solution\n#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  csharp: `// C# Solution\nusing System;\n\nclass Solution {\n    static void Main(string[] args) {\n        // Write your solution here\n    }\n}`,
  go: `// Go Solution\npackage main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    _ = reader\n    // Write your solution here\n}`,
  rust: `// Rust Solution\nuse std::io::{self, BufRead};\n\nfn main() {\n    let stdin = io::stdin();\n    let _lines: Vec<String> = stdin.lock().lines()\n        .filter_map(|l| l.ok())\n        .collect();\n    // Write your solution here\n}`,
  kotlin: `// Kotlin Solution\nfun main() {\n    val lines = generateSequence(::readLine).toList()\n    // Write your solution here\n}`,
  swift: `// Swift Solution\nimport Foundation\n\nvar lines: [String] = []\nwhile let line = readLine() {\n    lines.append(line)\n}\n// Write your solution here`,
  php: `<?php\n// PHP Solution\n$lines = [];\nwhile ($line = fgets(STDIN)) {\n    $lines[] = trim($line);\n}\n// Write your solution here\n?>`,
  ruby: `# Ruby Solution\nlines = []\nwhile line = gets\n  lines << line.chomp\nend\n# Write your solution here`,
  scala: `// Scala Solution\nobject Solution {\n    def main(args: Array[String]): Unit = {\n        val lines = io.Source.stdin.getLines().toList\n        // Write your solution here\n    }\n}`,
};

interface CodeEditorProps {
  problem?: CodingProblem;
  onSubmit?: (code: string, language: CodingLanguage) => Promise<void>;
  isSubmitting?: boolean;
  readOnly?: boolean;
  defaultLanguage?: CodingLanguage;
  defaultCode?: string;
  showSubmit?: boolean;
  height?: string;
}

export function CodeEditor({
  problem,
  onSubmit,
  isSubmitting = false,
  readOnly = false,
  defaultLanguage = "python",
  defaultCode,
  showSubmit = true,
  height = "450px",
}: CodeEditorProps) {
  const [language, setLanguage] = useState<CodingLanguage>(defaultLanguage);
  const [code, setCode] = useState<string>(
    defaultCode ??
    (problem?.templates?.[defaultLanguage] ?? STARTER_TEMPLATES[defaultLanguage as keyof typeof STARTER_TEMPLATES] ?? "")
  );
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<ExecuteCodeResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("input");
  const { toast } = useToast();

  const handleLanguageChange = useCallback((newLang: CodingLanguage) => {
    setLanguage(newLang);
    const template = problem?.templates?.[newLang] ?? STARTER_TEMPLATES[newLang] ?? "";
    setCode(template);
    setOutput(null);
  }, [problem]);

  const handleRun = async () => {
    if (!code.trim()) {
      toast({ title: "Empty code", description: "Please write some code first", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setActiveTab("output");

    try {
      const response = await fetch("/api/coding/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin }),
      });

      if (!response.ok) {
        const error = await response.json() as { error: string };
        throw new Error(error.error ?? "Execution failed");
      }

      const result = await response.json() as ExecuteCodeResult;
      setOutput(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Execution failed";
      toast({ title: "Run failed", description: msg, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit(code, language);
    }
  };

  const handleReset = () => {
    const template = problem?.templates?.[language] ?? STARTER_TEMPLATES[language] ?? "";
    setCode(template);
    setOutput(null);
  };

  const statusColor = output?.status
    ? output.status.id === 3
      ? "text-green-600"
      : output.status.id >= 4
      ? "text-red-500"
      : "text-amber-600"
    : "";

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden code-editor-container bg-[#1e1e1e]">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#2d2d2d] border-b border-[#3d3d3d]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-white/50 ml-2">
            {problem?.title ?? "Code Playground"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <Select value={language} onValueChange={(v) => handleLanguageChange(v as CodingLanguage)}>
            <SelectTrigger className="h-7 w-44 text-xs bg-[#3d3d3d] border-[#4d4d4d] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LANGUAGE_DISPLAY_NAMES) as CodingLanguage[]).map((lang) => (
                <SelectItem key={lang} value={lang} className="text-xs">
                  {LANGUAGE_DISPLAY_NAMES[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
            onClick={handleReset}
            title="Reset to template"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div style={{ height }}>
        <MonacoEditor
          language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
          value={code}
          onChange={(v) => !readOnly && setCode(v ?? "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "line",
            tabSize: 2,
            readOnly,
            wordWrap: "on",
            formatOnPaste: true,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>

      {/* Bottom Panel: Input/Output + Actions */}
      <div className="bg-[#1e1e1e] border-t border-[#3d3d3d]">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between px-4 pt-2">
            <TabsList className="bg-[#2d2d2d] h-7">
              <TabsTrigger value="input" className="text-xs h-6 px-3 data-[state=active]:bg-[#3d3d3d] text-white">
                Input
              </TabsTrigger>
              <TabsTrigger value="output" className="text-xs h-6 px-3 data-[state=active]:bg-[#3d3d3d] text-white">
                Output
                {output && (
                  <span className={cn("ml-1.5 w-2 h-2 rounded-full", output.status.id === 3 ? "bg-green-500" : "bg-red-500")} />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Run / Submit buttons */}
            <div className="flex items-center gap-2 pb-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs bg-[#2d2d2d] border-[#4d4d4d] text-white hover:bg-[#3d3d3d] gap-1.5"
                onClick={handleRun}
                disabled={isRunning || readOnly}
              >
                {isRunning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 text-green-400" />
                )}
                {isRunning ? "Running..." : "Run Code"}
              </Button>
              {showSubmit && onSubmit && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-primary gap-1.5"
                  onClick={handleSubmit}
                  disabled={isSubmitting || readOnly}
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="input" className="m-0 px-4 pb-4">
            <Textarea
              placeholder="Custom input (stdin)..."
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="h-24 resize-none font-mono text-xs bg-[#2d2d2d] border-[#3d3d3d] text-white placeholder:text-white/30"
            />
          </TabsContent>

          <TabsContent value="output" className="m-0 px-4 pb-4">
            {!output ? (
              <div className="h-24 flex items-center justify-center text-white/30 text-xs font-mono border border-[#3d3d3d] rounded-lg">
                Run your code to see output
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn("text-xs border-[#3d3d3d]", statusColor)}
                  >
                    {output.status.id === 3 ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {output.status.description}
                  </Badge>
                  {output.time && (
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {output.time}s
                    </span>
                  )}
                  {output.memory && (
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> {(output.memory / 1024).toFixed(1)}MB
                    </span>
                  )}
                </div>
                <pre className="h-20 overflow-auto font-mono text-xs text-white/80 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg p-3 whitespace-pre-wrap">
                  {output.stdout
                    ?? output.stderr
                    ?? output.compile_output
                    ?? "No output"}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
