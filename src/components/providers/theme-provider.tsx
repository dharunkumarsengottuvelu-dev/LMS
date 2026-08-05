"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderContextType>({
  theme: "light",
  setTheme: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "edunexus-theme",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const savedTheme = (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, [defaultTheme, storageKey]);

  const applyTheme = (targetTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (targetTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(targetTheme);
    }
  };

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
