import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Play, Send, Check, Radar, Mail, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useLiveProspects, useLiveAgentRuns, useLiveOutreachDrafts,
  useGoLive, useApproveDraft, useSendDraft, useEnrichProspect,
} from "@/hooks/useLiveAgents";

const TRADES = ["couvreur", "plombier", "électricien", "isolation", "HVAC", "rénovation"];
const CITIES = ["Laval", "Montréal", "Longueuil", "Québec", "Gatineau", "Sherbrooke", "Terrebonne", "Brossard"];

export default function PageAdminLiveAgents() {
  const [city, setCity] = useState("Laval");
  const [trade, setTrade] = useState("couvreur");
  const prospects = useLiveProspects();
  const runs = useLiveAgentRuns();
  const drafts = useLiveOutreachDrafts();
  const goLive = useGoLive();
  const approve = useApproveDraft();
  const send = useSendDraft();
  const enrich = useEnrichProspect();

  const handleGoLive = async () => {
    try {
      const res = await goLive.mutateAsync({ city, trade, discover_limit: 15, enrich_limit: 10, draft_limit: 5 });
      toast({ title: "Pipeline LIVE terminé", description: `${res.summary?.discovered_count} découverts · ${res.summary?.enriched_count} enrichis · ${res.summary?.drafts_count} brouillons.` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const stats = {
    total: prospects.data?.length || 0,
    qualified: prospects.data?.filter(p => p.qualification_status === "qualified").length || 0,
    drafts: drafts.data?.filter(d => d.draft_status === "pending_approval").length || 0,
    sent: drafts.data?.filter(d => d.draft_status === "sent").length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Radar className="h-5 w-5 text-primary" /> Live Agents — Acquisition Entrepreneurs</h1>
          <p className="text-xs text-muted-foreground">Pipeline temps réel : Firecrawl + Gemini + AIPP scoring + brouillons d'approche.</p>
        </div>

        {/* GO LIVE */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Lancer un pipeline LIVE</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Ville</label>
              <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={city} onChange={e => setCity(e.target.value)}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Métier</label>
              <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={trade} onChange={e => setTrade(e.target.value)}>
                {TRADES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Button onClick={handleGoLive} disabled={goLive.isPending} className="gap-2">
              {goLive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              GO LIVE
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Prospects", value: stats.total, icon: Radar },
            { label: "Qualifiés", value: stats.qualified, icon: BarChart3 },
            { label: "Brouillons en attente", value: stats.drafts, icon: Mail },
            { label: "Envoyés", value: stats.sent, icon: Send },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><s.icon className="h-3 w-3" />{s.label}</div>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="prospects">
          <TabsList>
            <TabsTrigger value="prospects">Prospects ({stats.total})</TabsTrigger>
            <TabsTrigger value="drafts">Brouillons ({drafts.data?.length || 0})</TabsTrigger>
            <TabsTrigger value="runs">Exécutions</TabsTrigger>
          </TabsList>

          <TabsContent value="prospects" className="space-y-2">
            {prospects.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {prospects.data?.map(p => (
              <Card key={p.id}><CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{p.business_name}</span>
                      <Badge variant="outline" className="text-[10px]">{p.city}</Badge>
                      <Badge variant="outline" className="text-[10px]">{p.trade}</Badge>
                      <Badge className="text-[10px]">{p.qualification_status}</Badge>
                      {p.aipp_score != null && <Badge variant="secondary" className="text-[10px]">AIPP {Math.round(Number(p.aipp_score))}</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 truncate">
                      {p.website_url} · {p.email || "—"} · {p.phone || "—"}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled={enrich.isPending} onClick={() => enrich.mutate(p.id)}>Enrich</Button>
                </div>
              </CardContent></Card>
            ))}
            {!prospects.isLoading && !prospects.data?.length && <p className="text-sm text-muted-foreground">Aucun prospect. Lance GO LIVE.</p>}
          </TabsContent>

          <TabsContent value="drafts" className="space-y-2">
            {drafts.data?.map(d => {
              const p: any = d.contractor_prospects;
              return (
                <Card key={d.id}><CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{p?.business_name}</span>
                    <Badge variant="outline" className="text-[10px]">{p?.city}</Badge>
                    <Badge className="text-[10px]">{d.draft_status}</Badge>
                    {d.approved_by_admin && <Badge variant="secondary" className="text-[10px]">approuvé</Badge>}
                  </div>
                  <div className="text-xs"><strong>Objet :</strong> {d.subject}</div>
                  <div className="text-xs text-muted-foreground border rounded p-2 max-h-40 overflow-auto" dangerouslySetInnerHTML={{ __html: d.body || "" }} />
                  <div className="text-[11px] text-muted-foreground">À : {p?.email || "(pas d'email)"}</div>
                  <div className="flex gap-2">
                    {!d.approved_by_admin && d.draft_status !== "sent" && (
                      <Button size="sm" variant="outline" onClick={() => approve.mutate(d.id)} disabled={approve.isPending} className="gap-1">
                        <Check className="h-3 w-3" /> Approuver
                      </Button>
                    )}
                    {d.approved_by_admin && d.draft_status !== "sent" && (
                      <Button size="sm" onClick={() => send.mutate(d.id)} disabled={send.isPending || !p?.email} className="gap-1">
                        <Send className="h-3 w-3" /> Envoyer
                      </Button>
                    )}
                    {d.draft_status === "sent" && <span className="text-xs text-green-600">Envoyé · {d.sent_at?.slice(0, 16)}</span>}
                    {d.error_message && <span className="text-xs text-destructive">{d.error_message}</span>}
                  </div>
                </CardContent></Card>
              );
            })}
            {!drafts.data?.length && <p className="text-sm text-muted-foreground">Aucun brouillon.</p>}
          </TabsContent>

          <TabsContent value="runs" className="space-y-1">
            {runs.data?.map(r => (
              <Card key={r.id}><CardContent className="p-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={r.run_status === "completed" ? "secondary" : r.run_status === "failed" ? "destructive" : "outline"} className="text-[10px]">{r.run_status}</Badge>
                  <span className="font-mono">{r.agent_name}</span>
                  <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString("fr-CA")}</span>
                </div>
                <span className="text-muted-foreground truncate max-w-[40%]">
                  {r.error_message || JSON.stringify(r.output).slice(0, 100)}
                </span>
              </CardContent></Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
