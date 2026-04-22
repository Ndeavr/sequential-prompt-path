/**
 * UNPRO — Contractor Smart Questionnaire (7-step adaptive wizard)
 * Mobile-first, auto-save, pre-filled from imports, badge "à valider"
 */
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Wrench, Shield, Star, Phone, Clock,
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Save,
  Globe, Camera, FileText, AlertTriangle, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import MainLayout from "@/layouts/MainLayout";
import { useContractorQuestionnaire } from "@/hooks/useContractorQuestionnaire";
import CategorySelector, { CategorySelection } from "@/components/contractor/CategorySelector";
import CitySelector, { CitySelection } from "@/components/contractor/CitySelector";
import ServiceSelector, { ServiceSelection, SERVICE_LIMITS } from "@/components/contractor/ServiceSelector";
import { toast } from "sonner";

/** City limits per plan code */
const CITY_LIMITS: Record<string, number> = {
  signature: 50, elite: 25, premium: 15, pro: 8, recrue: 3,
};
const PLAN_LABELS: Record<string, string> = {
  signature: "Signature", elite: "Élite", premium: "Premium", pro: "Pro", recrue: "Recrue",
};

const STEPS = [
  { id: 1, title: "Identité", icon: Building2 },
  { id: 2, title: "Activité", icon: Wrench },
  { id: 3, title: "Services", icon: Wrench },
  { id: 4, title: "Zones", icon: MapPin },
  { id: 5, title: "Preuves", icon: Shield },
  { id: 6, title: "Réputation", icon: Star },
  { id: 7, title: "Conversion", icon: Phone },
];

const CATEGORIES = [
  "Toiture", "Isolation", "Électricité", "Plomberie", "Drainage",
  "Fondation", "CVC / Chauffage", "Menuiserie", "Peinture",
  "Maçonnerie", "Rénovation générale", "Paysagement", "Décontamination",
];

const SERVICE_SCOPES = [
  { id: "residential", label: "Résidentiel" },
  { id: "commercial", label: "Commercial" },
  { id: "multi", label: "Multilogement" },
  { id: "institutional", label: "Institutionnel" },
];

const CLIENT_TYPES = [
  "Propriétaires", "Locataires", "Syndicats de copropriété",
  "Gestionnaires immobiliers", "Entreprises", "Municipalités",
];

const LANGUAGES = ["Français", "English", "Español", "Português", "العربية", "中文"];

const CERTIFICATIONS_LIST = [
  "RBQ", "CCA", "ASP Construction", "LEED", "Novoclimat",
  "Thermographie", "Maître électricien", "Corporation des maîtres mécaniciens",
];

const PROJECT_TYPES = [
  "Installation neuve", "Réparation", "Inspection", "Urgence",
  "Rénovation majeure", "Entretien préventif", "Consultation",
];

const QUEBEC_CITIES = [
  "Montréal", "Québec", "Laval", "Gatineau", "Longueuil",
  "Sherbrooke", "Lévis", "Saguenay", "Trois-Rivières", "Terrebonne",
  "Saint-Jean-sur-Richelieu", "Repentigny", "Brossard", "Drummondville",
  "Saint-Jérôme", "Granby", "Blainville", "Saint-Hyacinthe",
];

/** Small "pre-filled" badge */
function PrefilledBadge() {
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary ml-1">
      importé
    </Badge>
  );
}

/** "To validate" badge */
function ToValidateBadge() {
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 gap-0.5">
      <AlertTriangle className="w-2.5 h-2.5" /> à valider
    </Badge>
  );
}

function ChipSelector({
  options, selected, onToggle, columns = 2,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  columns?: number;
}) {
  return (
    <div className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`text-xs rounded-lg px-3 py-2 border text-left transition-all ${
              active
                ? "bg-primary/10 border-primary text-primary font-medium"
                : "bg-card border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FieldWrapper({
  label, children, prefilled, aippBoost,
}: {
  label: string;
  children: React.ReactNode;
  prefilled?: boolean;
  aippBoost?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {prefilled && <PrefilledBadge />}
        {aippBoost && (
          <span className="text-[10px] text-primary font-semibold ml-auto">+{aippBoost} AIPP</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function ContractorQuestionnairePage() {
  const navigate = useNavigate();
  const {
    form, step, setStep, updateField, toggleArrayField,
    isLoading, isDirty, save, completionPct, prefilledFields,
  } = useContractorQuestionnaire();

  const pf = prefilledFields();
  const pct = completionPct();
  const totalSteps = STEPS.length;

  const nextStep = async () => {
    if (isDirty) await save();
    if (step < totalSteps) setStep(step + 1);
    else {
      await save();
      toast.success("Questionnaire complété!");
      navigate("/pro");
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Top progress */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="max-w-lg mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Étape {step}/{totalSteps}</span>
              <div className="flex items-center gap-1.5">
                {isDirty && <Save className="w-3 h-3 text-muted-foreground animate-pulse" />}
                <span className="text-muted-foreground">{pct}% complété</span>
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-1.5" />
            {/* Step pills */}
            <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const isActive = s.id === step;
                const isPast = s.id < step;
                return (
                  <button
                    key={s.id}
                    onClick={() => s.id <= step && setStep(s.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isPast
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="max-w-lg mx-auto px-4 pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {step === 1 && (
                <>
                  <StepHeader title="Identité de l'entreprise" subtitle="Informations de base pour votre profil public." />
                  <FieldWrapper label="Nom d'entreprise" prefilled={pf.has("business_name")} aippBoost={10}>
                    <Input value={form.business_name} onChange={(e) => updateField("business_name", e.target.value)} placeholder="Ex: Plomberie Martin" />
                  </FieldWrapper>
                  <FieldWrapper label="Nom légal (si différent)">
                    <Input value={form.legal_name} onChange={(e) => updateField("legal_name", e.target.value)} placeholder="9876-5432 Québec Inc." />
                  </FieldWrapper>
                  <FieldWrapper label="Téléphone" prefilled={pf.has("phone")} aippBoost={5}>
                    <Input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="(514) 555-1234" />
                  </FieldWrapper>
                  <FieldWrapper label="Courriel" prefilled={pf.has("email")} aippBoost={5}>
                    <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="info@entreprise.ca" />
                  </FieldWrapper>
                  <FieldWrapper label="Site web" prefilled={pf.has("website")} aippBoost={8}>
                    <Input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://www.entreprise.ca" />
                  </FieldWrapper>
                  <FieldWrapper label="Langues de service">
                    <ChipSelector options={LANGUAGES} selected={form.languages} onToggle={(v) => toggleArrayField("languages", v)} columns={3} />
                  </FieldWrapper>
                </>
              )}

              {step === 2 && (
                <>
                  <StepHeader title="Activité principale" subtitle="Sélectionnez votre catégorie principale et vos spécialités." />
                  <FieldWrapper label="Catégories de service" aippBoost={15}>
                    <CategorySelector
                      selection={{
                        primaryId: form.primary_categories[0] || null,
                        secondaryIds: form.secondary_categories,
                      }}
                      onSelectionChange={(sel: CategorySelection) => {
                        updateField("primary_categories", sel.primaryId ? [sel.primaryId] : []);
                        updateField("secondary_categories", sel.secondaryIds);
                      }}
                      maxSecondary={3}
                      planName="Pro"
                    />
                  </FieldWrapper>
                  <FieldWrapper label="Description courte" prefilled={pf.has("description")} aippBoost={6}>
                    <Textarea
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Décrivez votre entreprise en quelques phrases…"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{form.description.length}/500</p>
                  </FieldWrapper>
                  <FieldWrapper label="Types de clients">
                    <ChipSelector options={CLIENT_TYPES} selected={form.client_types} onToggle={(v) => toggleArrayField("client_types", v)} />
                  </FieldWrapper>
                </>
              )}

              {step === 3 && (() => {
                const planCode = "pro_acq"; // TODO: get from subscription
                const limits = SERVICE_LIMITS[planCode] || SERVICE_LIMITS.recrue;
                return (
                  <>
                    <StepHeader title="Services offerts" subtitle="Précisez ce que vous faites et comment." />
                    <FieldWrapper label="Services" aippBoost={10}>
                      <ServiceSelector
                        selection={{
                          primaryServices: form.primary_services,
                          secondaryServices: form.secondary_services,
                        }}
                        onSelectionChange={(sel: ServiceSelection) => {
                          updateField("primary_services", sel.primaryServices);
                          updateField("secondary_services", sel.secondaryServices);
                        }}
                        maxPrimary={limits.primary}
                        maxSecondary={limits.secondary}
                        planName={PLAN_LABELS[planCode] || "Pro"}
                        planCode={planCode}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Types de projets" aippBoost={5}>
                      <ChipSelector options={PROJECT_TYPES} selected={form.project_types} onToggle={(v) => toggleArrayField("project_types", v)} />
                    </FieldWrapper>
                    <FieldWrapper label="Portée de service" aippBoost={5}>
                      <ChipSelector
                        options={SERVICE_SCOPES.map((s) => s.label)}
                        selected={form.service_scope}
                        onToggle={(v) => toggleArrayField("service_scope", v)}
                      />
                    </FieldWrapper>
                    <div className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">Service d'urgence 24/7</p>
                        <p className="text-[10px] text-muted-foreground">Disponible en dehors des heures normales</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-primary font-semibold">+5 AIPP</span>
                        <Switch checked={form.emergency_service} onCheckedChange={(v) => updateField("emergency_service", v)} />
                      </div>
                    </div>
                  </>
                );
              })()}

              {step === 4 && (() => {
                const planCode = "pro_acq"; // TODO: get from subscription
                const maxCities = (CITY_LIMITS[planCode] || 3) - 1; // -1 for primary
                return (
                  <>
                    <StepHeader title="Zones desservies" subtitle="Où intervenez-vous principalement?" />
                    <FieldWrapper label="Villes desservies" prefilled={pf.has("city")} aippBoost={8}>
                      <CitySelector
                        selection={{
                          primaryCity: form.city || null,
                          secondaryCities: form.secondary_cities,
                        }}
                        onSelectionChange={(sel: CitySelection) => {
                          updateField("city", sel.primaryCity || "");
                          updateField("secondary_cities", sel.secondaryCities);
                        }}
                        maxSecondary={maxCities}
                        planName={PLAN_LABELS[planCode] || "Pro"}
                        planCode={planCode}
                      />
                    </FieldWrapper>
                    <FieldWrapper label={`Rayon de déplacement — ${form.radius_km} km`}>
                      <Slider
                        value={[form.radius_km]}
                        onValueChange={([v]) => updateField("radius_km", v)}
                        min={5}
                        max={150}
                        step={5}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>5 km</span><span>150 km</span>
                      </div>
                    </FieldWrapper>
                    <div className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">Se déplace chez le client</p>
                        <p className="text-[10px] text-muted-foreground">Vs atelier / point de service uniquement</p>
                      </div>
                      <Switch checked={form.travels} onCheckedChange={(v) => updateField("travels", v)} />
                    </div>
                  </>
                );
              })()}

              {step === 5 && (
                <>
                  <StepHeader title="Preuves & crédibilité" subtitle="Documents et expérience qui bâtissent la confiance." />
                  <FieldWrapper label="Numéro RBQ" prefilled={pf.has("license_number")} aippBoost={15}>
                    <Input value={form.license_number} onChange={(e) => updateField("license_number", e.target.value)} placeholder="1234-5678-90" />
                    {form.license_number && <ToValidateBadge />}
                  </FieldWrapper>
                  <FieldWrapper label="Assurance responsabilité" prefilled={pf.has("insurance_info")} aippBoost={12}>
                    <Input value={form.insurance_info} onChange={(e) => updateField("insurance_info", e.target.value)} placeholder="Nom de l'assureur / numéro de police" />
                    {form.insurance_info && <ToValidateBadge />}
                  </FieldWrapper>
                  <FieldWrapper label="Certifications" aippBoost={8}>
                    <ChipSelector options={CERTIFICATIONS_LIST} selected={form.certifications} onToggle={(v) => toggleArrayField("certifications", v)} />
                  </FieldWrapper>
                  <FieldWrapper label="Années d'expérience" aippBoost={5}>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={form.years_experience || ""}
                      onChange={(e) => updateField("years_experience", parseInt(e.target.value) || 0)}
                      placeholder="Ex: 15"
                    />
                  </FieldWrapper>
                  <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-4 text-center space-y-2">
                      <Camera className="w-6 h-6 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Photos et documents dans l'étape suivante du tableau de bord</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {step === 6 && (
                <>
                  <StepHeader title="Réputation" subtitle="Vos preuves sociales et réalisations." />
                  <Card className={`border ${form.gmb_linked ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">Fiche Google</span>
                          <span className="text-[10px] text-primary font-semibold">+10 AIPP</span>
                        </div>
                        {form.gmb_linked ? (
                          <Badge variant="default" className="text-[10px]"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Associée</Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => navigate("/pro/gmb-link")} className="text-xs h-7">
                            Associer
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {form.gmb_linked
                          ? "Votre fiche Google est liée. Les avis et données sont importés."
                          : "Associez votre fiche Google pour importer avis, photos et données automatiquement."}
                      </p>
                    </CardContent>
                  </Card>
                  <FieldWrapper label="Autres profils en ligne">
                    <Input
                      placeholder="Ex: facebook.com/monentreprise"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                          toggleArrayField("other_profiles", (e.target as HTMLInputElement).value.trim());
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                    {form.other_profiles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {form.other_profiles.map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => toggleArrayField("other_profiles", p)}>
                            {p} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </FieldWrapper>
                </>
              )}

              {step === 7 && (
                <>
                  <StepHeader title="Conversion & disponibilité" subtitle="Comment les clients peuvent vous joindre." />
                  <div className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">Accepte les rendez-vous en ligne</p>
                      <p className="text-[10px] text-muted-foreground">Les clients pourront réserver directement</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-primary font-semibold">+8 AIPP</span>
                      <Switch checked={form.accepts_appointments} onCheckedChange={(v) => updateField("accepts_appointments", v)} />
                    </div>
                  </div>
                  <FieldWrapper label="Délai de réponse moyen" aippBoost={5}>
                    <Select value={form.response_delay} onValueChange={(v) => updateField("response_delay", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">Moins d'1 heure</SelectItem>
                        <SelectItem value="4h">Moins de 4 heures</SelectItem>
                        <SelectItem value="24h">Même jour (24h)</SelectItem>
                        <SelectItem value="48h">Sous 48 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldWrapper>
                  <div className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">Estimation gratuite</p>
                      <p className="text-[10px] text-muted-foreground">Évaluation ou soumission sans frais</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-primary font-semibold">+5 AIPP</span>
                      <Switch checked={form.free_estimate} onCheckedChange={(v) => updateField("free_estimate", v)} />
                    </div>
                  </div>
                  <FieldWrapper label="Disponibilité" aippBoost={3}>
                    <Select value={form.availability} onValueChange={(v) => updateField("availability", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business_hours">Heures d'affaires</SelectItem>
                        <SelectItem value="extended">Heures étendues (soir)</SelectItem>
                        <SelectItem value="weekends">Inclut fins de semaine</SelectItem>
                        <SelectItem value="24_7">24/7</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldWrapper>

                  {/* Final summary */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Profil complété à {pct}%</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Plus votre profil est complet, plus votre score AIPP sera élevé et vos chances d'apparaître dans les recommandations.
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3 z-30">
          <div className="max-w-lg mx-auto flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> Précédent
              </Button>
            )}
            <Button onClick={nextStep} className="flex-1">
              {step === totalSteps ? (
                <>Terminer <CheckCircle2 className="w-4 h-4 ml-1" /></>
              ) : (
                <>Suivant <ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1 pb-2">
      <h2 className="text-lg font-bold text-foreground font-display">{title}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
