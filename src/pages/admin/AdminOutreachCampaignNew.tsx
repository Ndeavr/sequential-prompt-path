import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, MessageSquare, Rocket } from "lucide-react";

export default function AdminOutreachCampaignNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sourceCampaigns, setSourceCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    campaign_type: "prospection",
    source_campaign_id: "",
    primary_channel: "email",
    language: "fr",
    default_sender_name: "UNPRO",
    default_sender_email: "alex@notify.unpro.ca",
    default_sender_phone: "",
    default_promo_code: "SIGNATURE26",
    daily_send_limit: 200,
    hourly_send_limit: 25,
    stop_on_conversion: true,
  });

  useEffect(() => {
    supabase.from("prospection_campaigns").select("id, name").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setSourceCampaigns(data);
    });
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) return toast.error("Nom requis");
    setLoading(true);
    const { data, error } = await supabase.from("outreach_campaigns").insert({
      name: form.name,
      campaign_type: form.campaign_type,
      source_campaign_id: form.source_campaign_id || null,
      primary_channel: form.primary_channel,
      language: form.language,
      default_sender_name: form.default_sender_name,
      default_sender_email: form.default_sender_email,
      default_sender_phone: form.default_sender_phone || null,
      default_promo_code: form.default_promo_code || null,
      daily_send_limit: form.daily_send_limit,
      hourly_send_limit: form.hourly_send_limit,
      stop_on_conversion: form.stop_on_conversion,
      created_by: user?.id,
    }).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Campagne créée");
    navigate(`/admin/outreach/${data.id}`);
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outreach")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>
      <h1 className="font-display text-2xl font-bold">Nouvelle campagne d'outreach</h1>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>Nom de la campagne</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Couvreurs Laval Q1 2026" />
          </div>

          <div>
            <Label>Campagne source (prospection)</Label>
            <select className="w-full border rounded-md p-2 text-sm" value={form.source_campaign_id} onChange={e => setForm(f => ({ ...f, source_campaign_id: e.target.value }))}>
              <option value="">— Aucune —</option>
              {sourceCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Canal principal</Label>
              <div className="flex gap-2 mt-1">
                <Button variant={form.primary_channel === "email" ? "default" : "outline"} size="sm" onClick={() => setForm(f => ({ ...f, primary_channel: "email" }))}>
                  <Mail className="h-4 w-4 mr-1" /> Email
                </Button>
                <Button variant={form.primary_channel === "sms" ? "default" : "outline"} size="sm" onClick={() => setForm(f => ({ ...f, primary_channel: "sms" }))}>
                  <MessageSquare className="h-4 w-4 mr-1" /> SMS
                </Button>
              </div>
            </div>
            <div>
              <Label>Langue</Label>
              <select className="w-full border rounded-md p-2 text-sm" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom expéditeur</Label>
              <Input value={form.default_sender_name} onChange={e => setForm(f => ({ ...f, default_sender_name: e.target.value }))} />
            </div>
            <div>
              <Label>Email expéditeur</Label>
              <Input value={form.default_sender_email} onChange={e => setForm(f => ({ ...f, default_sender_email: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Limite /heure</Label>
              <Input type="number" value={form.hourly_send_limit} onChange={e => setForm(f => ({ ...f, hourly_send_limit: parseInt(e.target.value) || 25 }))} />
            </div>
            <div>
              <Label>Limite /jour</Label>
              <Input type="number" value={form.daily_send_limit} onChange={e => setForm(f => ({ ...f, daily_send_limit: parseInt(e.target.value) || 200 }))} />
            </div>
          </div>

          <div>
            <Label>Code promo par défaut</Label>
            <Input value={form.default_promo_code} onChange={e => setForm(f => ({ ...f, default_promo_code: e.target.value }))} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.stop_on_conversion} onChange={e => setForm(f => ({ ...f, stop_on_conversion: e.target.checked }))} />
            <Label className="mb-0">Arrêter la séquence à la conversion</Label>
          </div>

          <Button className="w-full" onClick={handleCreate} disabled={loading}>
            <Rocket className="h-4 w-4 mr-2" /> {loading ? "Création…" : "Créer la campagne"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
