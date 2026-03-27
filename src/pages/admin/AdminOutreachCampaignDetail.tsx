import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Play, Pause, Send, Mail, MessageSquare, Trash2, Users } from "lucide-react";

export default function AdminOutreachCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [sequence, setSequence] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    const [campRes, seqRes, recipRes] = await Promise.all([
      supabase.from("outreach_campaigns").select("*").eq("id", id!).single(),
      supabase.from("outreach_sequences").select("*").eq("campaign_id", id!).limit(1).maybeSingle(),
      supabase.from("outreach_recipients").select("*, prospects(business_name, main_city)").eq("campaign_id", id!).order("created_at", { ascending: false }).limit(100),
    ]);
    if (campRes.data) setCampaign(campRes.data);
    if (seqRes.data) {
      setSequence(seqRes.data);
      const { data: stepsData } = await supabase.from("outreach_sequence_steps").select("*").eq("sequence_id", seqRes.data.id).order("step_order");
      setSteps(stepsData || []);
    }
    setRecipients(recipRes.data || []);
    setLoading(false);
  }

  async function createSequence() {
    const { data, error } = await supabase.from("outreach_sequences").insert({
      campaign_id: id!,
      sequence_name: `Séquence ${campaign?.name || ""}`.trim(),
    }).select().single();
    if (error) return toast.error(error.message);
    setSequence(data);
    toast.success("Séquence créée");
  }

  async function addStep() {
    if (!sequence) return;
    const nextOrder = steps.length + 1;
    const { data, error } = await supabase.from("outreach_sequence_steps").insert({
      sequence_id: sequence.id,
      step_order: nextOrder,
      channel_type: "email",
      step_name: `Étape ${nextOrder}`,
      delay_hours: nextOrder === 1 ? 0 : 48,
    }).select().single();
    if (error) return toast.error(error.message);
    setSteps([...steps, data]);
    toast.success("Étape ajoutée");
  }

  async function updateStep(stepId: string, updates: Record<string, any>) {
    await supabase.from("outreach_sequence_steps").update(updates).eq("id", stepId);
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  }

  async function deleteStep(stepId: string) {
    await supabase.from("outreach_sequence_steps").delete().eq("id", stepId);
    setSteps(steps.filter(s => s.id !== stepId));
    toast.success("Étape supprimée");
  }

  async function queueProspects() {
    if (!campaign?.source_campaign_id) return toast.error("Pas de campagne source");
    const { data: prospects } = await supabase.from("prospects").select("id")
      .eq("campaign_id", campaign.source_campaign_id)
      .in("status", ["scored", "queued_for_outreach", "normalized"]);
    if (!prospects?.length) return toast.error("Aucun prospect éligible");
    const rows = prospects.map(p => ({
      campaign_id: id!,
      prospect_id: p.id,
      recipient_status: "queued",
      next_send_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("outreach_recipients").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} destinataires ajoutés`);
    loadAll();
  }

  async function toggleCampaignStatus() {
    if (!campaign) return;
    const newStatus = campaign.status === "running" ? "paused" : "running";
    const updates: any = { status: newStatus };
    if (newStatus === "running" && !campaign.launched_at) updates.launched_at = new Date().toISOString();
    await supabase.from("outreach_campaigns").update(updates).eq("id", id!);
    setCampaign({ ...campaign, ...updates });
    toast.success(newStatus === "running" ? "Campagne lancée" : "Campagne en pause");
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;
  if (!campaign) return <div className="p-8 text-center text-muted-foreground">Campagne introuvable</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outreach")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{campaign.name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge>{campaign.status}</Badge>
            <Badge variant="outline">{campaign.primary_channel}</Badge>
            <Badge variant="outline">{campaign.hourly_send_limit}/h · {campaign.daily_send_limit}/j</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={queueProspects}>
            <Users className="h-4 w-4 mr-1" /> Ajouter prospects
          </Button>
          <Button size="sm" onClick={toggleCampaignStatus} variant={campaign.status === "running" ? "outline" : "default"}>
            {campaign.status === "running" ? <><Pause className="h-4 w-4 mr-1" /> Pause</> : <><Play className="h-4 w-4 mr-1" /> Lancer</>}
          </Button>
        </div>
      </div>

      {/* Sequence Builder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Séquence</CardTitle>
          {!sequence && <Button size="sm" onClick={createSequence}><Plus className="h-4 w-4 mr-1" /> Créer séquence</Button>}
          {sequence && <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-4 w-4 mr-1" /> Ajouter étape</Button>}
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune étape. {!sequence ? "Créez d'abord une séquence." : "Ajoutez des étapes."}</p>
          ) : (
            <div className="space-y-4">
              {steps.map((step, i) => (
                <Card key={step.id} className="border-border/40">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">J+{step.delay_hours / 24 | 0}</Badge>
                        <Button variant={step.channel_type === "email" ? "default" : "outline"} size="sm"
                          onClick={() => updateStep(step.id, { channel_type: step.channel_type === "email" ? "sms" : "email" })}>
                          {step.channel_type === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        </Button>
                        <Input className="h-8 w-40 text-sm" value={step.step_name || ""} onChange={e => updateStep(step.id, { step_name: e.target.value })} />
                      </div>
                      <div className="flex gap-1">
                        <Input type="number" className="h-8 w-20 text-xs" value={step.delay_hours} onChange={e => updateStep(step.id, { delay_hours: parseInt(e.target.value) || 0 })} />
                        <span className="text-xs text-muted-foreground self-center">h</span>
                        <Button variant="ghost" size="sm" onClick={() => deleteStep(step.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                    {step.channel_type === "email" && (
                      <Input className="text-sm" placeholder="Sujet…" value={step.subject_template || ""} onChange={e => updateStep(step.id, { subject_template: e.target.value })} />
                    )}
                    <Textarea className="text-sm min-h-[60px]" placeholder="Corps du message… Utilisez [BusinessName], [City], [AlexLink], [PromoCode]" value={step.body_template || ""} onChange={e => updateStep(step.id, { body_template: e.target.value })} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Destinataires ({recipients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun destinataire. Cliquez « Ajouter prospects » pour importer.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead>Prochain envoi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{(r.prospects as any)?.business_name || "—"}</TableCell>
                    <TableCell>{(r.prospects as any)?.main_city || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.recipient_status}</Badge></TableCell>
                    <TableCell className="text-sm">{r.current_step_order}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.next_send_at ? new Date(r.next_send_at).toLocaleString("fr-CA") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
