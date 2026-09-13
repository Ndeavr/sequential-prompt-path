/**
 * UNPRO — BusinessNameSearch
 * Autocomplete component that searches Google Places on business name input.
 * Auto-fills: city, primary category, secondary categories, phone, website.
 * Debounced, with loading states and suggestion dropdown.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Star, Loader2, Building2, Globe, Phone, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface BusinessSearchResult {
  place_id: string;
  business_name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  website: string;
  rating: number;
  review_count: number;
  primary_category: string | null;
  secondary_categories: string[];
  google_types: string[];
  description: string;
}

export interface BusinessNameSearchProps {
  value: string;
  onChange: (name: string) => void;
  onBusinessSelected?: (result: BusinessSearchResult) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  /** Minimum characters before triggering search */
  minChars?: number;
  /** Debounce delay in ms (default 300). */
  debounceMs?: number;
  /** Visual tone — "dark" for the cinematic dark funnel pages. */
  tone?: "light" | "dark";
  /**
   * Data source. "google" = Google Places via `business-lookup`.
   * "unpro" = the same real contractor/prospect index used by the free AI audit
   * (`ai-recommendation-audit` action "search"). No fabricated results in either case.
   */
  source?: "google" | "unpro";
  /** Notified on every search state change (loading / results count / searched). */
  onSearchState?: (state: { loading: boolean; count: number; searched: boolean }) => void;
}

export default function BusinessNameSearch({
  value,
  onChange,
  onBusinessSelected,
  placeholder = "Ex: Toiture Expert Inc.",
  label = "Nom de l'entreprise *",
  className = "",
  minChars = 3,
  debounceMs = 300,
  tone = "light",
  source = "google",
  onSearchState,
}: BusinessNameSearchProps) {

  const [results, setResults] = useState<BusinessSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  // Monotonic request id: any response older than the latest request is dropped.
  const reqIdRef = useRef(0);
  const dark = tone === "dark";

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    reqIdRef.current++;
  }, []);

  const searchBusiness = useCallback(async (query: string) => {
    if (query.trim().length < minChars) {
      reqIdRef.current++;
      setResults([]);
      setShowDropdown(false);
      setLoading(false);
      onSearchState?.({ loading: false, count: 0, searched: false });
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoading(true);
    onSearchState?.({ loading: true, count: 0, searched: false });
    try {
      const { data, error } = source === "unpro"
        ? await supabase.functions.invoke("ai-recommendation-audit", {
            body: { action: "search", query: query.trim() },
          })
        : await supabase.functions.invoke("business-lookup", {
            body: { query: query.trim() },
          });
      if (reqId !== reqIdRef.current) return; // stale response

      if (error) {
        console.error("Business lookup error:", error);
        setResults([]);
        setShowDropdown(false);
        onSearchState?.({ loading: false, count: 0, searched: true });
      } else {
        const list: BusinessSearchResult[] = source === "unpro"
          ? ((data?.candidates ?? []) as Array<{
              id: string;
              business_name: string | null;
              city: string | null;
              trade: string | null;
            }>)
              .filter((c) => Boolean(c.business_name))
              .map((c) => ({
                place_id: c.id,
                business_name: c.business_name as string,
                address: "",
                city: c.city ?? "",
                province: "",
                phone: "",
                website: "",
                rating: 0,
                review_count: 0,
                primary_category: c.trade ?? null,
                secondary_categories: [],
                google_types: [],
                description: "",
              }))
          : (data?.results || []);
        setResults(list);
        setShowDropdown(list.length > 0);
        onSearchState?.({ loading: false, count: list.length, searched: true });
      }
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      console.error("Business lookup failed:", err);
      setResults([]);
      setShowDropdown(false);
      onSearchState?.({ loading: false, count: 0, searched: true });
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [minChars, onSearchState, source]);


  const handleChange = (newValue: string) => {
    onChange(newValue);
    setSelectedId(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchBusiness(newValue), debounceMs);
  };

  const handleSelect = (result: BusinessSearchResult) => {
    onChange(result.business_name);
    setSelectedId(result.place_id);
    setShowDropdown(false);
    setResults([]);
    onSearchState?.({ loading: false, count: 0, searched: true });
    onBusinessSelected?.(result);
  };


  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Label className={dark ? "text-xs uppercase tracking-wider text-white/50" : "text-xs font-semibold"}>
        {label}
      </Label>
      <div className="relative mt-1.5">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
            dark ? "text-white/40" : "text-muted-foreground"
          }`}
        />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={
            dark
              ? "pl-10 pr-10 rounded-xl h-12 bg-black/30 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0 focus:border-amber-400"
              : "pl-10 pr-10 rounded-xl h-12"
          }
        />
        {loading && (
          <Loader2
            className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin ${
              dark ? "text-white/60" : "text-muted-foreground"
            }`}
          />
        )}
        {selectedId && !loading && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 mt-1 w-full rounded-xl border shadow-lg overflow-hidden ${
              dark ? "bg-[#0a1020] border-white/10" : "bg-card"
            }`}
            style={dark ? undefined : { borderColor: "hsl(var(--border))" }}

          >
            <div className="max-h-[320px] overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className={`w-full text-left px-4 py-3 transition-colors last:border-0 border-b ${
                    dark
                      ? "hover:bg-white/[0.06] border-white/10"
                      : "hover:bg-muted/50 border-border/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        dark ? "bg-amber-400/10" : "bg-primary/10"
                      }`}
                    >
                      <Building2 className={`h-4 w-4 ${dark ? "text-amber-300" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-foreground"}`}>
                        {r.business_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MapPin className={`h-3 w-3 shrink-0 ${dark ? "text-white/50" : "text-muted-foreground"}`} />
                        <span className={`text-xs truncate ${dark ? "text-white/70" : "text-muted-foreground"}`}>
                          {r.city}{r.province ? `, ${r.province}` : ""}
                        </span>
                      </div>
                      {/* Categories */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.primary_category && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${dark ? "bg-white/10 text-white/80 border-0" : ""}`}
                          >
                            {r.primary_category}
                          </Badge>
                        )}
                        {r.secondary_categories.slice(0, 2).map((cat) => (
                          <Badge
                            key={cat}
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${dark ? "border-white/20 text-white/70" : ""}`}
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                      {/* Meta */}
                      <div className={`flex items-center gap-3 mt-1 ${dark ? "text-white/60" : "text-muted-foreground"}`}>
                        {r.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px]">
                            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                            {r.rating} ({r.review_count})
                          </span>
                        )}
                        {r.website && (
                          <span className="flex items-center gap-0.5 text-[10px]">
                            <Globe className="h-2.5 w-2.5" />
                            Site web
                          </span>
                        )}
                        {r.phone && (
                          <span className="flex items-center gap-0.5 text-[10px]">
                            <Phone className="h-2.5 w-2.5" />
                            Tél.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div
              className={`px-4 py-2 border-t ${
                dark ? "bg-white/[0.03] border-white/10" : "bg-muted/30 border-border/30"
              }`}
            >
              <p className={`text-[10px] text-center ${dark ? "text-white/50" : "text-muted-foreground"}`}>
                {source === "unpro" ? "Entreprises réelles · Sélectionnez pour remplir automatiquement" : "Résultats Google Maps · Sélectionnez pour remplir automatiquement"}
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
