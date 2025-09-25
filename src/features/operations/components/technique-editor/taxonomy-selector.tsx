"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Target, Tag, Shield, Wrench, FileText } from "lucide-react";

// Base interfaces for taxonomy items
interface TaxonomyItem {
  id: string;
  name: string;
}

interface TagItem extends TaxonomyItem {
  color: string;
}

interface TargetItem extends TaxonomyItem {
  description: string;
  isCrownJewel?: boolean;
}

interface ThreatActorItem extends TaxonomyItem {
  description: string;
}

interface ToolItem extends TaxonomyItem {
  description?: string;
}
interface LogSourceItem extends TaxonomyItem {
  description?: string;
}

// Props for different selector types
interface BaseSelectorProps<T extends TaxonomyItem> {
  items: T[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  label: string;
  placeholder?: string;
  description?: string;
  isLoading?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  className?: string;
  compactHeader?: boolean; // render small label without icon
  disabled?: boolean;
}

interface TagSelectorProps extends BaseSelectorProps<TagItem> {
  variant: "tags";
}

interface TargetSelectorProps extends BaseSelectorProps<TargetItem> {
  variant: "targets";
}

interface ThreatActorSelectorProps extends BaseSelectorProps<ThreatActorItem> {
  variant: "threat-actors";
  multiple?: false; // Threat actor is typically single selection
}

type TaxonomySelectorProps = TagSelectorProps | TargetSelectorProps | ThreatActorSelectorProps;
interface ToolsSelectorProps extends BaseSelectorProps<ToolItem> {
  variant: "tools";
}
interface LogSourcesSelectorProps extends BaseSelectorProps<LogSourceItem> {
  variant: "log-sources";
}

type AllSelectorProps = TaxonomySelectorProps | ToolsSelectorProps | LogSourcesSelectorProps;

const selectorConfig = {
  tags: {
    icon: Tag,
    title: "Tags",
    emptyMessage: "No tags available",
    searchPlaceholder: "Search tags...",
  },
  targets: {
    icon: Shield,
    title: "Targets",
    emptyMessage: "No targets available",
    searchPlaceholder: "Search targets...",
  },
  "threat-actors": {
    icon: Target,
    title: "Threat Actors",
    emptyMessage: "No threat actors available",
    searchPlaceholder: "Search threat actors...",
  },
  tools: {
    icon: Wrench,
    title: "Tools",
    emptyMessage: "No tools available",
    searchPlaceholder: "Search tools...",
  },
  "log-sources": {
    icon: FileText,
    title: "Log Sources",
    emptyMessage: "No log sources available",
    searchPlaceholder: "Search log sources...",
  },
};

export default function TaxonomySelector(props: AllSelectorProps) {
  const {
    items,
    selectedIds,
    onSelectionChange,
    label,
    placeholder,
    description,
    isLoading = false,
    multiple = true,
    searchable = true,
    className = "",
    variant,
    compactHeader = false,
    disabled = false,
  } = props;

  const [searchTerm, setSearchTerm] = useState("");
  const config = selectorConfig[variant];
  const Icon = config.icon;

  // Filter items based on search term
  const filteredItems = (searchable && searchTerm)
    ? items.filter(item => {
        const lower = searchTerm.toLowerCase();
        const nameHit = item.name.toLowerCase().includes(lower);
        const hasDesc = (item as { description?: unknown }).description;
        const descHit = typeof hasDesc === 'string' ? hasDesc.toLowerCase().includes(lower) : false;
        return nameHit || descHit;
      })
    : items;

  const toggleSelection = (itemId: string) => {
    if (disabled) return;
    if (multiple) {
      const newSelection = selectedIds.includes(itemId)
        ? selectedIds.filter(id => id !== itemId)
        : [...selectedIds, itemId];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange(selectedIds.includes(itemId) ? [] : [itemId]);
    }
  };

  const clearSelection = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>{label}</Label>
        <div className="flex items-center justify-center p-8 border border-[var(--color-border)] rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent)]"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>{label}</Label>
        <div className="flex items-center justify-center p-8 border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]">
          <Icon className="w-6 h-6 mr-2" />
          {config.emptyMessage}
        </div>
      </div>
    );
  }

  // Render for single selection (typically threat actors)
  if (!multiple) {
    
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>{label}</Label>
        {description && (
          <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
        )}
        <Select
          value={selectedIds[0] ?? "none"}
          onValueChange={(value) => onSelectionChange((value && value !== "none") ? [value] : [])}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder ?? `Select ${config.title.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {placeholder ?? `No ${config.title.toLowerCase()}`}
            </SelectItem>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{item.name}</span>
                  {'description' in item && (
                    <span className="text-xs text-[var(--color-text-muted)] line-clamp-1">
                      {item.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Render for multiple selection (tags, targets, etc.)
  return (
    <div className={`space-y-4 ${className}`}>
      {compactHeader ? (
        <Label>{label}</Label>
      ) : (
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-[var(--color-text-muted)]" />
          <Label className="text-lg font-medium">{label}</Label>
        </div>
      )}
      
      {description && (
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      )}

      {/* Search */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <Input
            placeholder={config.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>
      )}

      {/* Selected items summary */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">
            {selectedIds.length} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="h-auto p-1 text-xs"
            disabled={disabled}
          >
            <X className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      {/* Items grid */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-4 text-[var(--color-text-muted)]">
            No items found matching &quot;{searchTerm}&quot;
          </div>
        ) : (
          <>
            {variant === "tags" && (
              <div className="flex flex-wrap gap-2">
                {filteredItems.map((item) => {
                  const tagItem = item as TagItem;
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <Badge
                      key={item.id}
                      variant={isSelected ? "default" : "secondary"}
                      className={`transition-opacity ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-80"}`}
                      style={isSelected ?
                        { borderColor: tagItem.color, backgroundColor: `${tagItem.color}20`, color: tagItem.color } :
                        undefined
                      }
                      onClick={() => toggleSelection(item.id)}
                    >
                      {item.name}
                    </Badge>
                  );
                })}
              </div>
            )}

            {variant === "targets" && (
              <div className="flex flex-wrap gap-2">
                {filteredItems.map((item) => {
                  const targetItem = item as TargetItem;
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <Badge
                      key={item.id}
                      variant={isSelected ? "default" : "secondary"}
                      className={`flex items-center gap-2 transition-opacity ${
                        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-80"
                      }`}
                      onClick={() => toggleSelection(item.id)}
                      title={targetItem.description}
                    >
                      <span className="truncate max-w-[12rem]">{targetItem.name}</span>
                      {targetItem.isCrownJewel && (
                        <span className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-1 text-[0.65rem] uppercase tracking-wide text-[var(--color-text-muted)]">
                          CJ
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}

            {variant === "tools" && (
              <div className="flex flex-wrap gap-2">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <Badge
                      key={item.id}
                      variant={isSelected ? "default" : "secondary"}
                      className={`transition-opacity ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-80"}`}
                      onClick={() => toggleSelection(item.id)}
                    >
                      {item.name}
                    </Badge>
                  );
                })}
              </div>
            )}

            {variant === "log-sources" && (
              <div className="flex flex-wrap gap-2">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <Badge
                      key={item.id}
                      variant={isSelected ? "default" : "secondary"}
                      className={`transition-opacity ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-80"}`}
                      onClick={() => toggleSelection(item.id)}
                    >
                      {item.name}
                    </Badge>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
