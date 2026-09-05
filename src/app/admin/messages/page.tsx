"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [myProfileId, setMyProfileId] = useState<string>("");
  const [myIds, setMyIds] = useState<string[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeRecipient, setActiveRecipient] = useState<any | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Common / Batch Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTargetType, setBroadcastTargetType] = useState<"all" | "batch">("all");
  const [broadcastBatchId, setBroadcastBatchId] = useState<string>("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("announcement");
  const [broadcastLinkUrl, setBroadcastLinkUrl] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const scrollToBottom = useCallback(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [convsRes, recipientsRes] = await Promise.all([
        fetch("/api/messages"),
        fetch("/api/messages/recipients"),
      ]);
      if (convsRes.ok) {
        const d = await convsRes.json();
        const serverList = d.conversations || [];
        setConversations((prev) => {
          const pendingStubs = prev.filter((c) => c.conversation_id?.startsWith("new_"));
          const serverIds = new Set(serverList.map((c: any) => c.conversation_id));
          const serverRecipientIds = new Set(serverList.map((c: any) => c.other_participant_id));
          const retained = pendingStubs.filter(
            (s) => !serverIds.has(s.conversation_id) && !serverRecipientIds.has(s.other_participant_id)
          );
          return [...retained, ...serverList];
        });
        setMyProfileId(d.myProfileId || "");
        if (d.myIds) setMyIds(d.myIds);
      }
      if (recipientsRes.ok) {
        const d = await recipientsRes.json();
        const studentList = d.recipients || [];
        setRecipients(studentList);

        const dbBatches = d.batches || [];
        setBatches(dbBatches);
        if (dbBatches.length > 0 && (!broadcastBatchId || !dbBatches.some((b: any) => b.id === broadcastBatchId))) {
          setBroadcastBatchId(dbBatches[0].id);
        }
      }
    } catch (e) {
      console.warn("Messages fetch error", e);
    } finally {
      setIsLoadingConvs(false);
    }
  }, [broadcastBatchId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeConversation = conversations.find((c) => c.conversation_id === activeConvId);
  const activeMessages = activeConversation?.messages || [];

  // Match current recipient
  const currentRecipient =
    activeRecipient ||
    recipients.find(
      (r) =>
        r.id === activeConversation?.other_participant_id ||
        r.user_id === activeConversation?.other_participant_id ||
        activeConvId === `new_${r.id}`
    ) ||
    (activeConversation
      ? {
          id: activeConversation.other_participant_id,
          name: activeConversation.other_participant_name,
          role: activeConversation.other_participant_role || "student",
          batch: null,
        }
      : null);

  const displayRecipientName =
    currentRecipient?.name || activeConversation?.other_participant_name || "Student";
  const displayRecipientEmail = currentRecipient?.email || "";
  const displayRecipientBatch = currentRecipient?.batch || null;

  // Batch-filtered recipients
  const batchFilteredRecipients = useMemo(() => {
    if (selectedBatchId === "all") return recipients;
    const selectedBatchObj = batches.find((b) => b.id === selectedBatchId);
    const targetName = selectedBatchObj?.name;
    return recipients.filter(
      (r) =>
        r.batch_id === selectedBatchId ||
        r.batch === selectedBatchId ||
        (targetName && r.batch === targetName)
    );
  }, [recipients, selectedBatchId, batches]);

  // Search-filtered recipients
  const filteredRecipients = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();
    if (!query) return batchFilteredRecipients;
    return batchFilteredRecipients.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        (r.batch && r.batch.toLowerCase().includes(query))
    );
  }, [batchFilteredRecipients, recipientSearch]);

  // Unified list: all students are ALWAYS visible in sidebar, sorted by recent activity
  const sidebarStudents = useMemo(() => {
    return filteredRecipients.map((r) => {
      const conv = conversations.find(
        (c) =>
          c.other_participant_id === r.id ||
          c.other_participant_id === r.user_id ||
          c.conversation_id === `new_${r.id}`
      );
      return {
        recipient: r,
        conv: conv || null,
        lastMessageAt: conv?.last_message_at ? new Date(conv.last_message_at).getTime() : 0,
      };
    }).sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return b.lastMessageAt - a.lastMessageAt;
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.recipient.name.localeCompare(b.recipient.name);
    });
  }, [filteredRecipients, conversations]);

  const handleSelectStudentItem = async (item: { recipient: any; conv: any | null }) => {
    const r = item.recipient;
    setActiveRecipient(r);

    if (item.conv) {
      setActiveConvId(item.conv.conversation_id);
      setView("chat");
      setTimeout(scrollToBottom, 60);

      try {
        await fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: item.conv.conversation_id }),
        });
        fetchData();
      } catch {}
    } else {
      const stub = {
        conversation_id: `new_${r.id}`,
        other_participant_id: r.id,
        other_participant_name: r.name,
        other_participant_role: r.role || "student",
        last_message: "",
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        messages: [],
        _new_recipient: r,
      };
      setConversations((prev) => [stub, ...prev]);
      setActiveConvId(stub.conversation_id);
      setView("chat");
      setTimeout(scrollToBottom, 60);
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async () => {
    if (!newMessageContent.trim() || !activeConvId || isSending) return;
    const recipientId =
      currentRecipient?.id ||
      activeConversation?.other_participant_id ||
      activeConversation?._new_recipient?.id;
    if (!recipientId) return;

    const content = newMessageContent.trim();
    setNewMessageContent("");
    setIsSending(true);

    const isNewConv = activeConvId.startsWith("new_");

    // Optimistic UI message
    const optimisticMsg = {
      id: `temp_${Date.now()}`,
      conversation_id: activeConvId,
      sender_id: myProfileId,
      sender_name: "You",
      sender_role: "admin",
      recipient_id: recipientId,
      recipient_name: displayRecipientName,
      content: content,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.conversation_id === activeConvId) {
          return {
            ...c,
            last_message: content,
            last_message_at: optimisticMsg.created_at,
            messages: [...c.messages, optimisticMsg],
          };
        }
        return c;
      })
    );

    setTimeout(scrollToBottom, 40);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: recipientId,
          content,
          conversation_id: isNewConv ? undefined : activeConvId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (isNewConv && data.conversation_id) {
          setActiveConvId(data.conversation_id);
        }
        await fetchData();
      }
    } catch (e) {
      console.warn("Send error:", e);
    } finally {
      setIsSending(false);
      setTimeout(scrollToBottom, 60);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setIsSendingBroadcast(true);
    setBroadcastStatus(null);

    const selectedBatchObj = batches.find((b) => b.id === broadcastBatchId);

    try {
      const payload: any = {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: broadcastType,
        link_url: broadcastLinkUrl.trim() || null,
        target_type: broadcastTargetType === "batch" ? "batch" : "common",
      };

      if (broadcastTargetType === "batch") {
        payload.batch_id = broadcastBatchId;
        payload.batch_name = selectedBatchObj?.name || broadcastBatchId;
      }

      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        const targetLabel =
          broadcastTargetType === "batch"
            ? `Batch: ${selectedBatchObj?.name || "Selected Batch"}`
            : "All Students";
        setBroadcastStatus({
          type: "success",
          message: `Broadcast notification successfully delivered to ${targetLabel} (${data.insertedCount || recipients.length} students).`,
        });
        setBroadcastTitle("");
        setBroadcastMessage("");
        setBroadcastLinkUrl("");
        setTimeout(() => {
          setIsBroadcastModalOpen(false);
          setBroadcastStatus(null);
        }, 2000);
      } else {
        setBroadcastStatus({
          type: "error",
          message: data.error || "Failed to deliver broadcast notification",
        });
      }
    } catch (err: any) {
      setBroadcastStatus({
        type: "error",
        message: err.message || "Network error while sending notification",
      });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const isMessageFromMe = (msg: any) => {
    if (myIds.length > 0) {
      if (myIds.includes(msg.sender_id) || (msg.sender_auth_id && myIds.includes(msg.sender_auth_id))) {
        return true;
      }
    }
    return msg.sender_id === myProfileId || msg.sender_name === "You";
  };

  return (
    <div className="h-[calc(100vh-90px)] min-h-[580px] w-full max-w-7xl mx-auto flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden font-sans">
      {/* Enterprise Top Navigation Bar */}
      <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-8 px-3 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Back
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Enterprise Hub</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white">
              Student Messaging & Communications
            </h1>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold">
                {totalUnread} Unread
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setBroadcastStatus(null);
              setIsBroadcastModalOpen(true);
            }}
            className="h-8 px-3.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs cursor-pointer"
          >
            + Broadcast Notification
          </Button>

          <button
            type="button"
            onClick={fetchData}
            className="h-8 px-3 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main Workspace: Split Panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Directory & Channel Sidebar - ALL students always remain visible */}
        <div
          className={cn(
            "w-full md:w-84 lg:w-92 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/50",
            view === "chat" && "hidden md:flex"
          )}
        >
          {/* Batch Selector & Search Controls */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            {/* Batch Filter Dropdown */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Filter by Batch</span>
                <span className="font-normal lowercase text-slate-400">
                  {filteredRecipients.length} student{filteredRecipients.length === 1 ? "" : "s"}
                </span>
              </div>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full h-8.5 px-3 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">
                  {batches.length > 0 ? `All Batches (${recipients.length} Total)` : `All Students (${recipients.length} Total)`}
                </option>
                {batches.map((b) => {
                  const count = recipients.filter(
                    (r) => r.batch_id === b.id || r.batch === b.name || r.batch === b.id
                  ).length;
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Student Search Box */}
            <div className="space-y-1">
              <Input
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search students by name or email..."
                className="h-8.5 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          {/* Directory Stream - All students listed with active chat status */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5 space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Student Roster</span>
              <span>{sidebarStudents.length} Students</span>
            </div>

            {isLoadingConvs && sidebarStudents.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 space-y-1">
                <p className="font-medium">Loading student list...</p>
              </div>
            ) : sidebarStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No students found matching your filter.
              </div>
            ) : (
              sidebarStudents.map((item) => {
                const r = item.recipient;
                const conv = item.conv;
                const isActive =
                  activeRecipient?.id === r.id ||
                  activeRecipient?.user_id === r.id ||
                  (conv && activeConvId === conv.conversation_id) ||
                  activeConvId === `new_${r.id}`;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectStudentItem(item)}
                    className={cn(
                      "w-full flex items-start gap-3 p-2.5 rounded-lg transition-all text-left cursor-pointer border",
                      isActive
                        ? "bg-white dark:bg-slate-800 border-blue-400 dark:border-blue-600 shadow-xs ring-1 ring-blue-500/20"
                        : "hover:bg-white/80 dark:hover:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                        {getInitials(r.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={cn(
                            "text-xs truncate",
                            conv && conv.unread_count > 0
                              ? "font-bold text-slate-900 dark:text-white"
                              : "font-medium text-slate-800 dark:text-slate-200"
                          )}
                        >
                          {r.name}
                        </p>
                        {conv && conv.last_message_at ? (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatTime(conv.last_message_at)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 shrink-0 font-medium">
                            Chat
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        {r.batch && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[110px]">
                            {r.batch}
                          </span>
                        )}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1">
                          {conv && conv.last_message ? conv.last_message : r.email}
                        </p>
                        {conv && conv.unread_count > 0 && (
                          <span className="h-4 min-w-4 px-1 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Chat Panel */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950",
            view === "list" && "hidden md:flex"
          )}
        >
          {!activeConvId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 select-none bg-slate-50/30 dark:bg-slate-900/20">
              <div className="h-10 px-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-xs">
                Direct Student Channel
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Select a Student to Communicate
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Choose an enrolled student from the directory on the left to initiate a 1-on-1 direct message, or broadcast a common notification batch-wise.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setBroadcastStatus(null);
                    setIsBroadcastModalOpen(true);
                  }}
                  className="h-8.5 px-4 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  Send Batch Broadcast
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Conversation Header */}
              <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="md:hidden h-8 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium mr-1"
                  >
                    Directory
                  </button>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                      {getInitials(displayRecipientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {displayRecipientName}
                      </p>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                        Student
                      </span>
                      {displayRecipientBatch && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          Batch: {displayRecipientBatch}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {displayRecipientEmail || "Active student direct communication line"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    Channel Ready
                  </span>
                </div>
              </div>

              {/* Chat Message Feed - isolated internal scroll only, no window auto-scrolling */}
              <div
                ref={chatFeedRef}
                className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40 dark:bg-slate-950/50"
              >
                {activeMessages.length === 0 ? (
                  <div className="text-center py-20 text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      Beginning of conversation with {displayRecipientName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Type your message below and press Send.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg: any) => {
                    const isMine = isMessageFromMe(msg);
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2.5 items-end",
                          isMine ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isMine && (
                          <Avatar className="h-6 w-6 shrink-0 mb-1">
                            <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                              {getInitials(displayRecipientName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[75%] sm:max-w-[70%] space-y-1",
                            isMine ? "items-end" : "items-start"
                          )}
                        >
                          <div
                            className={cn(
                              "px-3.5 py-2.5 rounded-lg text-xs leading-relaxed border shadow-2xs",
                              isMine
                                ? "bg-slate-900 dark:bg-blue-600 text-white border-transparent"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                            )}
                          >
                            {msg.content}
                          </div>
                          <div
                            className={cn(
                              "flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 px-1",
                              isMine ? "justify-end" : "justify-start"
                            )}
                          >
                            <span>{formatTime(msg.created_at)}</span>
                            {isMine && (
                              <span className="font-medium text-[9px] text-slate-400">
                                {msg.is_read ? "• Read" : "• Sent"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Message Input Console */}
              <div className="p-3.5 px-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Input
                    ref={inputRef}
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Compose message to ${displayRecipientName}...`}
                    className="flex-1 h-9 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500"
                    disabled={isSending}
                  />
                  <Button
                    type="button"
                    onClick={handleSend}
                    disabled={!newMessageContent.trim() || isSending}
                    className="h-9 px-4 rounded-md bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-medium text-xs shadow-xs shrink-0 cursor-pointer"
                  >
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-0.5">
                  <span>Press Enter to send message</span>
                  <span>Encrypted Enterprise Communication</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Broadcast Notification Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Broadcast Notification
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Send an official announcement to all students or a targeted batch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="h-7 px-2.5 rounded text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="p-6 space-y-4">
              {broadcastStatus && (
                <div
                  className={cn(
                    "p-3 rounded-md text-xs font-medium border",
                    broadcastStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800"
                  )}
                >
                  <span className="font-bold mr-1.5">
                    {broadcastStatus.type === "success" ? "Success:" : "Error:"}
                  </span>
                  {broadcastStatus.message}
                </div>
              )}

              {/* Target Audience: Batch Wise Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Audience
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastTargetType("all")}
                    className={cn(
                      "p-2.5 rounded-md border text-left cursor-pointer transition-all",
                      broadcastTargetType === "all"
                        ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-semibold"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-normal"
                    )}
                  >
                    <p className="text-xs">All Enrolled Students</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Entire cohort ({recipients.length} students)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastTargetType("batch")}
                    className={cn(
                      "p-2.5 rounded-md border text-left cursor-pointer transition-all",
                      broadcastTargetType === "batch"
                        ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-semibold"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-normal"
                    )}
                  >
                    <p className="text-xs">Target Specific Batch</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Deliver only to selected batch
                    </p>
                  </button>
                </div>

                {broadcastTargetType === "batch" && (
                  <div className="pt-1.5 space-y-1">
                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Select Target Batch *
                    </Label>
                    {batches.length > 0 ? (
                      <select
                        value={broadcastBatchId}
                        onChange={(e) => setBroadcastBatchId(e.target.value)}
                        className="w-full h-8.5 px-3 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                        required
                      >
                        {batches.map((b) => {
                          const count = recipients.filter(
                            (r) => r.batch_id === b.id || r.batch === b.name || r.batch === b.id
                          ).length;
                          return (
                            <option key={b.id} value={b.id}>
                              {b.name} ({count} students)
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        No batches created in database yet. Create batches in Batch Management to target specific cohorts.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Notification Title */}
              <div className="space-y-1">
                <Label htmlFor="b-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notification Title *
                </Label>
                <Input
                  id="b-title"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Schedule Update, Lab Assessment Due, Holiday Notice"
                  className="h-8.5 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  required
                />
              </div>

              {/* Notification Message */}
              <div className="space-y-1">
                <Label htmlFor="b-msg" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Message Content *
                </Label>
                <Textarea
                  id="b-msg"
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type the announcement details..."
                  className="text-xs rounded-md bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 resize-none"
                  required
                />
              </div>

              {/* Type and Action Link */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </Label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value)}
                    className="w-full h-8.5 px-3 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="general">General Notice</option>
                    <option value="assessment_assigned">Assessment</option>
                    <option value="course_updated">Course Update</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="b-link" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Optional Action Link
                  </Label>
                  <Input
                    id="b-link"
                    value={broadcastLinkUrl}
                    onChange={(e) => setBroadcastLinkUrl(e.target.value)}
                    placeholder="e.g. /student/tests"
                    className="h-8.5 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="h-8.5 text-xs rounded-md"
                  disabled={isSendingBroadcast}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!broadcastTitle.trim() || !broadcastMessage.trim() || isSendingBroadcast}
                  className="h-8.5 px-4 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSendingBroadcast
                    ? "Delivering Broadcast..."
                    : broadcastTargetType === "batch"
                    ? "Send to Batch"
                    : "Send to All Students"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
