import AdminLayout from "@/layouts/AdminLayout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ArrowRight, Rocket, MapPin, Target, Zap, Mail, Shield,
  CheckCircle2, Loader2, Search
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const STEPS = [
  { key: "intent", label: "Intention", icon: Target },
  { key: "targeting", label: "Ciblage", icon: MapPin },
  { key: "sources", label: "Sources", icon: Search },
  { key: "sequence", label: "Séquence", icon: Mail },
  { key: "safety", label: "Sécurité", icon: Shield },
  { key: "launch", label: "Lancement", icon: Rocket },
];

export default function PageCampaignBuilderAutonomous() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    goal: "acquisition",
    city: "",
    specialty: "",
    target_lead_count: 50,
    keyword_query: "",
    radius_km: 25,
    source_keys: ["google_maps"] as string[],
    sequence_id: "",
    mailbox_id: "",
    daily_send_limit: 30,
    hourly_send_limit: 8,
    auto_scraping_enabled: true,
    auto_sending_enabled: true,
  });

  const { data: sequences } = useQuery({
    queryKey: ["outbound-sequences"],
    queryFn: async () => {
      const { data } = await supabase.from("outbound_sequences").select("id, sequence_name").eq("is_active", true);
      return data || [];
    },
  });

  const { data: mailboxes } = useQuery({
    queryKey: ["outbound-mailboxes"],
    queryFn: async () => {
      const { data } = await supabase.from("outbound_mailboxes").select("id, sender_name, sender_email, mailbox_status");
      return data || [];
    },
  });

  const { data: sources } = useQuery({
    queryKey: ["outbound-scraping-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("outbound_scraping_sources").select("*").eq("status", "active").order("priority");
      return data || [];
    },
  });

  function update(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleSource(key: string) {
    setForm(prev => ({
      ...prev,
      source_keys: prev.source_keys.includes(key)
        ? prev.source_keys.filter(k => k !== key)
        : [...prev.source_keys, key],
    }));
  }

  async function handleLaunch() {
    if (!form.name || !form.city || !form.specialty) {
      toast.error("Nom, ville et spécialité requis");
      return;
    }
    setSaving(true);
    try {
      const { data: campaign, error } = await supabase.from("outbound_campaigns").insert({
        campaign_name: form.name,
        goal: form.goal,
        city: form.city,
        specialty: form.specialty,
        target_lead_count: form.target_lead_count,
        sequence_id: form.sequence_id || null,
        mailbox_id: form.mailbox_id || null,
        daily_send_limit: form.daily_send_limit,
        hourly_send_limit: form.hourly_send_limit,
        auto_scraping_enabled: form.auto_scraping_enabled,
        auto_sending_enabled: form.auto_sending_enabled,
        campaign_status: "draft",
      } as any).select().single();

      if (error) throw error;

      // Create campaign targets
      for (const sourceKey of form.source_keys) {
        await supabase.from("outbound_campaign_targets").insert({
          campaign_id: campaign.id,
          city: form.city,
          specialty: form.specialty,
          radius_km: form.radius_km,
          keyword_query: form.keyword_query || `${form.specialty} ${form.city}`,
          max_results: form.target_lead_count,
          source_key: sourceKey,
        } as any);
      }

      toast.success("Campagne créée avec succès !");
      navigate("/admin/outbound/campaigns");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  const canProceed = () => {
    if (step === 0) return form.name.length > 0;
    if (step === 1) return form.city.length > 0 && form.specialty.length > 0;
    if (step === 2) return form.source_keys.length > 0;
    return true;
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outbound/campaigns")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Campagnes
        </Button>

        <div>
          <h1 className="font-display text-2xl font-bold">Nouvelle campagne autonome</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline automatisé : scraping → leads → envoi</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/20 text-primary cursor-pointer"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Step 0: Intent */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Définir l'intention</CardTitle>
              <CardDescription>Quel est l'objectif de cette campagne ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de la campagne</Label>
                <Input placeholder="ex: Plomberie Laval Q2 2026" value={form.name} onChange={e => update("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Objectif</Label>
                <Select value={form.goal} onValueChange={v => update("goal", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acquisition">Acquisition B2B</SelectItem>
                    <SelectItem value="reactivation">Réactivation</SelectItem>
                    <SelectItem value="upsell">Upsell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Targeting */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Ciblage ville × spécialité</CardTitle>
              <CardDescription>Définir le marché cible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input placeholder="ex: Laval" value={form.city} onChange={e => update("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Spécialité</Label>
                  <Input placeholder="ex: Plomberie" value={form.specialty} onChange={e => update("specialty", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rayon (km)</Label>
                  <Input type="number" value={form.radius_km} onChange={e => update("radius_km", parseInt(e.target.value) || 25)} />
                </div>
                <div className="space-y-2">
                  <Label>Nombre max de leads</Label>
                  <Input type="number" value={form.target_lead_count} onChange={e => update("target_lead_count", parseInt(e.target.value) || 50)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mots-clés de recherche (optionnel)</Label>
                <Input placeholder="ex: plombier urgence résidentiel" value={form.keyword_query} onChange={e => update("keyword_query", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Sources */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> Sources de scraping</CardTitle>
              <CardDescription>Sélectionner les sources à interroger</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(sources || []).map(s => (
                <div
                  key={s.key}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    form.source_keys.includes(s.key)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => toggleSource(s.key)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Priorité: {s.priority}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={s.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}>
                        {s.status}
                      </Badge>
                      {form.source_keys.includes(s.key) && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                  </div>
                </div>
              ))}
              {(!sources || sources.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Aucune source configurée</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Sequence & Mailbox */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Séquence & Mailbox</CardTitle>
              <CardDescription>Assigner le contenu et l'expéditeur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Séquence email</Label>
                <Select value={form.sequence_id} onValueChange={v => update("sequence_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir une séquence" /></SelectTrigger>
                  <SelectContent>
                    {(sequences || []).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.sequence_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mailbox d'envoi</Label>
                <Select value={form.mailbox_id} onValueChange={v => update("mailbox_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir une mailbox" /></SelectTrigger>
                  <SelectContent>
                    {(mailboxes || []).filter(m => m.mailbox_status === "active").map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.sender_name} ({m.sender_email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Safety */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Règles de sécurité</CardTitle>
              <CardDescription>Limites d'envoi et garde-fous</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite envois / jour</Label>
                  <Input type="number" value={form.daily_send_limit} onChange={e => update("daily_send_limit", parseInt(e.target.value) || 30)} />
                </div>
                <div className="space-y-2">
                  <Label>Limite envois / heure</Label>
                  <Input type="number" value={form.hourly_send_limit} onChange={e => update("hourly_send_limit", parseInt(e.target.value) || 8)} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Auto-scraping</p>
                  <p className="text-xs text-muted-foreground">Lancer le scraping automatiquement après création</p>
                </div>
                <Switch checked={form.auto_scraping_enabled} onCheckedChange={v => update("auto_scraping_enabled", v)} />
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Auto-sending</p>
                  <p className="text-xs text-muted-foreground">Envoyer automatiquement dès que les leads sont prêts</p>
                </div>
                <Switch checked={form.auto_sending_enabled} onCheckedChange={v => update("auto_sending_enabled", v)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Launch Summary */}
        {step === 5 && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Résumé de lancement</CardTitle>
              <CardDescription>Vérifier et lancer la campagne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Campagne</p>
                  <p className="font-semibold">{form.name}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Objectif</p>
                  <p className="font-semibold capitalize">{form.goal}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Ville</p>
                  <p className="font-semibold">{form.city}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Spécialité</p>
                  <p className="font-semibold">{form.specialty}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Leads cibles</p>
                  <p className="font-semibold">{form.target_lead_count}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Sources</p>
                  <p className="font-semibold">{form.source_keys.length} source(s)</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Limite / jour</p>
                  <p className="font-semibold">{form.daily_send_limit}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Limite / heure</p>
                  <p className="font-semibold">{form.hourly_send_limit}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                {form.auto_scraping_enabled && <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400">Auto-scraping ON</Badge>}
                {form.auto_sending_enabled && <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400">Auto-sending ON</Badge>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Suivant <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleLaunch} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-4 w-4 mr-1" />}
              Lancer la campagne
            </Button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
