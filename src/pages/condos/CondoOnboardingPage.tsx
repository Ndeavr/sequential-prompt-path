/**
 * UNPRO Condos — Onboarding Flow
 * Multi-step building registration
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import GooglePlacesInput from "@/components/property/GooglePlacesInput";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Calendar, Users, Puzzle, Upload,
  CheckCircle2, ArrowRight, ArrowLeft, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STEPS = [
  { key: "address", label: "Adresse", icon: MapPin },
  { key: "details", label: "Détails", icon: Building2 },
  { key: "components", label: "Composantes", icon: Puzzle },
  { key: "documents", label: "Documents", icon: Upload },
  { key: "done", label: "Terminé", icon: CheckCircle2 },
];

const COMPONENT_PRESETS = [
  "Toiture", "Fenêtres", "Revêtement extérieur", "Ascenseur",
  "Système HVAC", "Plomberie", "Électricité", "Stationnement",
  "Balcons", "Fondation", "Portes communes", "Système d'alarme",
];

type FormData = {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  year_built: string;
  unit_count: string;
  building_type: string;
  components: string[];
};

const CondoOnboardingPage = () => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    name: "", address: "", city: "", postal_code: "",
    year_built: "", unit_count: "", building_type: "vertical",
    components: [],
  });

  const update = (key: keyof FormData, value: string | string[]) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleComponent = (c: string) => {
    setForm(prev => ({
      ...prev,
      components: prev.components.includes(c) ? prev.components.filter(x => x !== c) : [...prev.components, c],
    }));
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSubmit = async () => {
    if (!user) { toast.error("Veuillez vous connecter."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("syndicates").insert({
        name: form.name || `${form.address}, ${form.city}`,
        address: form.address,
        city: form.city,
        postal_code: form.postal_code,
        province: "Québec",
        unit_count: parseInt(form.unit_count) || null,
        created_by: user.id,
        year_built: parseInt(form.year_built) || null,
        building_type: form.building_type,
        onboarding_completed: true,
      } as any).select("id").single();
      if (error) throw error;

      const syndicateId = data.id;
      setCreatedId(syndicateId);

      // Add user as admin member
      await supabase.from("syndicate_members").insert({
        syndicate_id: syndicateId,
        user_id: user.id,
        role: "board_member",
        is_active: true,
      });

      // Add selected components
      if (form.components.length > 0) {
        await supabase.from("syndicate_components").insert(
          form.components.map(c => ({
            syndicate_id: syndicateId,
            name: c,
            category: "general",
          })) as any
        );
      }

      setStep(4); // done
      toast.success("Passeport Immeuble créé!");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.address.trim().length > 2 && form.city.trim().length > 1;
    if (step === 1) return form.unit_count.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold mb-1">Créer mon Passeport Immeuble</h1>
          <p className="text-sm text-muted-foreground">Étape {step + 1} de {STEPS.length}</p>
        </div>

        <Progress value={progress} className="h-1.5 mb-6 rounded-full" />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 0: Address */}
            {step === 0 && (
              <Card className="border-border/40 bg-card/90">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Nom du syndicat (optionnel)</Label>
                    <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Ex: Syndicat du 123 rue Principale" className="rounded-xl mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Adresse *</Label>
                    <GooglePlacesInput
                      value={form.address}
                      onChange={(v) => update("address", v)}
                      onPlaceSelect={(place) => {
                        update("address", place.address);
                        if (place.city) update("city", place.city);
                        if (place.postalCode) update("postal_code", place.postalCode);
                      }}
                      placeholder="123 rue Principale"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Ville *</Label>
                      <Input value={form.city} onChange={e => update("city", e.target.value)} placeholder="Montréal" className="rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Code postal</Label>
                      <Input value={form.postal_code} onChange={e => update("postal_code", e.target.value)} placeholder="H2X 1Y4" className="rounded-xl mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
              <Card className="border-border/40 bg-card/90">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Année de construction</Label>
                    <Input type="number" value={form.year_built} onChange={e => update("year_built", e.target.value)} placeholder="2005" className="rounded-xl mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nombre d'unités *</Label>
                    <Input type="number" value={form.unit_count} onChange={e => update("unit_count", e.target.value)} placeholder="24" className="rounded-xl mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type de copropriété</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        { value: "vertical", label: "Vertical (immeuble)" },
                        { value: "horizontal", label: "Horizontal (townhouse)" },
                      ].map(t => (
                        <button
                          key={t.value}
                          onClick={() => update("building_type", t.value)}
                          className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                            form.building_type === t.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/40 hover:border-primary/30"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Components */}
            {step === 2 && (
              <Card className="border-border/40 bg-card/90">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-4">Sélectionnez les composantes principales de votre immeuble :</p>
                  <div className="flex flex-wrap gap-2">
                    {COMPONENT_PRESETS.map(c => (
                      <button
                        key={c}
                        onClick={() => toggleComponent(c)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                          form.components.includes(c)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/40 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {form.components.includes(c) && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                        {c}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">{form.components.length} composante(s) sélectionnée(s)</p>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <Card className="border-border/40 bg-card/90">
                <CardContent className="p-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-semibold mb-1">Téléverser des documents (optionnel)</h3>
                  <p className="text-sm text-muted-foreground mb-4">Ajoutez l'étude du fonds, procès-verbaux, déclaration de copropriété, etc.</p>
                  <Button variant="outline" className="rounded-xl">
                    <Upload className="h-4 w-4 mr-2" /> Choisir des fichiers
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">Vous pourrez ajouter des documents plus tard</p>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
              <Card className="border-primary/20 bg-card/90">
                <CardContent className="p-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">Passeport Immeuble créé! 🎉</h3>
                  <p className="text-sm text-muted-foreground mb-6">Votre copropriété est maintenant enregistrée dans UNPRO Condos.</p>

                  <div className="space-y-2 text-left mb-6">
                    {["Checklist Loi 16 générée", "Composantes enregistrées", "Calendrier d'entretien initialisé"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-success/5">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => navigate("/condos/dashboard")} className="w-full rounded-xl shadow-glow">
                    <Sparkles className="h-4 w-4 mr-2" /> Accéder à mon tableau de bord
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="rounded-xl">
                Suivant <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="rounded-xl shadow-glow">
                {loading ? "Création..." : "Créer mon Passeport"} <Sparkles className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CondoOnboardingPage;
