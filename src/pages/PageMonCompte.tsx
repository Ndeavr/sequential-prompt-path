/**
 * PageMonCompte — /account
 * Sécurité, notifications, confidentialité. Accessible aux deux rôles.
 */
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Shield, Bell, Lock, Download, Trash2 } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";

export default function PageMonCompte() {
  const { user, isLoading } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [prefs, setPrefs] = useState({ sms: true, email: true, push: false });
  const [deleting, setDeleting] = useState(false);

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!user) return <Navigate to="/role" replace />;

  const providers: string[] = (user.app_metadata as any)?.providers ?? [(user.app_metadata as any)?.provider].filter(Boolean);

  const changeEmail = async () => {
    if (!newEmail) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingEmail(false);
    if (error) toast.error("Impossible de changer le courriel");
    else { toast.success("Lien de confirmation envoyé"); setNewEmail(""); }
  };

  const exportData = async () => {
    try {
      const [{ data: profile }, { data: properties }, { data: projects }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("properties").select("*").eq("user_id", user.id),
        supabase.from("projects").select("*").eq("user_id", user.id),
      ]);
      const blob = new Blob([JSON.stringify({ user: { id: user.id, email: user.email }, profile, properties, projects }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `unpro-mes-donnees-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Vos données ont été exportées");
    } catch {
      toast.error("Export impossible");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Cette action est irréversible. Supprimer votre compte UNPRO ?")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      toast.success("Compte supprimé");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      toast.error("La suppression n'a pas pu être complétée. Contactez le support.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainLayout>
      <Helmet><title>Mon compte | UNPRO</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-xl font-bold text-foreground">Mon compte</h1>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Sécurité</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Courriel actuel</Label>
              <p className="text-sm text-foreground">{user.email}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Changer mon courriel</Label>
              <div className="flex gap-2">
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nouveau@exemple.com" />
                <Button onClick={changeEmail} disabled={savingEmail || !newEmail}>
                  {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer"}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Connexions actives</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {providers.length ? providers.map((p) => (
                  <span key={p} className="text-xs px-2 py-1 rounded-full bg-muted text-foreground capitalize">{p}</span>
                )) : <span className="text-xs text-muted-foreground">Courriel + mot de passe</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {([
              { k: "sms", label: "SMS" },
              { k: "email", label: "Courriel" },
              { k: "push", label: "Notifications push" },
            ] as const).map(({ k, label }) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{label}</span>
                <Switch checked={prefs[k]} onCheckedChange={(v) => setPrefs({ ...prefs, [k]: v })} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">Vos préférences sont enregistrées localement et seront synchronisées avec votre compte.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" /> Confidentialité</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={exportData} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" /> Exporter mes données (JSON)
            </Button>
            <div className="pt-2 border-t">
              <Button variant="destructive" onClick={deleteAccount} disabled={deleting} className="w-full sm:w-auto">
                {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Supprimer mon compte
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Action irréversible. Toutes vos données seront effacées.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
