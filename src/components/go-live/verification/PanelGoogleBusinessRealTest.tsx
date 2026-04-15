import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, AlertTriangle, MapPin } from "lucide-react";

interface SearchResult {
  name?: string;
  formatted_address?: string;
  place_id?: string;
  rating?: number;
  types?: string[];
}

export default function PanelGoogleBusinessRealTest() {
  const [businessName, setBusinessName] = useState("Isolation Solution Royal");
  const [city, setCity] = useState("Montréal");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const runSearch = async () => {
    setSearching(true);
    setError(null);
    setResults([]);
    setSelected(null);
    const start = Date.now();
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("search-google-business", {
        body: { business_name: businessName, city, strategies: ["name_city", "website", "phone"] },
      });
      setLatency(Date.now() - start);
      if (fnErr) { setError(fnErr.message); return; }
      setResults(data?.results || []);
      setStrategy(data?.winning_strategy || data?.strategy || "name_city");
    } catch (err: any) {
      setError(err?.message || "Unreachable");
      setLatency(Date.now() - start);
    } finally {
      setSearching(false);
    }
  };

  const status = error ? "failed" : results.length > 0 ? "passed" : searching ? "running" : "not_tested";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Test GMB Réel
          {status === "passed" && <Badge className="text-[10px]">✓ Passed</Badge>}
          {status === "failed" && <Badge variant="destructive" className="text-[10px]">✗ Failed</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Nom entreprise" className="text-xs h-8" />
          <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Ville" className="text-xs h-8 w-28" />
          <Button size="sm" onClick={runSearch} disabled={searching} className="h-8 gap-1">
            <Search className="h-3 w-3" />
            {searching ? "…" : "Tester"}
          </Button>
        </div>

        {latency != null && (
          <p className="text-[10px] text-muted-foreground">
            Latence: {latency}ms • Stratégie: {strategy} • {results.length} résultat(s)
          </p>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-destructive text-xs">
            <XCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        {results.length === 0 && !searching && !error && latency != null && (
          <div className="flex items-center gap-1.5 text-amber-500 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            Aucun résultat — le fallback manuel doit être utilisable
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={r.place_id || i}
                onClick={() => setSelected(r.place_id || String(i))}
                className={`w-full text-left rounded-lg border p-2 text-xs transition-colors ${
                  selected === (r.place_id || String(i)) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.name}</span>
                  {selected === (r.place_id || String(i)) && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.formatted_address}</p>
                {r.rating && <p className="text-[10px] text-muted-foreground">⭐ {r.rating}</p>}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="text-xs text-emerald-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Sélection active — bouton Importer fonctionnel
          </div>
        )}
      </CardContent>
    </Card>
  );
}
