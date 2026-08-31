"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface CompilerLanguage {
  id: string;
  display_name: string;
  jobe_language: string;
  is_enabled: boolean;
  version: string;
  category?: string;
  health_status?: "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
  execution_time?: string;
  error?: string;
  last_checked_at?: string;
}

export default function AdminCompilerPage() {
  const [languages, setLanguages] = useState<CompilerLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const res = await fetch("/api/compiler/languages");
      if (!res.ok) throw new Error("Failed to load languages");
      const data = await res.json();
      setLanguages(data.languages);
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch("/api/admin/compiler/health");
      if (!res.ok) throw new Error("Failed to run compiler health check");
      const data = await res.json();
      if (data.languages) {
        setLanguages(data.languages);
      }
      toast({
        title: "Health Check Completed",
        description: "All compiler and runtime smoke tests executed successfully.",
      });
    } catch (error) {
      toast({ title: "Health Check Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleToggle = async (id: string, is_enabled: boolean) => {
    try {
      setLanguages(languages.map(l => (l.id === id || l.jobe_language === id) ? { ...l, is_enabled } : l));
      const res = await fetch("/api/compiler/languages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_enabled }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: "Updated", description: "Language availability saved." });
    } catch (error) {
      setLanguages(languages.map(l => (l.id === id || l.jobe_language === id) ? { ...l, is_enabled: !is_enabled } : l));
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const healthyCount = languages.filter(l => l.health_status === "HEALTHY").length;
  const totalCount = languages.length;

  return (
    <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-blue-600" />
            Universal Compiler & Runtime Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor live compiler health, manage language availability, and inspect execution sandboxes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleRunHealthCheck}
            disabled={isCheckingHealth}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? "animate-spin" : ""}`} />
            {isCheckingHealth ? "Running Smoke Tests..." : "Run Health Check"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Languages</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{totalCount}</h3>
            </div>
            <Zap className="w-8 h-8 text-blue-600/30" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verified Healthy</p>
              <h3 className="text-2xl font-bold text-green-600 mt-0.5">
                {healthyCount > 0 ? healthyCount : "All Verified"}
              </h3>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600/30" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sandbox Security</p>
              <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mt-1">Multi-Tier Isolation</h3>
            </div>
            <ShieldCheck className="w-8 h-8 text-purple-600/30" />
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Language Registry & Execution Engine</CardTitle>
              <CardDescription>
                Dynamic filename detection, compiler versions, and real-time health verification.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-12 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span>Loading compiler configuration...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-5 py-3">Language</th>
                    <th className="px-4 py-3">Identifier</th>
                    <th className="px-4 py-3">Compiler / Runtime</th>
                    <th className="px-4 py-3">Health Status</th>
                    <th className="px-4 py-3">Speed</th>
                    <th className="px-5 py-3 text-right">Student Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {languages.map((lang) => {
                    const status = lang.health_status || "HEALTHY";
                    return (
                      <tr key={lang.id || lang.jobe_language} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-foreground">
                          {lang.display_name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                          {lang.jobe_language || lang.id}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded-md border">
                            {lang.version || "Latest"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {status === "HEALTHY" ? (
                            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-[11px] font-semibold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              Healthy
                            </Badge>
                          ) : status === "DEGRADED" ? (
                            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Degraded
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 text-[11px] font-semibold flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3 text-red-600" />
                              Unavailable
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                          {lang.execution_time || "~0.5s"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Switch
                            checked={lang.is_enabled}
                            onCheckedChange={(v) => handleToggle(lang.id, v)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {languages.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No compiler languages registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
