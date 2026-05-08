import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, Upload, Sparkles, RefreshCw, Send } from "lucide-react";

type Comment = any;
type Lead = any;

const STATUS_TONE: Record<string, string> = {
  extracted: "bg-muted text-muted-foreground",
  needs_review: "bg-warning/20 text-warning",
  promoted: "bg-primary/20 text-primary",
  duplicate: "bg-destructive/15 text-destructive",
  new: "bg-primary/20 text-primary",
  enriched: "bg-success/20 text-success",
  ready_for_outreach: "bg-success/20 text-success",
  contacted: "bg-secondary/20 text-secondary",
};

export default function PageFacebookExtractionEngine() {
  const [campaignName, setCampaignName] = useState("");
  const [city, setCity] = useState("");
  const [trade, setTrade] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [scripts, setScripts] = useState<any | null>(null);

  async function loadAll() {
    const { data: cs } = await supabase.from("facebook_extraction_campaigns").select("*").order("created_at", { ascending: false }).limit(50);
    setCampaigns(cs ?? []);
    if (!activeCampaign && cs?.[0]) setActiveCampaign(cs[0].id);
  }
  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!activeCampaign) { setComments([]); setLeads([]); return; }
    (async () => {
      const { data: cm } = await supabase.from("facebook_extracted_comments").select("*").eq("campaign_id", activeCampaign).order("created_at", { ascending: false }).limit(500);
      setComments(cm ?? []);
      const ids = (cm ?? []).map((c: any) => c.id);
      if (ids.length) {
        const { data: ld } = await supabase.from("fb_contractor_leads").select("*").in("source_comment_id", ids).order("created_at", { ascending: false });
        setLeads(ld ?? []);
      } else setLeads([]);
    })();
  }, [activeCampaign, busy]);

  async function uploadScreenshot(file: File): Promise<string | null> {
    const path = `${crypto.randomUUID()}-${file.name}`.replace(/\s+/g, "_");
    const { error } = await supabase.storage.from("facebook-extractions").upload(path, file, { upsert: false });
    if (error) { toast.error("Upload échoué: " + error.message); return null; }
    const { data } = await supabase.storage.from("facebook-extractions").createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }

  async function handleExtract() {
    if (!campaignName.trim() && !activeCampaign) { toast.error("Nomme la campagne d'abord"); return; }
    setBusy(true);
    try {
      let campaign_id = activeCampaign;
      if (campaignName.trim()) {
        const { data: c, error } = await supabase.from("facebook_extraction_campaigns").insert({ name: campaignName.trim(), city: city || null, trade_category: trade || null, source_url: sourceUrl || null, notes: notes || null }).select().single();
        if (error) throw error;
        campaign_id = c.id;
        setActiveCampaign(c.id);
        setCampaignName("");
      }
      const screenshotUrls: string[] = [];
      for (const f of files) {
        const u = await uploadScreenshot(f);
        if (u) screenshotUrls.push(u);
      }
      const { data, error } = await supabase.functions.invoke("fb-extract-comments", {
        body: { campaign_id, text: pasteText, screenshots: screenshotUrls },
      });
      if (error) throw error;
      toast.success(`${data?.count ?? 0} commentaires extraits`);
      setPasteText(""); setFiles([]);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally { setBusy(false); }
  }

  async function promoteSelected() {
    const ids = [...selectedComments];
    if (!ids.length) { toast.error("Sélectionne des commentaires"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("fb-promote-leads", { body: { comment_ids: ids } });
      if (error) throw error;
      toast.success(`${data.created} créés · ${data.duplicates} doublons`);
      setSelectedComments(new Set());
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); } finally { setBusy(false); }
  }

  async function generateOutreach(lead: Lead) {
    setScripts(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("fb-generate-outreach", { body: { lead_id: lead.id } });
      if (error) throw error;
      setScripts(data.scripts);
      toast.success("Scripts générés");
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); } finally { setBusy(false); }
  }

  const leadByComment = useMemo(() => Object.fromEntries(leads.map((l) => [l.source_comment_id, l])), [leads]);

  return (
    <>
      <Helmet><title>Facebook Extraction Engine — UNPRO Admin</title></Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <header>
            <h1 className="text-3xl font-bold">Facebook Contractor Extraction Engine</h1>
            <p className="text-muted-foreground mt-1">Transforme les commentaires Facebook en pipeline entrepreneurs vérifiés.</p>
          </header>

          {/* Campaign selector */}
          <div className="flex flex-wrap gap-2">
            {campaigns.map((c) => (
              <button key={c.id} onClick={() => setActiveCampaign(c.id)} className={`px-3 py-1.5 rounded-full text-xs border ${activeCampaign === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {c.name} · {c.city || "—"}
              </button>
            ))}
          </div>

          {/* Input panel */}
          <Card className="p-5 bg-card/60 backdrop-blur border-border">
            <Tabs defaultValue="paste">
              <TabsList>
                <TabsTrigger value="paste">Coller commentaires</TabsTrigger>
                <TabsTrigger value="upload">Captures d'écran</TabsTrigger>
                <TabsTrigger value="meta">Métadonnées</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-3 pt-4">
                <Label>Colle ici les commentaires Facebook (un par paragraphe)</Label>
                <Textarea rows={8} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Jean Tremblay – Toiture Tremblay inc., disponible cette semaine, 514-555-1234" />
              </TabsContent>

              <TabsContent value="upload" className="space-y-3 pt-4">
                <Label>Captures d'écran Facebook</Label>
                <Input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                {files.length > 0 && <p className="text-xs text-muted-foreground">{files.length} fichier(s) prêt(s)</p>}
              </TabsContent>

              <TabsContent value="meta" className="grid sm:grid-cols-2 gap-3 pt-4">
                <div><Label>Nom de campagne (vide = campagne active)</Label><Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Toiture Montréal Mai 2026" /></div>
                <div><Label>Ville</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                <div><Label>Catégorie / métier</Label><Input value={trade} onChange={(e) => setTrade(e.target.value)} /></div>
                <div><Label>URL du post Facebook</Label><Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={handleExtract} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Extraire
              </Button>
            </div>
          </Card>

          {/* Bulk actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{comments.length} commentaire(s) · {leads.length} lead(s)</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadAll()}><RefreshCw className="w-4 h-4 mr-1" />Rafraîchir</Button>
              <Button size="sm" onClick={promoteSelected} disabled={busy || !selectedComments.size}><Upload className="w-4 h-4 mr-1" />Promouvoir en leads ({selectedComments.size})</Button>
            </div>
          </div>

          {/* Comments table */}
          <Card className="bg-card/60 border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="p-3 text-left w-10"></th>
                  <th className="p-3 text-left">Entreprise / Contact</th>
                  <th className="p-3 text-left">Téléphone</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Métier</th>
                  <th className="p-3 text-left">Confiance</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-left">Lead</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => {
                  const lead = leadByComment[c.id];
                  const checked = selectedComments.has(c.id);
                  return (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="p-3"><input type="checkbox" checked={checked} onChange={(e) => {
                        const s = new Set(selectedComments);
                        e.target.checked ? s.add(c.id) : s.delete(c.id);
                        setSelectedComments(s);
                      }} /></td>
                      <td className="p-3">
                        <div className="font-medium">{c.company_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.commenter_name || c.raw_comment?.slice(0, 60)}</div>
                      </td>
                      <td className="p-3">{c.phone || "—"}</td>
                      <td className="p-3">{c.email || "—"}</td>
                      <td className="p-3">{c.trade_category || "—"}</td>
                      <td className="p-3"><Badge variant="outline">{c.confidence_score ?? 0}</Badge></td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[11px] ${STATUS_TONE[c.status] ?? "bg-muted"}`}>{c.status}</span></td>
                      <td className="p-3">
                        {lead ? (
                          <Button variant="ghost" size="sm" onClick={() => setOpenLead(lead)}>Voir · AIPP {lead.aipp_score ?? 0}</Button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {!comments.length && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun commentaire. Lance une extraction.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Lead drawer */}
        <Sheet open={!!openLead} onOpenChange={(o) => { if (!o) { setOpenLead(null); setScripts(null); } }}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader><SheetTitle>{openLead?.company_name ?? openLead?.contact_name ?? "Lead"}</SheetTitle></SheetHeader>
            {openLead && (
              <div className="mt-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Téléphone" value={openLead.phone} />
                  <Field label="Email" value={openLead.email} />
                  <Field label="Ville" value={openLead.city} />
                  <Field label="Métier" value={openLead.trade_category} />
                  <Field label="RBQ" value={openLead.rbq_number} />
                  <Field label="NEQ" value={openLead.neq_number} />
                  <Field label="Site web" value={openLead.website_url} />
                  <Field label="Google" value={openLead.google_business_url} />
                </div>
                <div className="flex items-center gap-2">
                  <Badge>AIPP {openLead.aipp_score ?? 0}/100</Badge>
                  <Badge variant="outline">{openLead.status}</Badge>
                  {openLead.duplicate_key && <Badge variant="outline">Dedupe key</Badge>}
                </div>

                <div className="pt-3 border-t border-border">
                  <h4 className="font-semibold mb-2">Outreach</h4>
                  <Button onClick={() => generateOutreach(openLead)} disabled={busy} size="sm" className="gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Générer scripts
                  </Button>
                  {scripts && (
                    <div className="mt-4 space-y-3">
                      {Object.entries(scripts).map(([k, v]: any) => (
                        <div key={k} className="p-3 rounded-lg bg-muted/40">
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                          <div className="text-sm whitespace-pre-wrap mt-1">{typeof v === "string" ? v : JSON.stringify(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  );
}
