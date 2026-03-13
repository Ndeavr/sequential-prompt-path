/**
 * UNPRO — City Selector with plan-based limits, search, badges, suggestions & upsell
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Search, Crown, X, Check, Sparkles,
} from "lucide-react";
import UpgradeWindow from "./UpgradeWindow";

export interface CitySelection {
  primaryCity: string | null;
  secondaryCities: string[];
}

interface CitySelectorProps {
  selection: CitySelection;
  onSelectionChange: (sel: CitySelection) => void;
  maxSecondary: number;
  planName: string;
  planCode: string;
}

interface CityRow {
  id: string;
  name: string;
  slug: string;
  province: string;
  population: number | null;
  latitude: number | null;
  longitude: number | null;
}

function useCities() {
  return useQuery({
    queryKey: ["cities-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name, slug, province, population, latitude, longitude")
        .eq("is_active", true)
        .order("population", { ascending: false });
      if (error) throw error;
      return (data || []) as CityRow[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Haversine distance in km */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CitySelector({
  selection, onSelectionChange, maxSecondary, planName, planCode,
}: CitySelectorProps) {
  const { data: cities = [], isLoading } = useCities();
  const [search, setSearch] = useState("");
  const [showUpsell, setShowUpsell] = useState(false);
  

  const isPrimary = (name: string) => selection.primaryCity === name;
  const isSecondary = (name: string) => selection.secondaryCities.includes(name);
  const isSelected = (name: string) => isPrimary(name) || isSecondary(name);
  const usedCount = selection.secondaryCities.length;
  const remaining = maxSecondary - usedCount;

  // Get primary city coords for suggestions
  const primaryCoords = useMemo(() => {
    if (!selection.primaryCity) return null;
    const c = cities.find((c) => c.name === selection.primaryCity);
    return c?.latitude && c?.longitude ? { lat: c.latitude, lon: c.longitude } : null;
  }, [selection.primaryCity, cities]);

  // Nearby suggestions (within 60km of primary, not already selected)
  const suggestions = useMemo(() => {
    if (!primaryCoords) return [];
    return cities
      .filter((c) => !isSelected(c.name) && c.latitude && c.longitude)
      .map((c) => ({
        ...c,
        distance: haversine(primaryCoords.lat, primaryCoords.lon, c.latitude!, c.longitude!),
      }))
      .filter((c) => c.distance <= 60 && c.distance > 0)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [primaryCoords, cities, selection]);

  const filtered = useMemo(() => {
    if (!search.trim()) return cities.slice(0, 30);
    const q = search.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [search, cities]);

  const handleSelect = (name: string) => {
    if (isPrimary(name)) return; // can't unselect primary via click
    if (isSecondary(name)) {
      onSelectionChange({
        ...selection,
        secondaryCities: selection.secondaryCities.filter((c) => c !== name),
      });
      return;
    }
    // Not selected — add
    if (!selection.primaryCity) {
      onSelectionChange({ ...selection, primaryCity: name });
    } else if (usedCount < maxSecondary) {
      onSelectionChange({
        ...selection,
        secondaryCities: [...selection.secondaryCities, name],
      });
    } else {
      setShowUpsell(true);
    }
  };

  const setPrimary = (name: string) => {
    const newSecondary = selection.secondaryCities.filter((c) => c !== name);
    if (selection.primaryCity && selection.primaryCity !== name) {
      newSecondary.unshift(selection.primaryCity);
    }
    // Trim to max
    onSelectionChange({
      primaryCity: name,
      secondaryCities: newSecondary.slice(0, maxSecondary),
    });
  };

  const removePrimary = () => {
    const [newPrimary, ...rest] = selection.secondaryCities;
    onSelectionChange({
      primaryCity: newPrimary || null,
      secondaryCities: rest,
    });
  };

  const nextPlanLabel: Record<string, string> = {
    recrue: "Pro",
    pro: "Premium",
    premium: "Élite",
    elite: "Signature",
    signature: "Signature",
  };

  const nextPlanCities: Record<string, number> = {
    recrue: 8,
    pro: 15,
    premium: 25,
    elite: 50,
    signature: 50,
  };

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {usedCount + (selection.primaryCity ? 1 : 0)} / {maxSecondary + 1} villes
        </span>
        <Badge variant={remaining > 0 ? "outline" : "destructive"} className="text-[10px]">
          {remaining > 0 ? `${remaining} restante${remaining > 1 ? "s" : ""}` : "Limite atteinte"}
        </Badge>
      </div>

      {/* Selected cities */}
      {selection.primaryCity && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2 border border-primary/30">
            <Crown className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground flex-1">{selection.primaryCity}</span>
            <Badge variant="default" className="text-[10px] shrink-0">Principale</Badge>
            <button onClick={removePrimary} className="text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {selection.secondaryCities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selection.secondaryCities.map((city) => (
                <Badge
                  key={city}
                  variant="secondary"
                  className="text-xs cursor-pointer gap-1 hover:bg-destructive/10"
                  onClick={() => handleSelect(city)}
                >
                  <MapPin className="w-3 h-3" />
                  {city}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une ville…"
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !search && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Villes proches de {selection.primaryCity}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.name)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-left"
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="truncate">{s.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{Math.round(s.distance)} km</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* City grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
        {isLoading ? (
          <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Aucune ville trouvée</p>
        ) : (
          filtered.map((city) => {
            const selected = isSelected(city.name);
            const primary = isPrimary(city.name);
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => handleSelect(city.name)}
                onDoubleClick={() => setPrimary(city.name)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border transition-all text-left ${
                  primary
                    ? "bg-primary/10 border-primary text-primary font-medium"
                    : selected
                    ? "bg-accent/50 border-primary/40 text-foreground"
                    : "bg-card border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {primary ? (
                  <Crown className="w-3 h-3 shrink-0" />
                ) : selected ? (
                  <Check className="w-3 h-3 shrink-0 text-primary" />
                ) : (
                  <MapPin className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate">{city.name}</span>
              </button>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Cliquez pour ajouter · Double-cliquez pour définir comme principale
      </p>

      {/* Upsell */}
      <UpgradeWindow
        open={showUpsell}
        onOpenChange={setShowUpsell}
        trigger="cities_limit"
        currentPlanId={planCode}
        currentLimit={maxSecondary + 1}
      />
    </div>
  );
}
