"use client";

import { useState } from "react";
import { CodeEditor } from "@/components/coding/code-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Home, Save, Share2, Settings2, Terminal, Maximize2 } from "lucide-react";
import type { CodingLanguage } from "@/types";

const SAMPLE_PROBLEMS = [
  {
    id: "1",
    title: "Hello World",
    description: "Print 'Hello, World!' to the console.",
    difficulty: "easy" as const,
  },
  {
    id: "2",
    title: "Sum of Two Numbers",
    description: "Given two integers, print their sum.",
    difficulty: "easy" as const,
  },
  {
    id: "3",
    title: "Reverse a String",
    description: "Given a string, print it reversed.",
    difficulty: "medium" as const,
  },
];

export default function PlaygroundPage() {
  const [problemDescription, setProblemDescription] = useState(
    "// Welcome to EduNexus Code Playground!\n// Select a sample problem or write your own code.\n// Use the Run button to execute your code."
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#3d3d3d]">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <div className="w-6 h-6 rounded bg-brand-gradient flex items-center justify-center text-white font-bold text-xs">
              E
            </div>
            <span className="text-sm font-medium hidden sm:block" style={{ fontFamily: "Sora, sans-serif" }}>
              EduNexus IDE
            </span>
          </Link>
          <span className="text-[#3d3d3d]">/</span>
          <div className="flex items-center gap-1">
            <Terminal className="h-3.5 w-3.5 text-white/50" />
            <span className="text-sm text-white/70">playground</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs bg-[#2d2d2d] border-[#4d4d4d] text-white/60">
            Playground
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
            title="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="h-7 text-xs bg-primary gap-1" asChild>
            <Link href="/student/dashboard">
              <Home className="h-3 w-3" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem Panel (left on desktop, collapsible) */}
        <div className="hidden lg:flex flex-col w-80 border-r border-[#3d3d3d] bg-[#252526]">
          <div className="px-4 py-3 border-b border-[#3d3d3d]">
            <h2 className="text-sm font-semibold text-white">Practice Problems</h2>
          </div>
          <div className="p-3 space-y-2">
            {SAMPLE_PROBLEMS.map((prob) => (
              <button
                key={prob.id}
                className="w-full text-left p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-[#4d4d4d] transition-all group"
                onClick={() => setProblemDescription(prob.description)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/80 group-hover:text-white font-medium">{prob.title}</span>
                  <span className={`text-xs ${prob.difficulty === "easy" ? "text-green-400" : prob.difficulty === "medium" ? "text-yellow-400" : "text-red-400"}`}>
                    {prob.difficulty}
                  </span>
                </div>
                <p className="text-xs text-white/40 line-clamp-2">{prob.description}</p>
              </button>
            ))}
          </div>
          <div className="flex-1 p-3 border-t border-[#3d3d3d] mt-2">
            <p className="text-xs text-white/40 mb-2">Problem Description</p>
            <div className="text-xs text-white/70 leading-relaxed">{problemDescription}</div>
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditor
            height="calc(100vh - 90px)"
            showSubmit={false}
            defaultLanguage="python"
          />
        </div>
      </div>
    </div>
  );
}
