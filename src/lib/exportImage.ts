"use client";

import { toPng } from "html-to-image";

import { shouldExportNode } from "./shouldExportNode";

type StyleOverride = {
  element: HTMLElement;
  property: string;
  value: string;
  priority: string;
};

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
    applyStyleOverride(element, "min-width", "fit-content", "important", overrides);
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

export async function captureElementToPng(element: HTMLElement): Promise<string> {
  const rootOverrides: StyleOverride[] = [];
  const restore = applyExportDirectivesInPlace(element);

  try {
    const width = element.scrollWidth || element.clientWidth;
    const height = element.scrollHeight || element.clientHeight;
    const computed = getComputedStyle(element);
    const { background, backgroundColor } = computed;

    applyStyleOverride(element, "width", `${width}px`, "important", rootOverrides);
    applyStyleOverride(element, "height", `${height}px`, "important", rootOverrides);
    applyStyleOverride(element, "overflow", "visible", "important", rootOverrides);

    return await toPng(element, {
      skipFonts: true,
      width,
      height,
      backgroundColor: backgroundColor === "rgba(0, 0, 0, 0)" ? undefined : backgroundColor,
      style: background ? { background } : undefined,
      filter: shouldExportNode,
    });
  } finally {
    restoreStyleOverrides(rootOverrides);
    restore();
  }
}

