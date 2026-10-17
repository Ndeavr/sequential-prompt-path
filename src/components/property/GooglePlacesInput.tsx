/**
 * UNPRO — Address Autocomplete Input
 * Uses our `google-places-autocomplete` Edge Function as a proxy.
 * The Google API key never leaves the server, avoiding RefererNotAllowed errors
 * and removing the need to load the Google Maps JS SDK on the client.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";
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
  const { predictions, isLoading, error, search, fetchDetails, reset } = useAddressAutocomplete();
  const [isOpen, setIsOpen] = useState(false);

  const [activeIndex, setActiveIndex] = useState(-1);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setIsOpen(predictions.length > 0); setActiveIndex(-1); }, [predictions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    search(v);
  };

  const handleSelect = async (pred: Prediction) => {
    onChange(pred.description);
    setIsOpen(false);
    const result = await fetchDetails(pred.place_id);
    reset();
    // A failed details request never becomes a confirmed/located address.
    if (result) onPlaceSelect?.({ address: result.fullAddress, city: result.city,
      lat: result.latitude ?? undefined, lng: result.longitude ?? undefined, postalCode: result.postalCode });
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
      {error && <p role="status" className="mt-2 text-sm text-muted-foreground">Les suggestions sont indisponibles. Votre adresse reste à confirmer.</p>}
      {!error && !isLoading && value.trim().length >= 4 && predictions.length === 0 && <p role="status" className="mt-2 text-sm text-muted-foreground">Aucune adresse proposée pour le moment.</p>}
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
