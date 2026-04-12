import AdminLayout from "@/layouts/AdminLayout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PageOutboundSettingsAutonomous() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    max_daily_per_mailbox: 50,
    max_hourly_per_mailbox: 10,
    pause_bounce_threshold: 0.05,
    pause_spam_threshold: 0.02,
    dedupe_window_days: 90,
    default_country: "CA",
    default_region: "QC",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase.from("outbound_global_settings").select("*").limit(1).single();
    if (data) setSettings(data as any);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { id, ...rest } = settings;
    const { error } = await supabase.from("outbound_global_settings").update({ ...rest, updated_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Paramètres sauvegardés");
    setSaving(false);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outbound")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>

        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" /> Paramètres Outbound
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configuration globale du moteur autonome</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limites d'envoi</CardTitle>
            <CardDescription>Garde-fous globaux par mailbox</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max envois / jour / mailbox</Label>
                <Input type="number" value={settings.max_daily_per_mailbox} onChange={e => setSettings(p => ({ ...p, max_daily_per_mailbox: parseInt(e.target.value) || 50 }))} />
              </div>
              <div className="space-y-2">
                <Label>Max envois / heure / mailbox</Label>
                <Input type="number" value={settings.max_hourly_per_mailbox} onChange={e => setSettings(p => ({ ...p, max_hourly_per_mailbox: parseInt(e.target.value) || 10 }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seuils de pause</CardTitle>
            <CardDescription>Pause automatique si les seuils sont dépassés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seuil bounce (ex: 0.05 = 5%)</Label>
                <Input type="number" step="0.01" value={settings.pause_bounce_threshold} onChange={e => setSettings(p => ({ ...p, pause_bounce_threshold: parseFloat(e.target.value) || 0.05 }))} />
              </div>
              <div className="space-y-2">
                <Label>Seuil spam (ex: 0.02 = 2%)</Label>
                <Input type="number" step="0.01" value={settings.pause_spam_threshold} onChange={e => setSettings(p => ({ ...p, pause_spam_threshold: parseFloat(e.target.value) || 0.02 }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Déduplication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fenêtre de déduplication (jours)</Label>
              <Input type="number" value={settings.dedupe_window_days} onChange={e => setSettings(p => ({ ...p, dedupe_window_days: parseInt(e.target.value) || 90 }))} />
              <p className="text-xs text-muted-foreground">Un domaine déjà contacté dans cette fenêtre ne sera pas recontacté</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Région par défaut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pays</Label>
                <Input value={settings.default_country} onChange={e => setSettings(p => ({ ...p, default_country: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Région</Label>
                <Input value={settings.default_region} onChange={e => setSettings(p => ({ ...p, default_region: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Sauvegarder
        </Button>
      </div>
    </AdminLayout>
  );
}
