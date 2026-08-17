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

export function getTopicThumbnail(title?: string, category?: string, customThumbnail?: string): string {
  if (customThumbnail && customThumbnail.trim() && !customThumbnail.includes("photo-1633356122544-f134324a6cee")) {
    return customThumbnail;
  }

  const combined = `${title || ""} ${category || ""}`.toLowerCase();

  if (combined.includes("java") || combined.includes("jvm") || combined.includes("spring") || combined.includes("hibernate") || combined.includes("oops")) {
    // Java Programming
    return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80";
  }
  if (combined.includes("python") || combined.includes("django") || combined.includes("flask") || combined.includes("data science") || combined.includes("machine learning") || combined.includes("ai") || combined.includes("pandas") || combined.includes("numpy")) {
    // Python & AI/ML
    return "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80";
  }
  if (combined.includes("c++") || combined.includes("cpp") || combined.includes(" c ") || combined.startsWith("c ") || combined.endsWith(" c") || combined.includes("embedded") || combined.includes("algorithm") || combined.includes("dsa") || combined.includes("data structure")) {
    // C / C++ / DSA
    return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80";
  }
  if (combined.includes("javascript") || combined.includes("typescript") || combined.includes("node") || combined.includes("express") || combined.includes("fullstack")) {
    // JavaScript / TypeScript / Node
    return "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800&auto=format&fit=crop&q=80";
  }
  if (combined.includes("react") || combined.includes("frontend") || combined.includes("next") || combined.includes("vue") || combined.includes("angular") || combined.includes("html") || combined.includes("css") || combined.includes("web")) {
    // React & Web UI
    return "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80";
  }
  if (combined.includes("sql") || combined.includes("database") || combined.includes("dbms") || combined.includes("postgres") || combined.includes("mysql") || combined.includes("mongo")) {
    // SQL & Database
    return "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop&q=80";
  }
  if (combined.includes("cloud") || combined.includes("devops") || combined.includes("aws") || combined.includes("docker") || combined.includes("kubernetes") || combined.includes("linux")) {
    // Cloud & DevOps
    return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80";
  }
  if (combined.includes("aptitude") || combined.includes("reasoning") || combined.includes("verbal") || combined.includes("soft skills") || combined.includes("interview")) {
    // Aptitude & Interview Prep
    return "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80";
  }

  // Default clean programming workspace
  return "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=80";
}
