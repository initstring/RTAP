"use client";

import { useState } from "react";
import { Sun, Moon, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "../theme";
import { getThemesByMode, type ThemeMode } from "../theme";

interface ThemeToggleProps {
  variant?: "full" | "compact" | "mode-only";
}

export function ThemeToggle({ variant = "full" }: ThemeToggleProps) {
  const { theme, mode, setTheme, setMode } = useTheme();
  const [showThemes, setShowThemes] = useState(false);

  if (variant === "mode-only") {
    // Simple dark/light mode toggle
    const toggleMode = () => {
      setMode(mode === "dark" ? "light" : "dark");
    };

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMode}
        aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      >
        {mode === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
    );
  }

  if (variant === "compact") {
    // Compact cycling button with mode indicator
    const currentThemes = getThemesByMode(mode);
    const currentIndex = currentThemes.findIndex(t => t.key === theme);
    
    const nextTheme = () => {
      const nextIndex = (currentIndex + 1) % currentThemes.length;
      const next = currentThemes[nextIndex];
      if (next) setTheme(next.key);
    };

    const toggleMode = () => {
      setMode(mode === "dark" ? "light" : "dark");
    };

    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMode}
          aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
        >
          {mode === "dark" ? (
            <Moon className="h-3 w-3" />
          ) : (
            <Sun className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={nextTheme}
          aria-label="Change theme"
          title="Change theme"
        >
          <span
            className="inline-block w-3 h-3 rounded-full border"
            style={{ 
              background: 'var(--ring)', 
              borderColor: 'var(--color-border)' 
            }}
          />
        </Button>
      </div>
    );
  }

  // Full theme selector
  const currentThemes = getThemesByMode(mode);

  return (
    <div className="space-y-2">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          Theme Mode
        </span>
        <div className="inline-flex items-center rounded-md border border-[var(--color-border)] overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none rounded-l-md ${mode === "dark" ? 'ring-2 ring-[var(--ring)]' : ''}`}
            onClick={() => setMode("dark")}
            aria-pressed={mode === "dark"}
          >
            <Moon className="mr-2 h-3 w-3" />
            Dark
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none rounded-r-md ${mode === "light" ? 'ring-2 ring-[var(--ring)]' : ''}`}
            onClick={() => setMode("light")}
            aria-pressed={mode === "light"}
          >
            <Sun className="mr-2 h-3 w-3" />
            Light
          </Button>
        </div>
      </div>

      {/* Theme Color Selector */}
      <div className="space-y-1">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          Color Theme
        </span>
        <div className="inline-flex items-center rounded-md border border-[var(--color-border)] overflow-hidden">
          {currentThemes.map((t, i) => {
            const selected = theme === t.key;
            return (
              <Button
                key={t.key}
                variant="ghost"
                size="sm"
                className={`rounded-none ${i === 0 ? 'rounded-l-md' : ''} ${i === currentThemes.length - 1 ? 'rounded-r-md' : ''} ${selected ? 'ring-2 ring-[var(--ring)]' : ''}`}
                aria-pressed={selected}
                onClick={() => setTheme(t.key)}
              >
                {t.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
