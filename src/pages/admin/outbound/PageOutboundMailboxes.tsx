import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mail, Shield, Zap, AlertTriangle, CheckCircle, Thermometer } from "lucide-react";

const healthColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
};

const statusBadge = (s: string) => {
  if (s === "active") return "bg-emerald-500/20 text-emerald-400";
  if (s === "warming") return "bg-amber-500/20 text-amber-400";
  if (s === "paused") return "bg-muted text-muted-foreground";
  return "bg-red-500/20 text-red-400";
};

export default function PageOutboundMailboxes() {
  const navigate = useNavigate();
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [warmups, setWarmups] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: mbs } = await supabase.from("outbound_mailboxes").select("*").order("created_at");
    setMailboxes(mbs || []);
    if (mbs?.length) {
      const ids = mbs.map(m => m.id);
      const { data: wu } = await supabase.from("outbound_mailbox_warmup").select("*").in("mailbox_id", ids).order("warmup_date", { ascending: false });
      const grouped: Record<string, any> = {};
      (wu || []).forEach(w => {
        if (!grouped[w.mailbox_id]) grouped[w.mailbox_id] = w;
      });
      setWarmups(grouped);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/outbound")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">Mailboxes</h1>
          <p className="text-sm text-muted-foreground">Gestion des boîtes d'envoi go.unpro.ca</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Chargement…</div>
      ) : mailboxes.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="py-12 text-center">
            <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aucune mailbox configurée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mailboxes.map(mb => {
            const wu = warmups[mb.id];
            return (
              <Card key={mb.id} className="border-border/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{mb.sender_name}</CardTitle>
                    <Badge className={`text-xs ${statusBadge(mb.mailbox_status)}`}>{mb.mailbox_status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{mb.sender_email}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Health Score */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Santé</span>
                      <span className={`text-sm font-bold ${healthColor(mb.health_score)}`}>{mb.health_score ?? "—"}%</span>
                    </div>
                    <Progress value={mb.health_score || 0} className="h-1.5" />
                  </div>

                  {/* Quota */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Limite/jour</span>
                    <span className="font-medium">{mb.daily_limit}</span>
                  </div>

                  {/* Warmup */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3" /> Warmup</span>
                    <Badge variant="outline" className="text-xs">
                      {mb.warmup_enabled ? "Activé" : "Désactivé"}
                    </Badge>
                  </div>

                  {wu && (
                    <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                      <p className="text-muted-foreground">Dernier warmup: {new Date(wu.warmup_date).toLocaleDateString("fr-CA")}</p>
                      <div className="flex gap-3">
                        <span>Envoyés: {wu.emails_sent}</span>
                        <span>Réponses: {wu.replies_received}</span>
                        <span>Rebonds: {wu.bounces}</span>
                      </div>
                      <p>Réputation: <span className="font-medium">{wu.reputation_score}%</span></p>
                    </div>
                  )}

                  {/* Tracking domain */}
                  <div className="text-xs text-muted-foreground">
                    Tracking: {mb.tracking_domain || "mail.go.unpro.ca"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
