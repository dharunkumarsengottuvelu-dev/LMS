"use client";

import { useEffect } from "react";
import { normalizeError } from "@/lib/utils";

/**
 * GlobalErrorListener provides application-wide defense against uncaught DOM Events,
 * script loading failures, media errors, and unhandled Promise rejections that produce
 * Next.js "Runtime Error: [object Event]".
 */
export function GlobalErrorListener() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Handle global window error events (script, image, link, media, or thrown events)
    const handleGlobalWindowError = (event: ErrorEvent | Event) => {
      const targetTag = (event.target as HTMLElement)?.tagName;
      const isResourceError = !!targetTag;
      const errorObj = (event as ErrorEvent).error;
      const message = (event as ErrorEvent).message;

      const isRawEvent =
        isResourceError ||
        !errorObj ||
        errorObj instanceof Event ||
        String(errorObj) === "[object Event]" ||
        String(errorObj) === "[object ErrorEvent]" ||
        message === "Script error." ||
        message === "[object Event]";

      if (isRawEvent) {
        if (typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        if ("stopImmediatePropagation" in event && typeof (event as { stopImmediatePropagation?: unknown }).stopImmediatePropagation === "function") {
          (event as { stopImmediatePropagation: () => void }).stopImmediatePropagation();
        }

        const safeErr = normalizeError(errorObj || message || event);
        console.warn("Global Window Event caught & normalized:", {
          message: safeErr.message,
          targetTag,
          eventType: event.type,
        });
      }
    };

    // Handle global unhandled promise rejections (e.g., Monaco script/worker rejection)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const isEventReason =
        reason instanceof Event ||
        (reason && typeof reason === "object" && ("target" in reason || "bubbles" in reason) && !("message" in reason)) ||
        String(reason) === "[object Event]" ||
        String(reason) === "[object ErrorEvent]";

      if (isEventReason) {
        if (typeof event.preventDefault === "function") {
          event.preventDefault();
        }

        const safeErr = normalizeError(reason);
        console.warn("Global Unhandled Promise Rejection (Event) caught & normalized:", {
          message: safeErr.message,
          reason,
        });
      }
    };

    window.addEventListener("error", handleGlobalWindowError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.removeEventListener("error", handleGlobalWindowError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  return null;
}
