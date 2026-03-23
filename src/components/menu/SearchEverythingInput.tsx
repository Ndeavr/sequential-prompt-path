/**
 * UNPRO — Global smart search across all menu items
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { Search, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HOMEOWNER_SECTIONS, type MenuItemDef, type MenuSectionDef } from "@/data/menuTaxonomy";

interface SearchResult {
  item: MenuItemDef;
  section: MenuSectionDef;
}

interface SearchEverythingInputProps {
  onSelect?: (item: MenuItemDef, section: MenuSectionDef) => void;
  placeholder?: string;
}

export default function SearchEverythingInput({
  onSelect,
  placeholder = "Rechercher un service, expert, fournisseur ou programme…",
}: SearchEverythingInputProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    };
    if (focused) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

  const results = useMemo<SearchResult[]>(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const matches: SearchResult[] = [];
    for (const section of HOMEOWNER_SECTIONS) {
      for (const item of section.items) {
        if (item.name.toLowerCase().includes(q) || item.slug.includes(q) || section.name.toLowerCase().includes(q)) {
          matches.push({ item, section });
        }
      }
    }
    return matches.slice(0, 8);
  }, [query]);

  return (
    <div ref={ref} className="relative w-full">
      <div className={`relative flex items-center rounded-xl border transition-all ${
        focused ? "border-primary/40 bg-card shadow-lg ring-2 ring-primary/10" : "border-border bg-muted/30"
      }`}>
        <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none rounded-xl"
        />
      </div>

      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50"
          >
            {results.map((r) => {
              const Icon = r.item.icon;
              return (
                <button
                  key={`${r.section.slug}-${r.item.slug}`}
                  type="button"
                  onClick={() => {
                    onSelect?.(r.item, r.section);
                    setQuery("");
                    setFocused(false);
                  }}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">{r.item.name}</div>
                    <div className="text-xs text-muted-foreground">{r.section.name}</div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
