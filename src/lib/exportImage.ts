"use client";

import { toPng } from "html-to-image";
import type { ThemeKey } from "@features/shared/theme";
import { isLightTheme, getDefaultTheme } from "@features/shared/theme";

import { shouldExportNode } from "./shouldExportNode";

type StyleOverride = {
  element: HTMLElement;
  property: string;
  value: string;
  priority: string;
};

interface ExportOptions {
  forceTheme?: ThemeKey;
  optimizeForPrint?: boolean;
  backgroundColor?: string;
}

function restoreStyleOverrides(overrides: StyleOverride[]) {
  for (let i = overrides.length - 1; i >= 0; i -= 1) {
    const override = overrides[i];
    if (!override) continue;

    const { element, property, value, priority } = override;
    if (value) {
      element.style.setProperty(property, value, priority);
    } else {
      element.style.removeProperty(property);
    }
  }
}

function collectDirectiveElements(root: HTMLElement) {
  const unbounded = new Set<HTMLElement>();
  const visible = new Set<HTMLElement>();

  const maybeAdd = (element: HTMLElement) => {
    if (element.dataset.exportUnbounded !== undefined) {
      unbounded.add(element);
    }
    if (element.dataset.exportVisible !== undefined) {
      visible.add(element);
    }
  };

  maybeAdd(root);
  root
    .querySelectorAll<HTMLElement>("[data-export-unbounded]")
    .forEach((element) => unbounded.add(element));
  root
    .querySelectorAll<HTMLElement>("[data-export-visible]")
    .forEach((element) => visible.add(element));

  return { unbounded, visible };
}

function applyStyleOverride(
  element: HTMLElement,
  property: string,
  value: string,
  priority: "" | "important",
  overrides: StyleOverride[],
) {
  overrides.push({
    element,
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  });

  element.style.setProperty(property, value, priority);
}

function applyExportDirectivesInPlace(root: HTMLElement) {
  const overrides: StyleOverride[] = [];
  const { unbounded, visible } = collectDirectiveElements(root);

  unbounded.forEach((element) => {
    applyStyleOverride(element, "max-height", "none", "important", overrides);
    applyStyleOverride(element, "max-width", "none", "important", overrides);
    applyStyleOverride(element, "height", "auto", "important", overrides);
    applyStyleOverride(element, "overflow", "visible", "important", overrides);
  });

  visible.forEach((element) => {
    applyStyleOverride(element, "position", "static", "important", overrides);
    applyStyleOverride(element, "left", "auto", "important", overrides);
    applyStyleOverride(element, "right", "auto", "important", overrides);
    applyStyleOverride(element, "top", "auto", "important", overrides);
    applyStyleOverride(element, "bottom", "auto", "important", overrides);
    applyStyleOverride(element, "transform", "none", "important", overrides);
  });

  return () => {
    restoreStyleOverrides(overrides);
  };
}

function applyExportThemeOverride(root: HTMLElement, targetTheme?: ThemeKey, optimizeForPrint = false) {
  const overrides: StyleOverride[] = [];
  const htmlElement = document.documentElement;
  
  if (targetTheme || optimizeForPrint) {
    // Determine the theme to use for export
    const exportTheme = optimizeForPrint ? getDefaultTheme("light") : targetTheme;
    
    if (exportTheme) {
      // Store current theme classes
      const currentClasses = Array.from(htmlElement.classList);
      const themeClasses = currentClasses.filter(cls => 
        cls.startsWith("theme-modern-") || cls.startsWith("theme-light-")
      );
      
      // Apply export theme
      themeClasses.forEach(cls => htmlElement.classList.remove(cls));
      htmlElement.classList.add(exportTheme);
      
      // If using light theme for export, ensure proper contrast and visibility
      if (isLightTheme(exportTheme) || optimizeForPrint) {
        applyStyleOverride(root, "background-color", "#ffffff", "important", overrides);
        applyStyleOverride(root, "color", "#0f172a", "important", overrides);
        
        // Remove any glow effects that don't work well in light mode
        const glowElements = root.querySelectorAll<HTMLElement>(".glow-accent, .glow-subtle, .glow-error");
        glowElements.forEach(el => {
          applyStyleOverride(el, "box-shadow", "none", "important", overrides);
        });
      }
      
      return () => {
        // Restore original theme classes
        htmlElement.classList.remove(exportTheme);
        themeClasses.forEach(cls => htmlElement.classList.add(cls));
        restoreStyleOverrides(overrides);
      };
    }
  }
  
  return () => {
    restoreStyleOverrides(overrides);
  };
}

export async function captureElementToPng(
  element: HTMLElement, 
  options: ExportOptions = {}
): Promise<string> {
  const { forceTheme, optimizeForPrint = false, backgroundColor } = options;
  
  const rootOverrides: StyleOverride[] = [];
  const restore = applyExportDirectivesInPlace(element);
  const restoreTheme = applyExportThemeOverride(element, forceTheme, optimizeForPrint);

  try {
    const width = element.scrollWidth || element.clientWidth;
    const height = element.scrollHeight || element.clientHeight;
    const computed = getComputedStyle(element);
    
    // Determine background color
    let finalBackgroundColor = backgroundColor;
    if (!finalBackgroundColor) {
      if (optimizeForPrint || (forceTheme && isLightTheme(forceTheme))) {
        finalBackgroundColor = "#ffffff";
      } else {
        const { background, backgroundColor: computedBg } = computed;
        finalBackgroundColor = computedBg === "rgba(0, 0, 0, 0)" ? undefined : computedBg;
      }
    }

    applyStyleOverride(element, "width", `${width}px`, "important", rootOverrides);
    applyStyleOverride(element, "height", `${height}px`, "important", rootOverrides);
    applyStyleOverride(element, "overflow", "visible", "important", rootOverrides);

    return await toPng(element, {
      skipFonts: true,
      width,
      height,
      backgroundColor: finalBackgroundColor,
      style: finalBackgroundColor ? { background: finalBackgroundColor } : undefined,
      filter: shouldExportNode,
    });
  } finally {
    restoreStyleOverrides(rootOverrides);
    restoreTheme();
    restore();
  }
}

