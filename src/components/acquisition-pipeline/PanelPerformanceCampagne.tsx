import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Eye, MousePointerClick, MessageSquare } from "lucide-react";

interface Campagne {
  id: string;
  nom: string;
  statut: string;
  total_envoyes: number;
  total_ouverts: number;
  total_clics: number;
  total_reponses: number;
}

function StatPill({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
      <Icon className="h-4 w-4" style={{ color }} />
      <div>
        <p className="text-lg font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

const statusColor: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/20 text-emerald-400",
  en_pause: "bg-amber-500/20 text-amber-400",
  terminee: "bg-blue-500/20 text-blue-400",
};

export default function PanelPerformanceCampagne({ campagnes }: { campagnes: Campagne[] }) {
  if (campagnes.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Campagnes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune campagne créée.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {campagnes.map((c) => (
        <Card key={c.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{c.nom}</CardTitle>
              <Badge variant="outline" className={`text-[10px] ${statusColor[c.statut] || ""}`}>
                {c.statut}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatPill icon={Send} label="Envoyés" value={c.total_envoyes} color="#3b82f6" />
              <StatPill icon={Eye} label="Ouverts" value={c.total_ouverts} color="#10b981" />
              <StatPill icon={MousePointerClick} label="Clics" value={c.total_clics} color="#f59e0b" />
              <StatPill icon={MessageSquare} label="Réponses" value={c.total_reponses} color="#8b5cf6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
