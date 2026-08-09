import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] ?? ""}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateVerificationId(): string {
  return Array.from({ length: 12 }, () =>
    Math.random().toString(36)[2] ?? "0"
  ).join("").toUpperCase();
}

/**
 * Safely normalizes any caught error, DOM Event, or exception into a clean string message.
 * Prevents DOM Events, null objects, or raw Event instances from stringifying into "[object Event]".
 */
export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}

/**
 * Safely normalizes any error, DOM Event, or unknown exception into a standard JS Error object.
 * Strictly prevents DOM Events or raw objects from propagating as "[object Event]".
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    const cleanStr =
      error === "[object Event]" || error === "[object ErrorEvent]"
        ? "An unexpected browser runtime event occurred."
        : error;
    return new Error(cleanStr);
  }

  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if ("target" in obj || "bubbles" in obj || "preventDefault" in obj || obj.type) {
      const msg =
        typeof obj.message === "string" && obj.message && obj.message !== "[object Event]"
          ? obj.message
          : `Browser DOM Event [type: ${obj.type || "unknown"}]`;
      return new Error(msg);
    }

    if (typeof obj.message === "string" && obj.message && obj.message !== "[object Event]") {
      return new Error(obj.message);
    }

    const errDetail = obj.error;
    if (typeof errDetail === "string" && errDetail && errDetail !== "[object Event]") {
      return new Error(errDetail);
    }

    try {
      const jsonStr = JSON.stringify(error);
      if (jsonStr !== "{}" && jsonStr !== "[object Event]") {
        return new Error(jsonStr);
      }
    } catch {
      return new Error("Unknown runtime error");
    }
  }

  return new Error("Unknown runtime error");
}
