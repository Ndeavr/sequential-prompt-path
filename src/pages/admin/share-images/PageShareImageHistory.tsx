import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Image, Clock, Download, Filter } from "lucide-react";
import { listGenerations, INTENTS } from "@/services/shareImageService";
import type { ShareImageGeneration } from "@/services/shareImageService";

export default function PageShareImageHistory() {
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<ShareImageGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIntent, setFilterIntent] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await listGenerations(100);
      setGenerations(data);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterIntent === "all"
    ? generations
    : generations.filter((g) => g.intent === filterIntent);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/share-images")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-display">Historique des générations</h1>
            <p className="text-sm text-muted-foreground">{generations.length} image(s)</p>
          </div>
        </div>
        <Select value={filterIntent} onValueChange={setFilterIntent}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-3 w-3 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {INTENTS.map((i) => (
              <SelectItem key={i.value} value={i.value}>{i.icon} {i.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucune image générée.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => {
            const meta = g.metadata_json as any;
            return (
              <Card key={g.id} className="overflow-hidden">
                {g.generated_image_url ? (
                  <img
                    src={g.generated_image_url}
                    alt={g.intent || "OG Image"}
                    className="w-full aspect-[1200/630] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[1200/630] bg-muted flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">{g.intent}</Badge>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {g.generation_time_ms}ms
                    </div>
                  </div>
                  {meta?.title && (
                    <p className="text-xs font-medium line-clamp-1">{meta.title}</p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{g.width}×{g.height}</span>
                    <span>{g.city}{g.service ? ` / ${g.service}` : ""}</span>
                  </div>
                  {g.generated_image_url && (
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                      <a href={g.generated_image_url} download target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3 mr-1" /> Télécharger
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
