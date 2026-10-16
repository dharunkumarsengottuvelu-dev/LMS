import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook to debounce a fast-changing value (e.g. search input).
 *
 * @param value The value to debounce
 * @param delay Milliseconds to wait before updating debounced value (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook to debounce a callback function (e.g. API search function, table filter).
 *
 * @param callback The function to execute after debounce delay
 * @param delay Milliseconds to wait
 * @returns Debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}
