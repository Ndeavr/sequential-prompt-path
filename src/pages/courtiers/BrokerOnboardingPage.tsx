/**
 * UNPRO — Broker Onboarding Page
 * Multi-step: identity, agency, zones, specialties, style, license, bio.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ZONES = ["Montréal", "Laval", "Longueuil", "Québec", "Gatineau", "Sherbrooke", "Trois-Rivières", "Lévis", "Terrebonne", "Brossard", "Saint-Jean-sur-Richelieu", "Repentigny"];
const SPECIALTIES = ["Résidentiel", "Condo", "Plex", "Commercial", "Luxe", "Premier acheteur", "Investissement", "Succession", "Relocalisation"];
const LANGUAGES = ["Français", "Anglais", "Espagnol", "Arabe", "Mandarin", "Portugais"];
const STYLES = ["Accompagnement personnalisé", "Négociateur agressif", "Expert data/marché", "Spécialiste quartier", "Service VIP"];

const STEPS = ["Identité", "Agence", "Zones", "Spécialités", "Style", "Licence"];

export default function BrokerOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: user?.email || "",
    agencyName: "", city: "",
    serviceAreas: [] as string[],
    specialties: [] as string[],
    languages: ["Français"] as string[],
    yearsExperience: "",
    avgPriceMin: "", avgPriceMax: "",
    style: "",
    licenseNumber: "", bio: "",
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleArray = (field: string, val: string) => {
    const arr = form[field as keyof typeof form] as string[];
    update(field, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSubmit = async () => {
    if (!user) { toast.error("Veuillez vous connecter"); return; }
    setSaving(true);
    try {
      // Update profile
      await supabase.from("profiles").update({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
      }).eq("user_id", user.id);

      // Create broker profile
      const { error } = await supabase.from("broker_profiles").insert({
        profile_id: user.id,
        agency_name: form.agencyName,
        city: form.city,
        service_areas: form.serviceAreas,
        specialties: form.specialties,
        languages: form.languages,
        years_experience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
        avg_price_min: form.avgPriceMin ? parseFloat(form.avgPriceMin) : null,
        avg_price_max: form.avgPriceMax ? parseFloat(form.avgPriceMax) : null,
        style: form.style,
        license_number: form.licenseNumber,
        bio: form.bio,
      });

      if (error) throw error;
      toast.success("Profil courtier créé!");
      navigate("/broker");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <Helmet><title>Onboarding courtier | UNPRO</title></Helmet>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => (
              <span key={s} className={`text-xs ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</span>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prénom</Label><Input value={form.firstName} onChange={e => update("firstName", e.target.value)} /></div>
                  <div><Label>Nom</Label><Input value={form.lastName} onChange={e => update("lastName", e.target.value)} /></div>
                </div>
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => update("phone", e.target.value)} /></div>
                <div><Label>Courriel</Label><Input value={form.email} onChange={e => update("email", e.target.value)} /></div>
              </>
            )}

            {step === 1 && (
              <>
                <div><Label>Nom de l'agence</Label><Input value={form.agencyName} onChange={e => update("agencyName", e.target.value)} /></div>
                <div><Label>Ville principale</Label><Input value={form.city} onChange={e => update("city", e.target.value)} /></div>
                <div><Label>Années d'expérience</Label><Input type="number" value={form.yearsExperience} onChange={e => update("yearsExperience", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prix moyen min ($)</Label><Input type="number" value={form.avgPriceMin} onChange={e => update("avgPriceMin", e.target.value)} /></div>
                  <div><Label>Prix moyen max ($)</Label><Input type="number" value={form.avgPriceMax} onChange={e => update("avgPriceMax", e.target.value)} /></div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">Sélectionnez vos zones de service</p>
                <div className="flex flex-wrap gap-2">
                  {ZONES.map(z => (
                    <Badge key={z} variant={form.serviceAreas.includes(z) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArray("serviceAreas", z)}>
                      {z}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">Langues parlées</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <Badge key={l} variant={form.languages.includes(l) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArray("languages", l)}>
                      {l}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-sm text-muted-foreground">Sélectionnez vos spécialités</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map(s => (
                    <Badge key={s} variant={form.specialties.includes(s) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArray("specialties", s)}>
                      {s}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-sm text-muted-foreground">Quel est votre style de courtage?</p>
                <div className="space-y-2">
                  {STYLES.map(s => (
                    <Button key={s} variant={form.style === s ? "default" : "outline"} className="w-full justify-start" onClick={() => update("style", s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div><Label>Numéro de licence OACIQ</Label><Input value={form.licenseNumber} onChange={e => update("licenseNumber", e.target.value)} placeholder="Ex: J12345" /></div>
                <div><Label>Bio / Présentation</Label><Textarea value={form.bio} onChange={e => update("bio", e.target.value)} placeholder="Décrivez votre approche, vos forces..." rows={4} /></div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button className="ml-auto" onClick={() => setStep(s => s + 1)}>
                  Continuer <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button className="ml-auto" onClick={handleSubmit} disabled={saving}>
                  {saving ? "Création..." : "Créer mon profil"} <CheckCircle className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
