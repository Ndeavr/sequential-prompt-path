import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { useTranscriptCorrections, useSaveTranscriptCorrection } from "@/hooks/useAlexVoiceEngine";
import { useToast } from "@/hooks/use-toast";

export default function TableTranscriptCorrections() {
  const { data: corrections = [], isLoading } = useTranscriptCorrections();
  const saveMut = useSaveTranscriptCorrection();
  const { toast } = useToast();
  const [newRaw, setNewRaw] = useState("");
  const [newNorm, setNewNorm] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = corrections.filter((c: any) =>
    !filter || c.raw_pattern.toLowerCase().includes(filter.toLowerCase()) || c.normalized_value.toLowerCase().includes(filter.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newRaw.trim() || !newNorm.trim()) return;
    try {
      await saveMut.mutateAsync({ raw_pattern: newRaw.trim(), normalized_value: newNorm.trim() });
      toast({ title: "Correction ajoutée" });
      setNewRaw("");
      setNewNorm("");
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const catColor: Record<string, string> = {
    construction: "bg-amber-500/20 text-amber-400",
    brand: "bg-pink-500/20 text-pink-400",
    city: "bg-blue-500/20 text-blue-400",
    general: "bg-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">📝 Dictionnaire de corrections STT</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Filtrer..." value={filter} onChange={(e) => setFilter(e.target.value)} className="text-sm" />

        <div className="flex gap-2">
          <Input placeholder="Motif brut" value={newRaw} onChange={(e) => setNewRaw(e.target.value)} className="text-sm flex-1" />
          <span className="self-center text-muted-foreground">→</span>
          <Input placeholder="Valeur normalisée" value={newNorm} onChange={(e) => setNewNorm(e.target.value)} className="text-sm flex-1" />
          <Button size="sm" onClick={handleAdd} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 animate-pulse bg-muted rounded" />)}</div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filtered.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-sm">
                <Badge className={`text-xs shrink-0 ${catColor[c.category] ?? catColor.general}`}>{c.category}</Badge>
                <code className="text-xs bg-muted px-1 rounded">{c.raw_pattern}</code>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{c.normalized_value}</span>
                {c.is_regex && <Badge variant="outline" className="text-xs ml-auto">regex</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
