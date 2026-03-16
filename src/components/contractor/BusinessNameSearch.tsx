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
}

export default function BusinessNameSearch({
  value,
  onChange,
  onBusinessSelected,
  placeholder = "Ex: Toiture Expert Inc.",
  label = "Nom de l'entreprise *",
  className = "",
  minChars = 3,
}: BusinessNameSearchProps) {
  const [results, setResults] = useState<BusinessSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

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

  const searchBusiness = useCallback(async (query: string) => {
    if (query.trim().length < minChars) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-lookup", {
        body: { query: query.trim() },
      });

      if (error) {
        console.error("Business lookup error:", error);
        setResults([]);
      } else {
        setResults(data?.results || []);
        setShowDropdown((data?.results || []).length > 0);
      }
    } catch (err) {
      console.error("Business lookup failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [minChars]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    setSelectedId(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchBusiness(newValue), 500);
  };

  const handleSelect = (result: BusinessSearchResult) => {
    onChange(result.business_name);
    setSelectedId(result.place_id);
    setShowDropdown(false);
    setResults([]);
    onBusinessSelected?.(result);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="relative mt-1.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 rounded-xl h-12"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
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
            className="absolute z-50 mt-1 w-full rounded-xl border bg-card shadow-lg overflow-hidden"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <div className="max-h-[320px] overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {r.business_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {r.city}{r.province ? `, ${r.province}` : ""}
                        </span>
                      </div>
                      {/* Categories */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.primary_category && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {r.primary_category}
                          </Badge>
                        )}
                        {r.secondary_categories.slice(0, 2).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-1">
                        {r.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                            {r.rating} ({r.review_count})
                          </span>
                        )}
                        {r.website && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Globe className="h-2.5 w-2.5" />
                            Site web
                          </span>
                        )}
                        {r.phone && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
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
            <div className="px-4 py-2 bg-muted/30 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Résultats Google Maps · Sélectionnez pour remplir automatiquement
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
