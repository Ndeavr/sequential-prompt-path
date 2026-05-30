import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Inbox, Flame, HelpCircle, Ban, Moon, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Reply = {
  id: string;
  from_email: string | null;
  to_email: string | null;
  reply_subject: string | null;
  reply_body: string | null;
  reply_intent: string | null;
  reply_sentiment: string | null;
  classification_confidence: number | null;
  suggested_crm_status: string | null;
  auto_action_taken: string | null;
  handled: boolean;
  handled_at: string | null;
  received_at: string | null;
  created_at: string;
  lead_id: string | null;
  company_id: string | null;
};

const INTENT_META: Record<string, { label: string; color: string; icon: any }> = {
  interested: { label: "Intéressé", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: Flame },
  question: { label: "Question", color: "bg-blue-500/15 text-blue-300 border-blue-500/30", icon: HelpCircle },
  not_interested: { label: "Pas intéressé", color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30", icon: Ban },
  unsubscribe: { label: "Désabonnement", color: "bg-red-500/15 text-red-300 border-red-500/30", icon: Ban },
  out_of_office: { label: "Absence", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: Moon },
  bounce: { label: "Rebond", color: "bg-red-600/15 text-red-400 border-red-600/30", icon: AlertCircle },
  other: { label: "Autre", color: "bg-muted text-muted-foreground border-border", icon: Inbox },
};

export default function PageOutboundReplies() {
  const navigate = useNavigate();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "hot" | "pending">("hot");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("outbound_replies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error("Chargement échoué");
    setReplies((data || []) as Reply[]);
    setLoading(false);
  }

  async function markHandled(id: string) {
    const { error } = await supabase
      .from("outbound_replies")
      .update({ handled: true, handled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("Erreur");
    toast.success("Marqué traité");
    setReplies(prev => prev.map(r => r.id === id ? { ...r, handled: true, handled_at: new Date().toISOString() } : r));
  }

  const filtered = replies.filter(r => {
    if (tab === "hot" && !["interested", "question"].includes(r.reply_intent || "")) return false;
    if (tab === "pending" && r.handled) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.from_email?.toLowerCase().includes(q) || r.reply_subject?.toLowerCase().includes(q) || r.reply_body?.toLowerCase().includes(q));
  });

  const counts = {
    all: replies.length,
    hot: replies.filter(r => ["interested", "question"].includes(r.reply_intent || "")).length,
    pending: replies.filter(r => !r.handled).length,
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/outbound/ops")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold tracking-tight">Réponses entrantes</h1>
            <p className="text-sm text-muted-foreground">{counts.pending} à traiter · {counts.hot} chaudes</p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>Actualiser</Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="hot">Chaudes ({counts.hot})</TabsTrigger>
            <TabsTrigger value="pending">À traiter ({counts.pending})</TabsTrigger>
            <TabsTrigger value="all">Toutes ({counts.all})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par email, sujet ou contenu…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Chargement…</div>
        ) : filtered.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="py-12 text-center">
              <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">Aucune réponse {tab === "hot" ? "chaude" : tab === "pending" ? "en attente" : ""}</p>
              <p className="text-xs text-muted-foreground mt-2">Les replies arrivent via reply.unpro.ca</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const meta = INTENT_META[r.reply_intent || "other"] || INTENT_META.other;
              const Icon = meta.icon;
              const isOpen = expanded === r.id;
              return (
                <Card key={r.id} className={`border-border/40 transition ${r.handled ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Icon className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{r.from_email || "Inconnu"}</span>
                          <Badge className={`text-xs border ${meta.color}`}>{meta.label}</Badge>
                          {r.classification_confidence != null && (
                            <span className="text-xs text-muted-foreground">{Math.round(r.classification_confidence * 100)}%</span>
                          )}
                          {r.auto_action_taken && (
                            <Badge variant="outline" className="text-xs border-border">{r.auto_action_taken}</Badge>
                          )}
                          {r.handled && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-sm mt-1 truncate font-medium">{r.reply_subject || "(sans objet)"}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.reply_body || ""}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => setExpanded(isOpen ? null : r.id)}>
                        {isOpen ? "Réduire" : "Voir tout"}
                      </Button>
                      {r.lead_id && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/outbound/leads/${r.lead_id}`)}>
                          Voir lead
                        </Button>
                      )}
                      {!r.handled && (
                        <Button variant="outline" size="sm" onClick={() => markHandled(r.id)}>
                          Marquer traité
                        </Button>
                      )}
                    </div>

                    {isOpen && (
                      <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-sm whitespace-pre-wrap">
                        {r.reply_body}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
