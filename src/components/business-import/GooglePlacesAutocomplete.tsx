import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  rating: number;
  review_count: number;
  types: string[];
}

interface Props {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function GooglePlacesAutocomplete({ onSelect, placeholder = "Rechercher votre entreprise...", className }: Props) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-places-autocomplete", {
        body: { input, types: "establishment", region: "ca", language: "fr" },
      });
      if (!error && data?.predictions) {
        setPredictions(data.predictions);
        setIsOpen(data.predictions.length > 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const handleSelect = async (p: Prediction) => {
    setQuery(p.structured_formatting.main_text);
    setIsOpen(false);
    setPredictions([]);
    setDetailLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-places-autocomplete", {
        body: { place_id: p.place_id },
      });
      if (!error && data?.result) {
        onSelect(data.result);
      } else {
        onSelect({
          place_id: p.place_id,
          name: p.structured_formatting.main_text,
          address: p.structured_formatting.secondary_text || "",
          city: "",
          phone: "",
          website: "",
          rating: 0,
          review_count: 0,
          types: [],
        });
      }
    } catch {
      onSelect({
        place_id: p.place_id,
        name: p.structured_formatting.main_text,
        address: p.structured_formatting.secondary_text || "",
        city: "",
        phone: "",
        website: "",
        rating: 0,
        review_count: 0,
        types: [],
      });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          className={`h-12 pl-10 ${className || ""}`}
          autoComplete="off"
        />
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {(loading || detailLoading) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              className="w-full px-3 py-2.5 text-left hover:bg-accent/50 transition-colors flex items-start gap-2.5 border-b border-border/50 last:border-0"
              onClick={() => handleSelect(p)}
            >
              <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.structured_formatting.main_text}</p>
                <p className="text-xs text-muted-foreground truncate">{p.structured_formatting.secondary_text}</p>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground text-right">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
