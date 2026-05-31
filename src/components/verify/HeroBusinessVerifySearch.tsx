/**
 * UNPRO — HeroBusinessVerifySearch
 * First-page autocomplete that searches Google Places (via business-lookup edge fn)
 * and routes the picked business straight into the verification engine — fully prefilled.
 * No second form. No clarifying question.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Building2, Globe, Loader2, MapPin, Phone, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessSearchResult } from "@/components/contractor/BusinessNameSearch";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

interface HeroBusinessVerifySearchProps {
  /** When provided, picking a result calls this instead of navigating away. */
  onPick?: (result: BusinessSearchResult, rawQuery: string) => void;
}

export default function HeroBusinessVerifySearch({ onPick }: HeroBusinessVerifySearchProps = {}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BusinessSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const id = ++reqIdRef.current;
    if (q.trim().length < MIN_CHARS) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-lookup", {
        body: { query: q.trim() },
      });
      if (id !== reqIdRef.current) return; // stale
      if (error) {
        setResults([]);
      } else {
        const list: BusinessSearchResult[] = data?.results || [];
        setResults(list);
        setOpen(list.length > 0);
        setHighlight(list.length > 0 ? 0 : -1);
      }
    } catch {
      if (id === reqIdRef.current) setResults([]);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), DEBOUNCE_MS);
  };

  const pick = (r: BusinessSearchResult) => {
    setOpen(false);
    if (onPick) {
      onPick(r, query.trim());
      return;
    }
    navigate(
      `/verifier-un-entrepreneur?q=${encodeURIComponent(r.business_name)}`,
      {
        state: {
          autoRun: true,
          prefill: {
            business_name: r.business_name,
            phone: r.phone || "",
            website: r.website || "",
            city: r.city || "",
            place_id: r.place_id,
          },
        },
      }
    );
  };

  const handleVerifyClick = async () => {
    const q = query.trim();
    if (!q) return;

    // If we already have results, pick the highlighted (or top) one.
    if (results.length === 1) return pick(results[0]);
    if (results.length > 1) {
      setOpen(true);
      // leave choice to the user
      return;
    }

    // No results yet — run a fresh search and act on its outcome.
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("business-lookup", {
        body: { query: q },
      });
      const list: BusinessSearchResult[] = data?.results || [];
      setResults(list);
      if (list.length === 1) {
        pick(list[0]);
        return;
      }
      if (list.length > 1) {
        setOpen(true);
        setHighlight(0);
        return;
      }
      // Empty — fall back to manual page with the raw query as business name.
      navigate(`/verifier-un-entrepreneur?q=${encodeURIComponent(q)}`, {
        state: { prefill: { business_name: q } },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length === 0) return;
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlight >= 0 && results[highlight]) {
        pick(results[highlight]);
      } else {
        handleVerifyClick();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-[var(--shadow-md)] p-2">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Nom, téléphone, RBQ ou site web"
              className="pl-10 pr-9 h-12 border-0 bg-transparent text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label="Identifiant de l'entrepreneur"
              autoComplete="off"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
          <Button
            onClick={handleVerifyClick}
            size="lg"
            className="h-12 px-5 md:px-6 gap-2 font-semibold shrink-0"
            disabled={loading && results.length === 0}
          >
            Vérifier <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-border/50 bg-card shadow-[var(--shadow-lg)] overflow-hidden"
          >
            <div className="max-h-[360px] overflow-y-auto text-left">
              {results.map((r, i) => (
                <button
                  key={r.place_id}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(r)}
                  className={`w-full text-left px-4 py-3 transition-colors border-b border-border/30 last:border-0 ${
                    i === highlight ? "bg-muted/60" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {r.business_name}
                      </p>
                      {(r.city || r.province) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {r.city}
                            {r.province ? `, ${r.province}` : ""}
                          </span>
                        </div>
                      )}
                      {r.primary_category && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {r.primary_category}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {r.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                            {r.rating} ({r.review_count})
                          </span>
                        )}
                        {r.website && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Globe className="h-2.5 w-2.5" /> Site
                          </span>
                        )}
                        {r.phone && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" /> Tél.
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2 bg-muted/30 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Sélectionnez une entreprise pour lancer la vérification
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
