import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Phone, Globe, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface GmbSearchParams {
  business_name: string;
  city: string;
  phone: string;
  website: string;
  category: string;
}

export interface GmbCandidate {
  place_id: string;
  name: string;
  formatted_address: string;
  phone: string;
  website: string;
  rating: number;
  review_count: number;
  primary_category: string;
  all_categories: string[];
  photos: string[];
  opening_hours: string[] | null;
  confidence_score: number;
  strategy_used: string;
}

export interface GmbSearchResult {
  candidates: GmbCandidate[];
  total_found: number;
  strategies_tried: string[];
  latency_ms: number;
}

interface Props {
  onResults: (result: GmbSearchResult) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
  compact?: boolean;
}

export default function FormGoogleBusinessLookup({ onResults, onError, onLoading, compact }: Props) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!name.trim() && !phone.trim() && !website.trim()) return;

    setLoading(true);
    onLoading(true);
    onError("");

    try {
      const { data, error } = await supabase.functions.invoke("search-google-business", {
        body: {
          business_name: name.trim(),
          city: city.trim(),
          phone: phone.trim(),
          website: website.trim(),
          category: category.trim(),
        },
      });

      if (error) throw new Error(error.message || "Erreur de recherche");
      if (data?.error) throw new Error(data.error);

      onResults(data as GmbSearchResult);
    } catch (err: any) {
      onError(err.message || "Impossible de rechercher. Réessayez.");
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }, [name, city, phone, website, category, onResults, onError, onLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Nom d'entreprise..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-11 pl-9"
          />
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <div className={compact ? "w-28" : "w-36"}>
          <div className="relative">
            <Input
              placeholder="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-11 pl-8"
            />
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Input
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10 pl-8 text-sm"
              type="tel"
            />
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="relative">
            <Input
              placeholder="Site web"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10 pl-8 text-sm"
            />
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={handleSearch} disabled={loading || (!name.trim() && !phone.trim() && !website.trim())} className="flex-1 h-11 font-bold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          {loading ? "Recherche..." : "Rechercher sur Google Maps"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground shrink-0"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "Moins" : "+ Options"}
        </Button>
      </div>
    </div>
  );
}
