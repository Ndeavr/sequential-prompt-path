/**
 * UNPRO — Scout (source de découverte Facebook) — /admin/scout
 * Vue de source à l'intérieur de l'espace acquisition existant.
 * Aucune donnée simulée : les états vides le disent explicitement.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, RefreshCw, Radar } from "lucide-react";

type Capture = {
  id: string;
  session_id: string | null;
  group_name: string | null;
  author_name: string | null;
  company_name: string | null;
  phone_e164: string | null;
  email: string | null;
  city: string | null;
  category: string | null;
  extraction_mode: string;
  intent_score: number;
  intent_evidence: string | null;
  dedupe_status: string;
  dedupe_signal: string | null;
  prospect_id: string | null;
  raw_text: string | null;
  post_url: string | null;
  source_url: string | null;
  captured_at: string;
  error: string | null;
};

export default function PageAdminScout() {
  const [group, setGroup] = useState("");
  const [city, setCity] = useState("");
  const [onlyHighIntent, setOnlyHighIntent] = useState(false);
  const [status, setStatus] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sessions = useQuery({
    queryKey: ["scout-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 20000,
  });

  const captures = useQuery({
    queryKey: ["scout-captures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_captures")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Capture[];
    },
    refetchInterval: 20000,
  });

  const performance = useQuery({
    queryKey: ["scout-source-performance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_scout_source_performance").select("*");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  const rows = useMemo(() => {
    let list = captures.data ?? [];
    if (group) list = list.filter((c) => (c.group_name ?? "").toLowerCase().includes(group.toLowerCase()));
    if (city) list = list.filter((c) => (c.city ?? "").toLowerCase().includes(city.toLowerCase()));
    if (onlyHighIntent) list = list.filter((c) => c.intent_score >= 40);
    if (status !== "all") list = list.filter((c) => c.dedupe_status === status);
    return list;
  }, [captures.data, group, city, onlyHighIntent, status]);

  const kpis = useMemo(() => {
    const list = captures.data ?? [];
    return {
      total: list.length,
      neuf: list.filter((c) => c.dedupe_status === "new").length,
      doublons: list.filter((c) => c.dedupe_status === "duplicate").length,
      image: list.filter((c) => c.extraction_mode === "image").length,
      intent: list.filter((c) => c.intent_score >= 40).length,
      erreurs: list.filter((c) => c.dedupe_status === "error").length,
    };
  }, [captures.data]);

  async function copyToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { toast.error("Aucune session active."); return; }
    await navigator.clipboard.writeText(token);
    toast.success("Jeton copié — collez-le dans l'extension UNPRO Scout.");
  }

  return (
    <div className="admin-theme min-h-screen p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Radar className="h-5 w-5" /> UNPRO Scout — source Facebook
          </h1>
          <p className="text-sm text-muted-foreground">
            Découverte uniquement. La vérification, la conformité CASL et l'envoi restent gérés par le pipeline existant.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyToken}>
            <Copy className="h-4 w-4 mr-2" /> Copier le jeton d'extension
          </Button>
          <Button variant="outline" onClick={() => { captures.refetch(); sessions.refetch(); performance.refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          ["Captures", kpis.total], ["Nouveaux", kpis.neuf], ["Doublons", kpis.doublons],
          ["Cartes (image)", kpis.image], ["Haute intention", kpis.intent], ["Erreurs", kpis.erreurs],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <div className="text-2xl font-semibold">{value as number}</div>
            <div className="text-xs text-muted-foreground">{label as string}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Sessions de capture</h2>
        {sessions.data?.length ? (
          <div className="space-y-2 text-sm">
            {sessions.data.map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.group_name ?? "Groupe non identifié"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.started_at).toLocaleString("fr-CA")} · {s.status}
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <span>{s.captured_count} capt.</span>
                  <span className="text-emerald-400">{s.new_count} nouv.</span>
                  <span className="text-amber-400">{s.duplicate_count} doubl.</span>
                  <span className="text-rose-400">{s.error_count} err.</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune session enregistrée pour l'instant.</p>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Performance par groupe</h2>
        {performance.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  {["Groupe", "Détectés", "Uniques", "Nouveaux", "Doublons", "Haute int.", "Vérifiés", "Contactés", "Clics", "Payants"].map((h) => (
                    <th key={h} className="text-left py-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {performance.data.map((r: any) => (
                  <tr key={r.group_name} className="border-t border-border/40">
                    <td className="py-2 pr-3">{r.group_name}</td>
                    <td className="pr-3">{r.detected}</td><td className="pr-3">{r.unique_prospects}</td>
                    <td className="pr-3">{r.new_prospects}</td><td className="pr-3">{r.duplicates}</td>
                    <td className="pr-3">{r.high_intent}</td><td className="pr-3">{r.verified}</td>
                    <td className="pr-3">{r.contacted}</td><td className="pr-3">{r.clicked}</td>
                    <td className="pr-3">{r.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune donnée mesurée pour l'instant.</p>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Filtrer par groupe" value={group} onChange={(e) => setGroup(e.target.value)} className="max-w-[220px]" />
          <Input placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} className="max-w-[160px]" />
          {["all", "new", "duplicate", "error"].map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
              {s === "all" ? "Tous" : s === "new" ? "Nouveaux" : s === "duplicate" ? "Doublons" : "Erreurs"}
            </Button>
          ))}
          <Button size="sm" variant={onlyHighIntent ? "default" : "outline"} onClick={() => setOnlyHighIntent((v) => !v)}>
            Haute intention
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune capture correspondante.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((c) => (
              <div key={c.id} className="rounded-xl border border-border/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.company_name ?? c.author_name ?? "Entrepreneur à confirmer"}</span>
                  <Badge variant={c.dedupe_status === "new" ? "default" : c.dedupe_status === "duplicate" ? "secondary" : "destructive"}>
                    {c.dedupe_status === "new" ? "Nouveau" : c.dedupe_status === "duplicate" ? `Doublon (${c.dedupe_signal})` : "Erreur"}
                  </Badge>
                  <Badge variant="outline">{c.extraction_mode === "image" ? "Carte image" : c.extraction_mode === "manual" ? "Manuel" : "Texte affiché"}</Badge>
                  {c.intent_score >= 40 && <Badge className="bg-emerald-600">Intention {c.intent_score}</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(c.captured_at).toLocaleString("fr-CA")}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                  {c.phone_e164 && <span>{c.phone_e164}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.city && <span>{c.city}</span>}
                  {c.category && <span>{c.category}</span>}
                  {c.group_name && <span>· {c.group_name}</span>}
                </div>
                {c.intent_evidence && (
                  <div className="text-xs mt-1 text-emerald-400">Preuve : « {c.intent_evidence} »</div>
                )}
                <button
                  className="text-xs underline mt-2 text-muted-foreground"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  {expanded === c.id ? "Masquer la provenance" : "Voir la provenance"}
                </button>
                {expanded === c.id && (
                  <div className="mt-2 text-xs space-y-1">
                    {c.post_url && <div><a className="underline" href={c.post_url} target="_blank" rel="noreferrer">Publication source</a></div>}
                    {c.source_url && <div className="break-all text-muted-foreground">{c.source_url}</div>}
                    {c.prospect_id && <div className="text-muted-foreground">Prospect : {c.prospect_id}</div>}
                    {c.error && <div className="text-rose-400">Erreur : {c.error}</div>}
                    <pre className="whitespace-pre-wrap bg-muted/30 p-2 rounded-lg max-h-48 overflow-auto">{c.raw_text}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
