import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Search, Loader2 } from "lucide-react";
import FormGoogleBusinessLookup, { type GmbSearchResult, type GmbCandidate } from "./FormGoogleBusinessLookup";
import ListGoogleBusinessCandidates from "./ListGoogleBusinessCandidates";
import ModalManualFallbackImport from "./ModalManualFallbackImport";

interface Props {
  onImport?: (candidate: GmbCandidate) => void;
  onManualImport?: (data: { business_name: string; city: string; phone: string; website: string }) => void;
}

export default function PanelGoogleBusinessSearchTester({ onImport, onManualImport }: Props) {
  const [result, setResult] = useState<GmbSearchResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const selectedCandidate = result?.candidates.find(c => c.place_id === selectedId) || null;

  const handleSelect = (c: GmbCandidate) => {
    setSelectedId(c.place_id === selectedId ? null : c.place_id);
  };

  const handleImport = () => {
    if (selectedCandidate && onImport) {
      onImport(selectedCandidate);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" />
            Recherche Google Business
          </CardTitle>
          {result && (
            <Badge variant="outline" className="text-xs">
              {result.latency_ms}ms
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormGoogleBusinessLookup
          onResults={(r) => { setResult(r); setSelectedId(null); setError(""); }}
          onError={setError}
          onLoading={setLoading}
        />

        {/* Status indicators */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recherche en cours avec stratégies multiples...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {result && !loading && result.candidates.length === 0 && (
          <div className="text-center py-6 space-y-3">
            <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-foreground">Aucun résultat trouvé</p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.strategies_tried.length} stratégies essayées sans succès
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowManual(true)}>
              Import manuel
            </Button>
          </div>
        )}

        {/* Results list */}
        {result && result.candidates.length > 0 && (
          <>
            <ListGoogleBusinessCandidates
              candidates={result.candidates}
              selectedId={selectedId}
              onSelect={handleSelect}
              strategiesTried={result.strategies_tried}
              latencyMs={result.latency_ms}
            />

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleImport}
                disabled={!selectedCandidate}
                className="flex-1 h-11 font-bold"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {selectedCandidate ? `Importer « ${selectedCandidate.name} »` : "Sélectionnez une entreprise"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowManual(true)}>
                Manuel
              </Button>
            </div>
          </>
        )}

        <ModalManualFallbackImport
          open={showManual}
          onClose={() => setShowManual(false)}
          onSubmit={(data) => {
            setShowManual(false);
            onManualImport?.(data);
          }}
        />
      </CardContent>
    </Card>
  );
}
