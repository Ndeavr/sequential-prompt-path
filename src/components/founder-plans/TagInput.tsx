import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagItem {
  slug: string;
  label: string;
}

interface Suggestion {
  slug: string;
  name: string;
  extra?: string;
}

interface Props {
  tags: TagItem[];
  onTagsChange: (tags: TagItem[]) => void;
  suggestions: Suggestion[];
  onSearch: (query: string) => void;
  placeholder: string;
  maxTags?: number;
}

export default function TagInput({ tags, onTagsChange, suggestions, onSearch, placeholder, maxTags = 5 }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    onSearch(val);
    setOpen(val.length > 0);
  };

  const addTag = (s: Suggestion) => {
    if (tags.length >= maxTags || tags.some((t) => t.slug === s.slug)) return;
    onTagsChange([...tags, { slug: s.slug, label: s.name }]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (slug: string) => onTagsChange(tags.filter((t) => t.slug !== slug));

  const filtered = suggestions.filter((s) => !tags.some((t) => t.slug === s.slug));

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 min-h-[42px] rounded-md border border-input bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring">
        {tags.map((t) => (
          <span key={t.slug} className="inline-flex items-center gap-1 bg-primary/15 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
            {t.label}
            <button type="button" onClick={() => removeTag(t.slug)} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => { if (query.length > 0) setOpen(true); }}
            placeholder={tags.length === 0 ? placeholder : "Ajouter..."}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {filtered.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 flex items-center justify-between"
            >
              <span>{s.name}</span>
              {s.extra && <span className="text-xs text-muted-foreground">{s.extra}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
