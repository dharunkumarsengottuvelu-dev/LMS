"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface DraftMeta {
  savedAt: string;
  isSaved: boolean;
}

export function useDraftState<T>(
  key: string,
  initialValue: T,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
  }
) {
  const { enabled = true, debounceMs = 400 } = options || {};
  const [data, setData] = useState<T>(initialValue);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasRestored, setHasRestored] = useState<boolean>(false);
  const isFirstRender = useRef(true);

  // 1. Restore from localStorage on initial mount
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(`draft_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.data !== undefined) {
          setData(parsed.data);
          setLastSaved(parsed.savedAt || new Date().toLocaleTimeString());
          setIsSaved(true);
        }
      }
    } catch (err) {
      console.warn(`[Draft] Failed to load draft for key "${key}":`, err);
    } finally {
      setHasRestored(true);
    }
  }, [key, enabled]);

  // 2. Auto-save to localStorage on data change (debounced)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!hasRestored) return;

    setIsSaved(false);
    const handler = setTimeout(() => {
      try {
        const payload = {
          data,
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        localStorage.setItem(`draft_${key}`, JSON.stringify(payload));
        setIsSaved(true);
        setLastSaved(payload.savedAt);
      } catch (err) {
        console.warn(`[Draft] Failed to auto-save draft for key "${key}":`, err);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [data, key, enabled, debounceMs, hasRestored]);

  // 3. Clear draft upon successful submission
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(`draft_${key}`);
      setIsSaved(true);
      setLastSaved(null);
    } catch (err) {
      console.warn(`[Draft] Failed to clear draft for key "${key}":`, err);
    }
  }, [key]);

  // 4. Force immediate manual save
  const saveDraftNow = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        data,
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      localStorage.setItem(`draft_${key}`, JSON.stringify(payload));
      setIsSaved(true);
      setLastSaved(payload.savedAt);
    } catch (err) {
      console.warn(`[Draft] Failed to save draft for key "${key}":`, err);
    }
  }, [data, key]);

  return {
    data,
    setData,
    isSaved,
    lastSaved,
    clearDraft,
    saveDraftNow,
    hasRestored
  };
}
