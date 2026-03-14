/**
 * UNPRO — Google Places Autocomplete Input
 * Uses the Google Places Autocomplete API for address suggestions.
 * Falls back to a regular input if the API key is unavailable.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (input: HTMLInputElement, opts?: any) => any;
        };
      };
    };
  }
}

interface GooglePlacesInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: { address: string; lat?: number; lng?: number; city?: string; postalCode?: string }) => void;
  placeholder?: string;
  className?: string;
}

const GOOGLE_MAPS_SCRIPT_ID = "unpro-google-maps";

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
      // Script already loading, wait for it
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error("timeout")); }, 8000);
      return;
    }
    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr&region=CA`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
}

export default function GooglePlacesInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Entrez votre adresse…",
  className = "",
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load Google Maps
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      setLoadError(true);
      return;
    }
    loadGoogleMapsScript(apiKey)
      .then(() => setIsLoaded(true))
      .catch(() => setLoadError(true));
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ca" },
      types: ["address"],
      fields: ["formatted_address", "geometry", "address_components"],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place?.formatted_address) return;

      const address = place.formatted_address;
      onChange(address);

      // Extract city and postal code
      let city = "";
      let postalCode = "";
      place.address_components?.forEach((comp) => {
        if (comp.types.includes("locality")) city = comp.long_name;
        if (comp.types.includes("postal_code")) postalCode = comp.long_name;
      });

      onPlaceSelect?.({
        address,
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
        city,
        postalCode,
      });
    });

    autocompleteRef.current = ac;
  }, [isLoaded, onChange, onPlaceSelect]);

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={isLoaded ? undefined : value}
        onChange={isLoaded ? undefined : (e) => onChange(e.target.value)}
        defaultValue={isLoaded ? value : undefined}
        className="h-13 rounded-2xl bg-card border-border/40 text-base pl-10 pr-5 shadow-sm w-full"
        autoComplete="off"
      />
    </div>
  );
}
