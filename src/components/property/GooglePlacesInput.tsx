/**
 * UNPRO — Address Autocomplete Input
 * Uses our `google-places-autocomplete` Edge Function as a proxy.
 * The Google API key never leaves the server, avoiding RefererNotAllowed errors
 * and removing the need to load the Google Maps JS SDK on the client.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PlaceSelection {
  address: string;
  lat?: number;
  lng?: number;
  city?: string;
  postalCode?: string;
}

interface GooglePlacesInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceSelection) => void;
  placeholder?: string;
  className?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
}

export default function GooglePlacesInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Entrez votre adresse…",
  className = "",
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced query
  const queryPredictions = useCallback(async (input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const reqId = ++reqIdRef.current;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-places-autocomplete", {
          body: { input, types: "address", region: "ca", language: "fr" },
        });
        if (reqId !== reqIdRef.current) return; // stale
        if (error) {
          setPredictions([]);
          setIsOpen(false);
          return;
        }
        const preds: Prediction[] = data?.predictions || [];
        setPredictions(preds);
        setIsOpen(preds.length > 0);
        setActiveIndex(-1);
      } finally {
        if (reqId === reqIdRef.current) setIsLoading(false);
      }
    }, 250);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    queryPredictions(v);
  };

  const handleSelect = async (pred: Prediction) => {
    onChange(pred.description);
    setIsOpen(false);
    setPredictions([]);
    try {
      const { data } = await supabase.functions.invoke("google-places-autocomplete", {
        body: { place_id: pred.place_id },
      });
      const r = data?.result;
      if (r) {
        onPlaceSelect?.({
          address: r.address || pred.description,
          city: r.city || "",
          // lat/lng/postal_code not currently returned by the edge function;
          // can be added there later without changing this component's contract
        });
      } else {
        onPlaceSelect?.({ address: pred.description });
      }
    } catch {
      onPlaceSelect?.({ address: pred.description });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % predictions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? predictions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => predictions.length > 0 && setIsOpen(true)}
        className="h-13 rounded-2xl bg-card border-border/40 text-base pl-10 pr-10 shadow-sm w-full"
        autoComplete="off"
      />
      {isLoading && (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
      )}
      {isOpen && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-border/40 bg-popover shadow-lg overflow-hidden">
          <ul role="listbox" className="max-h-72 overflow-y-auto">
            {predictions.map((p, idx) => (
              <li
                key={p.place_id}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  "px-4 py-3 cursor-pointer flex items-start gap-3 text-sm transition-colors",
                  idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                )}
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {p.structured_formatting?.main_text || p.description}
                  </div>
                  {p.structured_formatting?.secondary_text && (
                    <div className="text-xs text-muted-foreground truncate">
                      {p.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
