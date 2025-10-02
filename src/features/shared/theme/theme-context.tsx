"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ThemeKey, ThemeMode } from "./theme-types";
import { getThemeMode, getDefaultTheme, ALL_THEMES } from "./theme-types";

interface ThemeContextType {
  theme: ThemeKey;
  mode: ThemeMode;
  setTheme: (theme: ThemeKey) => void;
  setMode: (mode: ThemeMode) => void;
  isLight: boolean;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeKey;
}

export function ThemeProvider({ children, defaultTheme = "theme-modern-teal" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeKey>(defaultTheme);
  const mode = getThemeMode(theme);

  const applyTheme = (newTheme: ThemeKey) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      // Remove all theme classes
      ALL_THEMES.forEach(t => root.classList.remove(t.key));
      // Add new theme class
      root.classList.add(newTheme);
    }
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rtap.theme', newTheme);
    }
    
    setThemeState(newTheme);
  };

  const setTheme = (newTheme: ThemeKey) => {
    applyTheme(newTheme);
  };

  const setMode = (newMode: ThemeMode) => {
    const currentMode = getThemeMode(theme);
    if (currentMode !== newMode) {
      const newTheme = getDefaultTheme(newMode);
      applyTheme(newTheme);
    }
  };

  // Load stored theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rtap.theme') as ThemeKey | null;
      const isValidTheme = stored && ALL_THEMES.some(t => t.key === stored);
      const initial = isValidTheme ? stored : defaultTheme;
      applyTheme(initial);
    }
  }, [defaultTheme]);

  const value: ThemeContextType = {
    theme,
    mode,
    setTheme,
    setMode,
    isLight: mode === "light",
    isDark: mode === "dark",
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}