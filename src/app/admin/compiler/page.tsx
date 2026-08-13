"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";

interface CompilerLanguage {
  id: string;
  display_name: string;
  jobe_language: string;
  is_enabled: boolean;
  version: string;
}

export default function AdminCompilerPage() {
  const [languages, setLanguages] = useState<CompilerLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const handleToggle = async (id: string, is_enabled: boolean) => {
    try {
      setLanguages(languages.map(l => l.id === id ? { ...l, is_enabled } : l));
      const res = await fetch("/api/compiler/languages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_enabled }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: "Updated", description: "Language status saved." });
    } catch (error) {
      setLanguages(languages.map(l => l.id === id ? { ...l, is_enabled: !is_enabled } : l));
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Compiler Settings</h1>
        <p className="text-muted-foreground">Manage which programming languages are available for coding problems.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supported Languages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Loading configuration...</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Display Name</th>
                    <th className="px-4 py-3 font-medium">Jobe Language</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    <th className="px-4 py-3 font-medium text-right">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {languages.map((lang) => (
                    <tr key={lang.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-semibold">{lang.display_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{lang.jobe_language}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lang.version}</td>
                      <td className="px-4 py-3 text-right">
                        <Switch
                          checked={lang.is_enabled}
                          onCheckedChange={(v) => handleToggle(lang.id, v)}
                        />
                      </td>
                    </tr>
                  ))}
                  {languages.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">
                        No compiler languages found. Please run database migrations.
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
