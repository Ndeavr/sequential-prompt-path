/**
 * UNPRO — Admin Prospect Email Campaigns
 * Send tracked emails to scored prospects with follow-up sequences.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mail, Send, Users, Eye, MousePointer, CalendarCheck,
  ChevronRight, Filter, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";

const SUBJECT_TEMPLATES = [
  { id: "score", label: "Score AIPP", template: "{business_name} — votre score AIPP est de {aipp_score}" },
  { id: "visibility", label: "Visibilité", template: "{business_name} : votre visibilité locale plafonne" },
  { id: "ai", label: "IA", template: "Laval — votre entreprise est-elle prête pour la recherche IA?" },
  { id: "audit", label: "Audit", template: "Voici votre audit AIPP personnalisé" },
];

const generateEmailBody = (prospect: any) => {
  const baseUrl = window.location.origin;
  return `Bonjour ${prospect.business_name},

Nous avons analysé votre présence numérique dans ${prospect.city || "votre région"}.

Votre score AIPP actuel est de ${prospect.aipp_score ?? "—"}/100.

${prospect.diagnostic_summary || "Votre profil montre un potentiel d'amélioration significatif."}

Nous avons préparé votre page d'analyse personnalisée ici :
${baseUrl}/audit/${prospect.landing_slug}

Vous y verrez :
- Ce que votre score signifie
- Où vous perdez probablement des opportunités
- Les actions prioritaires pour remonter rapidement

UnPRO ne vend pas des leads partagés.
Nous aidons les entrepreneurs à capter et convertir des clients qualifiés.

Si vous voulez voir ce que ça changerait pour votre entreprise, répondez à ce message.

— L'équipe UnPRO`;
};

export default function AdminProspectCampaigns() {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subjectTemplate, setSubjectTemplate] = useState("score");
  const [customSubject, setCustomSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("scored");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [previewProspect, setPreviewProspect] = useState<any>(null);

  // Fetch prospects eligible for emailing
  const { data: prospects } = useQuery({
    queryKey: ["campaign-prospects", filterStatus, filterCategory, filterPriority],
    queryFn: async () => {
      let q = (supabase as any)
        .from("contractors_prospects")
        .select("id, business_name, city, category, aipp_score, priority_tier, status, landing_slug, email, diagnostic_summary")
        .order("aipp_score", { ascending: true })
        .limit(500);
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      if (filterCategory !== "all") q = q.eq("category", filterCategory);
      if (filterPriority !== "all") q = q.eq("priority_tier", filterPriority);
      const { data } = await q;
      return data ?? [];
    },
  });

  // Campaign stats
  const { data: campaignStats } = useQuery({
    queryKey: ["campaign-stats"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("contractor_email_campaigns")
        .select("id, open_count, click_count, replied");
      if (!data) return { total: 0, opens: 0, clicks: 0, replies: 0 };
      return {
        total: data.length,
        opens: data.filter((c: any) => c.open_count > 0).length,
        clicks: data.filter((c: any) => c.click_count > 0).length,
        replies: data.filter((c: any) => c.replied).length,
      };
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!prospects) return;
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map((p: any) => p.id)));
    }
  };

  const sendCampaign = useMutation({
    mutationFn: async () => {
      const selected = (prospects ?? []).filter((p: any) => selectedIds.has(p.id));
      if (selected.length === 0) throw new Error("Aucun prospect sélectionné");

      const template = SUBJECT_TEMPLATES.find(t => t.id === subjectTemplate);
      let sentCount = 0;

      for (const prospect of selected) {
        const subject = (customSubject || template?.template || "Votre score AIPP")
          .replace("{business_name}", prospect.business_name)
          .replace("{aipp_score}", String(prospect.aipp_score ?? "—"));

        const body = generateEmailBody(prospect);
        const trackingId = `campaign-${Date.now()}-${prospect.id.slice(0, 8)}`;

        // Insert campaign record
        await (supabase as any).from("contractor_email_campaigns").insert({
          contractor_id: prospect.id,
          campaign_name: `AIPP Outreach — ${new Date().toLocaleDateString("fr-CA")}`,
          subject,
          body_text: body,
          from_name: "UnPRO",
          from_email: "hello@unpro.ca",
          tracking_id: trackingId,
          sent_at: new Date().toISOString(),
        });

        // Update prospect status
        await (supabase as any)
          .from("contractors_prospects")
          .update({ status: "emailed" })
          .eq("id", prospect.id);

        sentCount++;
      }

      return sentCount;
    },
    onSuccess: (count) => {
      toast.success(`${count} emails envoyés avec succès`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["campaign-prospects"] });
      qc.invalidateQueries({ queryKey: ["campaign-stats"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <AdminLayout>
      <PageHeader title="Campagnes Prospects" description="Envoi d'emails personnalisés avec suivi" />

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Envoyés", value: campaignStats?.total ?? 0, icon: Send, color: "text-blue-400" },
          { label: "Ouverts", value: campaignStats?.opens ?? 0, icon: Eye, color: "text-amber-400" },
          { label: "Cliqués", value: campaignStats?.clicks ?? 0, icon: MousePointer, color: "text-pink-400" },
          { label: "Réponses", value: campaignStats?.replies ?? 0, icon: CalendarCheck, color: "text-green-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: prospect selection */}
        <div className="md:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="scored">Scorés</SelectItem>
                <SelectItem value="landing_ready">Landing prête</SelectItem>
                <SelectItem value="new">Nouveaux</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedIds.size === (prospects?.length ?? 0) ? "Tout désélectionner" : "Tout sélectionner"}
            </Button>
            <Badge variant="secondary" className="self-center">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Prospects list */}
          <Card>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
              {(prospects ?? []).map((p: any) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors ${selectedIds.has(p.id) ? "bg-primary/5" : ""}`}
                  onClick={() => toggleSelect(p.id)}
                >
                  <Checkbox checked={selectedIds.has(p.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.business_name}</p>
                    <p className="text-xs text-muted-foreground">{p.city} • {p.category}</p>
                  </div>
                  <span className={`text-sm font-bold ${(p.aipp_score ?? 0) >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {p.aipp_score ?? "—"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{p.priority_tier}</Badge>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewProspect(p); }}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {(prospects ?? []).length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">Aucun prospect dans ce filtre</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: email composer */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Composer le message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Template d'objet</label>
                <Select value={subjectTemplate} onValueChange={setSubjectTemplate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label} — {t.template.slice(0, 40)}…</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Objet personnalisé (optionnel)</label>
                <Input
                  placeholder="Laisser vide pour utiliser le template"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                disabled={selectedIds.size === 0 || sendCampaign.isPending}
                onClick={() => sendCampaign.mutate()}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendCampaign.isPending ? "Envoi..." : `Envoyer à ${selectedIds.size} prospect${selectedIds.size > 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          {previewProspect && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Aperçu — {previewProspect.business_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded-lg bg-muted/30 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto">
                  {generateEmailBody(previewProspect)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up info */}
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Séquence de relance
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-400" /> J+0 — Email initial</div>
                <div className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-amber-400" /> J+2 — Relance douce</div>
                <div className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-orange-400" /> J+5 — Urgence places</div>
                <div className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-red-400" /> J+9 — Fermeture dossier</div>
              </div>
              <p className="text-[10px] text-muted-foreground/60 italic">Automatisation future — manuellement pour le MVP</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
