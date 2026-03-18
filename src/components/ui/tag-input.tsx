/**
 * TagInput — Autocomplete tag input with Enter/comma to confirm, x to remove, max limit.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  /** Currently selected tags */
  value: string[];
  /** All available suggestions */
  suggestions: string[];
  /** Called when tags change */
  onChange: (tags: string[]) => void;
  /** Max number of tags allowed */
  max?: number;
  /** Placeholder when no tags and no input */
  placeholder?: string;
  /** Label shown above limit badge */
  limitLabel?: string;
  /** Extra class on wrapper */
  className?: string;
  /** Pre-suggested tags shown as chips before user types */
  recommended?: string[];
}

export default function TagInput({
  value,
  suggestions,
  onChange,
  max = 3,
  placeholder = "Tapez une catégorie…",
  limitLabel,
  className,
  recommended = [],
}: TagInputProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const atLimit = value.length >= max;

  // Filter suggestions based on query, excluding already selected
  const filtered = query.trim()
    ? suggestions
        .filter((s) => !value.includes(s))
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
    : [];

  // Recommended tags not yet selected
  const recommendedVisible = recommended.filter((r) => !value.includes(r));

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || value.includes(trimmed) || atLimit) return;
      // Only allow tags from suggestions list
      const match = suggestions.find((s) => s.toLowerCase() === trimmed.toLowerCase());
      if (match) {
        onChange([...value, match]);
        setQuery("");
      }
    },
    [value, onChange, suggestions, atLimit],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((v) => v !== tag));
    },
    [value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (filtered.length > 0) {
        addTag(filtered[0]);
      } else {
        addTag(query);
      }
    }
    if (e.key === "Backspace" && !query && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {/* Limit indicator */}
      {max && (
        <div className="flex items-center justify-between mb-1.5">
          {limitLabel && (
            <span className="text-[10px] text-muted-foreground">{limitLabel}</span>
          )}
          <span
            className={cn(
              "text-[10px] font-medium ml-auto",
              atLimit ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {value.length}/{max}
          </span>
        </div>
      )}

      {/* Input area with tags */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-[48px] rounded-xl border bg-background px-3 py-2 transition-all cursor-text",
          isFocused
            ? "border-ring ring-2 ring-ring/20"
            : "border-input hover:border-ring/50",
          atLimit && "opacity-80",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary/15 text-secondary-foreground px-2.5 py-1 text-xs font-medium border border-secondary/20"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="rounded-full p-0.5 hover:bg-destructive/15 hover:text-destructive transition-colors"
              aria-label={`Retirer ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {!atLimit && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(",", ""))}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>

      {/* Recommended chips */}
      {recommendedVisible.length > 0 && !atLimit && !query && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] text-muted-foreground self-center mr-1">Suggérés :</span>
          {recommendedVisible.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => addTag(r)}
              className="rounded-lg bg-primary/8 text-primary border border-primary/15 px-2.5 py-1 text-[11px] font-medium hover:bg-primary/15 transition-colors"
            >
              + {r}
            </button>
          ))}
        </div>
      )}

      {/* Autocomplete dropdown */}
      {isFocused && filtered.length > 0 && !atLimit && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                addTag(s);
                inputRef.current?.focus();
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* At limit message */}
      {atLimit && isFocused && (
        <p className="text-[10px] text-destructive mt-1.5">
          Maximum de {max} catégories atteint. Retirez-en une pour en ajouter.
        </p>
      )}
    </div>
  );
}
