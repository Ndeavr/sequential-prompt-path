/**
 * PageMonProfil — /profile
 * Profil utilisateur réel (homeowner ou contractor). Édition inline.
 */
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Home, Briefcase, MapPin, Settings, QrCode } from "lucide-react";
import { toast } from "sonner";
import MainLayout from "@/layouts/MainLayout";

export default function PageMonProfil() {
  const { user, role, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [extras, setExtras] = useState<{ propertiesCount: number; contractor: any | null }>({
    propertiesCount: 0,
    contractor: null,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count }, { data: contractor }] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("contractors").select("business_name, rbq_number, city, contractor_services(service_key, is_primary)").eq("user_id", user.id).maybeSingle(),
      ]);
      setExtras({ propertiesCount: count ?? 0, contractor: contractor ?? null });
    })();
  }, [user]);

  if (authLoading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!user) return <Navigate to="/role" replace />;

  const save = async () => {
    try {
      const full_name = [form.first_name, form.last_name].filter(Boolean).join(" ");
      await updateProfile.mutateAsync({
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        full_name: full_name || undefined,
        phone: form.phone || undefined,
      });
      toast.success("Profil mis à jour");
      setEditing(false);
    } catch {
      toast.error("Échec de la mise à jour");
    }
  };

  const initials = (profile?.first_name?.[0] ?? user.email?.[0] ?? "U").toUpperCase();
  const isContractor = role === "contractor";

  return (
    <MainLayout>
      <Helmet><title>Mon profil | UNPRO</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <header className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold border border-primary/30">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">
              {profile?.full_name || `${form.first_name} ${form.last_name}`.trim() || "Mon profil"}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs mt-0.5 inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {isContractor ? "Entrepreneur" : role === "admin" ? "Administrateur" : "Propriétaire"}
            </p>
          </div>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Informations personnelles</CardTitle>
            {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Modifier</Button>}
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prénom</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                  <div><Label>Nom</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                </div>
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="514 555 1234" /></div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={save} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
                </div>
              </>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground text-xs">Prénom</dt><dd className="text-foreground">{profile?.first_name || "—"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Nom</dt><dd className="text-foreground">{profile?.last_name || "—"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Téléphone</dt><dd className="text-foreground">{profile?.phone || "—"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Courriel</dt><dd className="text-foreground">{user.email}</dd></div>
              </dl>
            )}
          </CardContent>
        </Card>

        {isContractor && extras.contractor && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4" /> Mon entreprise</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground text-xs">Entreprise</dt><dd className="text-foreground">{extras.contractor.business_name || "—"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">RBQ</dt><dd className="text-foreground">{extras.contractor.rbq_number || "—"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Région</dt><dd className="text-foreground">{extras.contractor.city || "—"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Services</dt><dd className="text-foreground">{Array.isArray(extras.contractor.contractor_services) ? extras.contractor.contractor_services.length : 0}</dd></div>
              </dl>
              <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/pro/profile">Gérer mon profil entrepreneur</Link></Button>
            </CardContent>
          </Card>
        )}

        {!isContractor && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Home className="w-4 h-4" /> Mes propriétés</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-foreground">
                {extras.propertiesCount > 0
                  ? `${extras.propertiesCount} propriété${extras.propertiesCount > 1 ? "s" : ""} enregistrée${extras.propertiesCount > 1 ? "s" : ""}.`
                  : "Aucune propriété enregistrée pour l'instant."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><Link to="/dashboard/properties"><MapPin className="w-3.5 h-3.5 mr-1.5" /> Voir mes propriétés</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/dashboard/passport">Passeport Maison</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="ghost"><Link to="/account"><Settings className="w-3.5 h-3.5 mr-1.5" /> Mon compte</Link></Button>
            <Button asChild size="sm" variant="ghost"><Link to="/qr"><QrCode className="w-3.5 h-3.5 mr-1.5" /> Mon QR Code</Link></Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
