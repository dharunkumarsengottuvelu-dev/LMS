"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useActiveTimeTracker, ActiveTimeTrackerState } from "@/hooks/use-active-time-tracker";

const ActiveTimeContext = createContext<ActiveTimeTrackerState>({
  totalActiveSeconds: 0,
  todayActiveSeconds: 0,
  sessionActiveSeconds: 0,
  isTracking: false,
  isIdle: false,
  isHidden: false,
  formattedTime: "0 h 0 min 0 s",
});

export function ActiveTimeProvider({ children }: { children: ReactNode }) {
  const activeTimeState = useActiveTimeTracker();

  return (
    <ActiveTimeContext.Provider value={activeTimeState}>
      {children}
    </ActiveTimeContext.Provider>
  );
}

export function useActiveTime() {
  return useContext(ActiveTimeContext);
}
