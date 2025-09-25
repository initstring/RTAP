"use client";

import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  allowDeselect?: boolean;
  onDeselect?: () => void;
}

export function Segmented<T extends string>({ options, value, onChange, allowDeselect = false, onDeselect }: SegmentedProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={cn(
              badgeVariants({ variant: selected ? "default" : "secondary" }),
              "px-3 py-1.5 text-sm transition-colors",
              selected
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[var(--color-border)]"
            )}
            onClick={() => {
              if (allowDeselect && selected) {
                onDeselect?.();
                return;
              }
              onChange(opt.value);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
