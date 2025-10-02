"use client";

import { useState, type RefObject } from "react";
import { Download, Settings } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { captureElementToPng } from "@/lib/exportImage";
import { useTheme } from "../theme";
import type { ThemeKey } from "../theme";

interface ExportToPngButtonProps extends Omit<ButtonProps, "onClick"> {
  targetRef: RefObject<HTMLElement | null>;
  fileName: string;
  label?: string;
  exportTheme?: ThemeKey;
  optimizeForPrint?: boolean;
  showThemeOptions?: boolean;
}

export function ExportToPngButton({
  targetRef,
  fileName,
  label = "Export PNG",
  exportTheme,
  optimizeForPrint = false,
  showThemeOptions = false,
  disabled,
  ...buttonProps
}: ExportToPngButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { theme: currentTheme, isLight } = useTheme();

  const handleExport = async (forceTheme?: ThemeKey, forceOptimize?: boolean) => {
    if (isExporting) return;
    const node = targetRef.current;
    if (!node) {
      window.alert("Unable to export image. Please try again once the content loads.");
      return;
    }
    
    setIsExporting(true);
    try {
      const dataUrl = await captureElementToPng(node, {
        forceTheme: forceTheme ?? exportTheme,
        optimizeForPrint: forceOptimize ?? optimizeForPrint,
      });
      
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
      window.alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setShowOptions(false);
    }
  };

  if (showThemeOptions) {
    return (
      <div className="relative">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            {...buttonProps}
            disabled={disabled ?? isExporting}
            onClick={() => handleExport()}
            aria-label={label}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {isExporting ? "Exporting…" : label}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowOptions(!showOptions)}
            aria-label="Export options"
            disabled={disabled ?? isExporting}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {showOptions && (
          <div className="absolute top-full right-0 mt-1 z-50 min-w-48 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 shadow-lg">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--color-text-primary)]">
                Export Options
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleExport()}
              >
                Current Theme ({isLight ? "Light" : "Dark"})
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleExport("theme-light-neutral")}
              >
                Light Mode (Print-friendly)
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleExport("theme-modern-teal")}
              >
                Dark Mode
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      {...buttonProps}
      disabled={disabled ?? isExporting}
      onClick={() => handleExport()}
      aria-label={label}
    >
      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
      {isExporting ? "Exporting…" : label}
    </Button>
  );
}

