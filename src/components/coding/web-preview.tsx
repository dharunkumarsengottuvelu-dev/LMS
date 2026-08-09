"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Terminal, Monitor, RefreshCw, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface WebPreviewProps {
  html?: string;
  css?: string;
  js?: string;
  reactCode?: string;
  height?: string;
}

interface ConsoleLogItem {
  type: "log" | "error" | "warn" | "info";
  message: string;
  timestamp: string;
}

export function WebPreview({ html = "", css = "", js = "", reactCode = "", height = "450px" }: WebPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "console">("preview");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogItem[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  const buildSrcDoc = () => {
    const isReact = !!reactCode.trim();

    const consoleOverrideScript = `
      <script>
        (function() {
          var origLog = console.log;
          var origErr = console.error;
          var origWarn = console.warn;

          function sendToHost(type, args) {
            try {
              var msg = Array.prototype.slice.call(args).map(function(a) {
                return typeof a === 'object' ? JSON.stringify(a) : String(a);
              }).join(' ');
              window.parent.postMessage({ type: 'CONSOLE_LOG', logType: type, message: msg }, '*');
            } catch(e) {}
          }

          console.log = function() { sendToHost('log', arguments); origLog.apply(console, arguments); };
          console.error = function() { sendToHost('error', arguments); origErr.apply(console, arguments); };
          console.warn = function() { sendToHost('warn', arguments); origWarn.apply(console, arguments); };
        })();
      </script>
    `;

    if (isReact) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; margin: 0; background: #ffffff; color: #111827; }
              #root { min-height: 100vh; }
              ${css}
            </style>
            ${consoleOverrideScript}
            <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          </head>
          <body>
            <div id="root"></div>
            <script type="text/babel">
              try {
                ${reactCode}
                if (typeof App !== 'undefined') {
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(<App />);
                }
              } catch (err) {
                console.error("React Preview Error: " + err.message);
              }
            </script>
          </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; margin: 0; background: #ffffff; color: #111827; }
            ${css}
          </style>
          ${consoleOverrideScript}
        </head>
        <body>
          ${html}
          <script>
            try {
              ${js}
            } catch (err) {
              console.error("JavaScript Preview Error: " + err.message);
            }
          </script>
        </body>
      </html>
    `;
  };

  const renderPreview = () => {
    setIsBuilding(true);
    setConsoleLogs([]);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = buildSrcDoc();
    }
    setTimeout(() => setIsBuilding(false), 300);
  };

  useEffect(() => {
    renderPreview();

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "CONSOLE_LOG") {
        setConsoleLogs((prev) => [
          ...prev.slice(-49),
          {
            type: event.data.logType || "log",
            message: event.data.message || "",
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, css, js, reactCode]);

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-[#18181B] text-white">
      {/* Control Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#09090B] border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
            <Monitor className="h-3 w-3 mr-1" /> Sandboxed Browser Preview
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={renderPreview}
            disabled={isBuilding}
            className="h-7 text-xs bg-[#18181B] border-[#27272A] text-white hover:bg-[#27272A] gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${isBuilding ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "console")}>
        <div className="px-4 pt-2 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
          <TabsList className="bg-[#18181B] h-7">
            <TabsTrigger value="preview" className="text-xs h-6 px-3 data-[state=active]:bg-[#27272A] text-white">
              <Monitor className="h-3 w-3 mr-1" /> Live Preview
            </TabsTrigger>
            <TabsTrigger value="console" className="text-xs h-6 px-3 data-[state=active]:bg-[#27272A] text-white">
              <Terminal className="h-3 w-3 mr-1" /> Console Log ({consoleLogs.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="m-0 p-0">
          <iframe
            ref={iframeRef}
            title="Web Sandbox Live Preview"
            sandbox="allow-scripts"
            className="w-full bg-white border-0"
            style={{ height }}
          />
        </TabsContent>

        <TabsContent value="console" className="m-0 p-4 bg-[#09090B]">
          <div className="space-y-1 overflow-auto font-mono text-xs text-white/80" style={{ height }}>
            {consoleLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/30">
                No console messages recorded.
              </div>
            ) : (
              consoleLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded border ${
                    log.type === "error"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : log.type === "warn"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-[#18181B] border-[#27272A] text-white/80"
                  }`}
                >
                  <span className="text-[10px] text-white/40 shrink-0 font-sans">{log.timestamp}</span>
                  <span className="font-semibold uppercase text-[10px] px-1 rounded bg-black/40 shrink-0">{log.type}</span>
                  <span className="whitespace-pre-wrap break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
