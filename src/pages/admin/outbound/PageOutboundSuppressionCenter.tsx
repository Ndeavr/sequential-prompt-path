import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldOff, Search, AlertTriangle, Ban, XCircle } from "lucide-react";

const typeColors: Record<string, string> = {
  hard_bounce: "bg-red-500/20 text-red-400",
  soft_bounce: "bg-orange-500/20 text-orange-400",
  unsubscribed: "bg-amber-500/20 text-amber-400",
  manual: "bg-muted text-muted-foreground",
  invalid: "bg-red-600/20 text-red-400",
  blocked: "bg-red-700/20 text-red-300",
  role_mismatch: "bg-violet-500/20 text-violet-400",
  duplicate: "bg-muted text-muted-foreground",
};

export default function PageOutboundSuppressionCenter() {
  const navigate = useNavigate();
  const [suppressions, setSuppressions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("outbound_suppressions").select("*").order("created_at", { ascending: false }).limit(200);
    setSuppressions(data || []);
    setLoading(false);
  }

  const filtered = suppressions.filter(s =>
    !search || s.email?.toLowerCase().includes(search.toLowerCase()) || s.domain?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = filtered.filter(s => s.active).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/outbound")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">Centre de Suppression</h1>
          <p className="text-sm text-muted-foreground">{activeCount} suppressions actives</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par email ou domaine…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Chargement…</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="py-12 text-center">
            <ShieldOff className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aucune suppression</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <Card key={s.id} className="border-border/40">
              <CardContent className="p-4 flex items-center gap-4">
                <Ban className="h-4 w-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.email || s.domain}</p>
                  <p className="text-xs text-muted-foreground">{s.suppression_reason} · {s.source}</p>
                </div>
                <Badge className={`text-xs ${typeColors[s.suppression_type] || "bg-muted text-muted-foreground"}`}>
                  {s.suppression_type}
                </Badge>
                <Badge variant="outline" className={`text-xs ${s.active ? "border-red-500/50 text-red-400" : "border-border"}`}>
                  {s.active ? "Actif" : "Inactif"}
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(s.created_at).toLocaleDateString("fr-CA")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
