"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText, Plus, Video, Code2, BookOpen, Search,
  Trash2, Edit, PlayCircle, Eye, RefreshCw, ExternalLink,
  Clock, CheckCircle2, Layers
} from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { SkeletonCourseGrid } from "@/components/loading";

interface LessonItem {
  id: string;
  moduleId: string;
  moduleTitle: string;
  courseTitle: string;
  title: string;
  description: string;
  content: string;
  type: "video" | "coding" | "quiz" | "reading";
  videoUrl: string;
  durationMinutes: number;
  orderIndex: number;
  isFreePreview: boolean;
  createdAt: string;
}

export default function AdminLessonsPage() {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [modules, setModules] = useState<{ id: string; title: string; courseTitle: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  // Create / Edit modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    moduleId: "",
    type: "video" as "video" | "coding" | "quiz" | "reading",
    durationMinutes: 15,
    videoUrl: "",
    description: "",
    content: "",
    isFreePreview: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Video preview modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const fetchLessonsAndModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch modules with courses
      const { data: modData } = await supabase
        .from("modules")
        .select("id, title, course:courses(title)")
        .order("order_index", { ascending: true });

      const modLookup = new Map<string, { title: string; courseTitle: string }>();
      const mappedMods: { id: string; title: string; courseTitle: string }[] = [];

      (modData || []).forEach((m: any) => {
        const cTitle = m.course?.title || "Core Curriculum";
        modLookup.set(m.id, { title: m.title, courseTitle: cTitle });
        mappedMods.push({ id: m.id, title: m.title, courseTitle: cTitle });
      });
      setModules(mappedMods);

      // 2. Fetch lessons
      const { data: lesData, error: lesErr } = await supabase
        .from("lessons")
        .select("*")
        .order("order_index", { ascending: true });

      if (lesErr) {
        console.error("Error fetching lessons:", lesErr);
      }

      if (lesData) {
        const mappedLessons: LessonItem[] = lesData.map((l: any) => {
          const modInfo = modLookup.get(l.module_id) || {
            title: "General Module",
            courseTitle: "Technical Training",
          };
          return {
            id: l.id,
            moduleId: l.module_id,
            moduleTitle: modInfo.title,
            courseTitle: modInfo.courseTitle,
            title: l.title,
            description: l.description || "",
            content: l.content || "",
            type: (l.type as any) || "video",
            videoUrl: l.video_url || "",
            durationMinutes: l.duration_minutes || 15,
            orderIndex: l.order_index || 0,
            isFreePreview: !!l.is_free_preview,
            createdAt: l.created_at || new Date().toISOString(),
          };
        });
        setLessons(mappedLessons);
      }
    } catch (err: any) {
      console.error("Failed to load lessons:", err);
      toast({
        title: "Load Error",
        description: "Failed to load lessons from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLessonsAndModules();
  }, [fetchLessonsAndModules]);

  const openCreateDialog = () => {
    setEditingLessonId(null);
    setFormData({
      title: "",
      moduleId: modules[0]?.id || "",
      type: "video",
      durationMinutes: 15,
      videoUrl: "",
      description: "",
      content: "",
      isFreePreview: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (l: LessonItem) => {
    setEditingLessonId(l.id);
    setFormData({
      title: l.title,
      moduleId: l.moduleId,
      type: l.type,
      durationMinutes: l.durationMinutes,
      videoUrl: l.videoUrl,
      description: l.description,
      content: l.content,
      isFreePreview: l.isFreePreview,
    });
    setIsDialogOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: "Validation Error", description: "Lesson title is required." });
      return;
    }
    if (!formData.moduleId) {
      toast({ title: "Validation Error", description: "Please select a parent module." });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const payload: any = {
        module_id: formData.moduleId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        content: formData.content.trim(),
        type: formData.type,
        video_url: formData.videoUrl.trim() || null,
        duration_minutes: formData.durationMinutes,
        is_free_preview: formData.isFreePreview,
        updated_at: new Date().toISOString(),
      };

      if (editingLessonId) {
        payload.id = editingLessonId;
      }

      const { error } = await supabase.from("lessons").upsert(payload);
      if (error) throw error;

      toast({
        title: editingLessonId ? "Lesson Updated" : "Lesson Created",
        description: `"${formData.title}" saved to database successfully.`,
      });

      setIsDialogOpen(false);
      fetchLessonsAndModules();
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Error Saving Lesson",
        description: err.message || "Failed to persist lesson changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLesson = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete lesson "${title}"?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;

      setLessons((prev) => prev.filter((l) => l.id !== id));
      toast({
        title: "Lesson Deleted",
        description: `"${title}" removed from database.`,
        variant: "destructive",
      });
    } catch (err: any) {
      toast({
        title: "Delete Error",
        description: err.message || "Failed to delete lesson.",
        variant: "destructive",
      });
    }
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const matchesSearch =
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.moduleTitle.toLowerCase().includes(search.toLowerCase()) ||
        l.courseTitle.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || l.type === typeFilter;
      const matchesModule = moduleFilter === "all" || l.moduleId === moduleFilter;
      return matchesSearch && matchesType && matchesModule;
    });
  }, [lessons, search, typeFilter, moduleFilter]);

  const typeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-[#2563EB]" />;
      case "coding":
        return <Code2 className="h-4 w-4 text-[#7C3AED]" />;
      case "quiz":
        return <BookOpen className="h-4 w-4 text-[#D97706]" />;
      default:
        return <FileText className="h-4 w-4 text-[#16A34A]" />;
    }
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Interactive Lessons & Assets"
        description="Manage curriculum lessons, video lectures, and learning resources across all courses."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchLessonsAndModules}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={openCreateDialog}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center gap-2 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Lesson
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-[#E5E7EB] dark:border-[#374151]">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Total Lessons</p>
              <h3 className="text-2xl font-bold mt-1 text-[#111827] dark:text-white">{lessons.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/30 flex items-center justify-center text-[#2563EB]">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[#E5E7EB] dark:border-[#374151]">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Video Lectures</p>
              <h3 className="text-2xl font-bold mt-1 text-[#111827] dark:text-white">
                {lessons.filter((l) => l.type === "video").length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600">
              <Video className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[#E5E7EB] dark:border-[#374151]">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Coding Labs</p>
              <h3 className="text-2xl font-bold mt-1 text-[#111827] dark:text-white">
                {lessons.filter((l) => l.type === "coding").length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600">
              <Code2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[#E5E7EB] dark:border-[#374151]">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Active Modules</p>
              <h3 className="text-2xl font-bold mt-1 text-[#111827] dark:text-white">{modules.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-[#E5E7EB] dark:border-[#374151]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder="Search lessons, modules, or courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#F9FAFB] dark:bg-[#111827]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
                <SelectTrigger className="w-[150px] bg-[#F9FAFB] dark:bg-[#111827]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="coding">Coding Lab</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="reading">Reading</SelectItem>
                </SelectContent>
              </Select>

              {modules.length > 0 && (
                <Select value={moduleFilter} onValueChange={(val) => setModuleFilter(val || "all")}>
                  <SelectTrigger className="w-[180px] bg-[#F9FAFB] dark:bg-[#111827]">
                    <SelectValue placeholder="All Modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons List */}
      {isLoading ? (
        <SkeletonCourseGrid count={6} />
      ) : filteredLessons.length === 0 ? (
        <Card className="border border-[#E5E7EB] dark:border-[#374151]">
          <CardContent className="p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-[#EFF6FF] dark:bg-blue-950/30 flex items-center justify-center text-[#2563EB] mx-auto mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-semibold text-[#111827] dark:text-white">No Lessons Found</h4>
            <p className="text-sm text-[#6B7280] max-w-md mx-auto mt-1 mb-4">
              {search || typeFilter !== "all" || moduleFilter !== "all"
                ? "No lessons match your current filters. Try resetting the search or filter settings."
                : "No curriculum lessons have been authored yet. Click 'Add Lesson' to create your first lesson."}
            </p>
            <Button onClick={openCreateDialog} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add First Lesson
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="border border-[#E5E7EB] dark:border-[#374151] hover:border-[#2563EB] transition-colors flex flex-col justify-between"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline" className="flex items-center gap-1.5 capitalize text-xs">
                    {typeIcon(lesson.type)}
                    {lesson.type}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{lesson.durationMinutes} mins</span>
                  </div>
                </div>
                <CardTitle className="text-base font-semibold line-clamp-1">{lesson.title}</CardTitle>
                <CardDescription className="text-xs text-[#6B7280] line-clamp-1 mt-0.5">
                  {lesson.courseTitle} • {lesson.moduleTitle}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] line-clamp-2 min-h-[2rem]">
                  {lesson.description || lesson.content || "Curriculum lesson asset and lecture notes."}
                </p>

                {lesson.videoUrl && (
                  <div className="p-2.5 rounded-md bg-[#F3F4F6] dark:bg-[#1F2937] flex items-center justify-between text-xs">
                    <span className="truncate max-w-[180px] text-[#4B5563] dark:text-[#9CA3AF]">
                      {lesson.videoUrl}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewVideoUrl(lesson.videoUrl)}
                      className="h-7 px-2 text-[#2563EB] hover:text-[#1D4ED8]"
                    >
                      <PlayCircle className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] dark:border-[#374151]">
                  <span className="text-xs text-[#9CA3AF]">
                    {lesson.isFreePreview ? (
                      <Badge className="bg-[#DCFCE7] text-[#166534] border-0 text-[10px]">
                        Free Preview
                      </Badge>
                    ) : (
                      "Enrolled Only"
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(lesson)}
                      className="h-8 px-2.5 text-xs flex items-center gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                      className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Authoring Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingLessonId ? "Edit Lesson" : "Author New Lesson"}</DialogTitle>
            <DialogDescription>
              Specify lesson details, video resources, and curriculum assignment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLesson} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Lesson Title *</Label>
              <Input
                placeholder="e.g. Asynchronous Programming in TypeScript"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Parent Module *</Label>
                <Select
                  value={formData.moduleId}
                  onValueChange={(val) => setFormData({ ...formData, moduleId: val || "" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Lesson Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: (val || "video") as any })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Lecture</SelectItem>
                    <SelectItem value="coding">Coding Lab</SelectItem>
                    <SelectItem value="quiz">Interactive Quiz</SelectItem>
                    <SelectItem value="reading">Reading / Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Duration (Minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={600}
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) || 15 })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Video Streaming URL</Label>
                <Input
                  placeholder="https://..."
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Description / Objective</Label>
              <Textarea
                placeholder="Key takeaways and lesson summary..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Lesson Notes / Content</Label>
              <Textarea
                placeholder="Markdown or text content for this lesson..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              >
                {isSaving ? "Saving to Database..." : editingLessonId ? "Save Changes" : "Create Lesson"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideoUrl} onOpenChange={() => setPreviewVideoUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Video Asset Preview</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
            {previewVideoUrl?.includes("youtube") || previewVideoUrl?.includes("youtu.be") ? (
              <iframe
                src={previewVideoUrl.replace("watch?v=", "embed/")}
                className="w-full h-full border-0"
                allowFullScreen
              />
            ) : (
              <video
                src={previewVideoUrl || ""}
                controls
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewVideoUrl(null)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
