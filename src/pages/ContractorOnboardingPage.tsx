/**
 * UNPRO — Contractor Onboarding (5-step conversion-optimized wizard)
 */
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ArrowRight, HardHat, MapPin, Wrench,
  Shield, Camera, Sparkles, CheckCircle2, Upload, TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BusinessNameSearch, { type BusinessSearchResult } from "@/components/contractor/BusinessNameSearch";
import TagInput from "@/components/ui/tag-input";
import { toast } from "sonner";
import ScoreRing from "@/components/ui/score-ring";
import { peekAuthIntent } from "@/services/auth/authIntentService";

const ALL_CATEGORIES = [
  "Toiture", "Isolation", "Électricité", "Plomberie",
  "Drainage", "Fondation", "CVC / Chauffage", "Menuiserie",
  "Peinture", "Maçonnerie", "Rénovation générale",
  "Fenêtres & Portes", "Revêtement extérieur", "Aménagement paysager",
  "Excavation", "Béton", "Décontamination", "Ébénisterie",
  "Plancher", "Démolition",
];

/** Map intents/referral contexts to suggested categories */
const INTENT_CATEGORY_MAP: Record<string, string[]> = {
  kitchen: ["Ébénisterie", "Plomberie", "Électricité"],
  bathroom: ["Plomberie", "Rénovation générale", "Électricité"],
  roof: ["Toiture", "Isolation"],
  emergency: ["Plomberie", "Électricité", "CVC / Chauffage"],
  insulation: ["Isolation", "Fenêtres & Portes", "CVC / Chauffage"],
  renovation: ["Rénovation générale", "Peinture", "Plancher"],
  construction: ["Fondation", "Béton", "Excavation"],
  plumbing: ["Plomberie", "Drainage"],
  electrical: ["Électricité"],
  register_business: ["Rénovation générale"],
};

const SERVICE_TYPES = ["Installation", "Réparation", "Inspection", "Urgence"];
const CERTIFICATIONS = ["RBQ", "CCA", "ASP Construction", "Autre"];

const STEPS = [
  { id: 1, title: "Entreprise", icon: HardHat },
  { id: 2, title: "Territoire", icon: MapPin },
  { id: 3, title: "Services", icon: Wrench },
  { id: 4, title: "Expérience", icon: Shield },
  { id: 5, title: "Projets", icon: Camera },
];

const MAX_CATEGORIES = 3;

export default function ContractorOnboardingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load prefill data from AIPP check or GMB import
  const prefill = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("unpro_aipp_prefill");
      if (raw) {
        sessionStorage.removeItem("unpro_aipp_prefill");
        return JSON.parse(raw) as { businessName?: string; city?: string; phone?: string; website?: string };
      }
    } catch {}
    return null;
  }, []);

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    businessName: prefill?.businessName || "",
    city: prefill?.city || "",
    categories: [] as string[],
    // territory
    territoryCity: prefill?.city || "",
    radius: "20",
    // services
    services: [] as string[],
    // experience
    yearsExperience: "",
    certifications: [] as string[],
    // projects
    projectDescription: "",
  });

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  // Derive recommended categories from intent or URL params
  const recommendedCategories = useMemo(() => {
    // Check URL param
    const intentParam = searchParams.get("intent") || searchParams.get("i");
    if (intentParam && INTENT_CATEGORY_MAP[intentParam]) {
      return INTENT_CATEGORY_MAP[intentParam];
    }
    // Check auth intent
    const authIntent = peekAuthIntent();
    const intentSlug = authIntent?.metadata?.intent as string | undefined;
    if (intentSlug && INTENT_CATEGORY_MAP[intentSlug]) {
      return INTENT_CATEGORY_MAP[intentSlug];
    }
    return [];
  }, [searchParams]);

  const handleBusinessSelected = (result: BusinessSearchResult) => {
    update("businessName", result.business_name);
    if (result.city) update("city", result.city);
    // Auto-add detected category from Google
    if (result.primary_category) {
      const match = ALL_CATEGORIES.find(
        (c) => c.toLowerCase() === result.primary_category!.toLowerCase(),
      );
      if (match && !form.categories.includes(match)) {
        update("categories", [...form.categories, match].slice(0, MAX_CATEGORIES));
      }
    }
    if (result.city) update("territoryCity", result.city);
  };

  const toggleArray = (field: "services" | "certifications", val: string) => {
    setForm((f) => {
      const arr = f[field];
      return { ...f, [field]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  };

  const canAdvance = () => {
    if (step === 1) return form.businessName && form.city && form.categories.length > 0;
    if (step === 2) return form.territoryCity;
    return true;
  };

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast.info("Créez un compte pour activer votre profil.");
      navigate("/signup");
      return;
    }
    toast.success("Profil activé ! Bienvenue dans le réseau UNPRO.");
    navigate("/pro");
  };

  const currentScore = 61;
  const potentialScore = 82;

  return (
    <div className="min-h-screen premium-bg">
      <div className="mx-auto max-w-lg px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Inscrire mon entreprise</h1>
            <p className="text-xs text-muted-foreground">Étape {step} de 5 — moins de 2 minutes</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${s.id <= step ? "bg-secondary" : "bg-muted"}`} />
              <div className="flex items-center gap-1">
                <s.icon className={`h-3 w-3 ${s.id <= step ? "text-secondary" : "text-muted-foreground/40"}`} />
                <span className={`text-[8px] font-medium ${s.id <= step ? "text-foreground" : "text-muted-foreground/40"}`}>{s.title}</span>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step 1: Entreprise */}
            {step === 1 && (
              <div className="space-y-5">
                <BusinessNameSearch
                  value={form.businessName}
                  onChange={(v) => update("businessName", v)}
                  onBusinessSelected={handleBusinessSelected}
                />

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Ville *</Label>
                  <Input placeholder="Montréal" value={form.city} onChange={(e) => update("city", e.target.value)} className="rounded-xl h-12" />
                  {form.city && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Ville détectée
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Catégories *</Label>
                  <TagInput
                    value={form.categories}
                    suggestions={ALL_CATEGORIES}
                    onChange={(tags) => update("categories", tags)}
                    max={MAX_CATEGORIES}
                    placeholder="Tapez une catégorie…"
                    limitLabel="Inclus dans votre forfait"
                    recommended={recommendedCategories}
                  />
                  {form.categories.length > 0 && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      {form.categories.length === 1
                        ? "1 catégorie sélectionnée"
                        : `${form.categories.length} catégories sélectionnées`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Territoire */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Places disponibles</strong> dans votre territoire.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Ville *</Label>
                  <Input placeholder="Laval" value={form.territoryCity} onChange={(e) => update("territoryCity", e.target.value)} className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Rayon de service</Label>
                  <Select value={form.radius} onValueChange={(v) => update("radius", v)}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["10", "20", "30", "50"].map((r) => (
                        <SelectItem key={r} value={r}>{r} km</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.territoryCity && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card-elevated rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-success" />
                        <span className="text-xs font-medium text-foreground">
                          {form.categories.length > 0 ? form.categories.join(", ") : "Catégorie"} — {form.territoryCity}
                        </span>
                      </div>
                      <Badge className="bg-success/15 text-success border-success/20 text-[10px]">3 places restantes</Badge>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 3: Services */}
            {step === 3 && (
              <div className="space-y-5">
                <p className="text-xs text-muted-foreground">Sélectionnez les types de services que vous offrez.</p>
                <div className="space-y-2">
                  {SERVICE_TYPES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleArray("services", s)}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all ${
                        form.services.includes(s)
                          ? "bg-secondary/10 border border-secondary/30"
                          : "bg-muted/30 border border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox checked={form.services.includes(s)} className="pointer-events-none" />
                      <span className="text-sm font-medium text-foreground">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Expérience */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Années d'expérience</Label>
                  <Select value={form.yearsExperience} onValueChange={(v) => update("yearsExperience", v)}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {["1-3", "3-5", "5-10", "10-20", "20+"].map((y) => (
                        <SelectItem key={y} value={y}>{y} ans</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Certifications</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CERTIFICATIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleArray("certifications", c)}
                        className={`rounded-xl px-3 py-3 text-xs font-medium transition-all flex items-center gap-2 ${
                          form.certifications.includes(c)
                            ? "bg-secondary/10 border border-secondary/30 text-foreground"
                            : "bg-muted/30 border border-transparent text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Shield className="h-3 w-3" /> {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Projets + AIPP Preview */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Description courte de vos réalisations</Label>
                  <Textarea
                    placeholder="Décrivez vos projets récents..."
                    value={form.projectDescription}
                    onChange={(e) => update("projectDescription", e.target.value)}
                    className="rounded-xl min-h-[80px]"
                  />
                </div>

                <div className="upload-zone rounded-2xl flex flex-col items-center gap-2 py-8">
                  <Upload className="h-6 w-6 text-secondary/50" />
                  <p className="text-xs font-semibold text-foreground">Ajouter des photos de projets</p>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG — max 10 MB</p>
                </div>

                <div className="divider-gradient" />

                {/* AIPP Score preview */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card-elevated rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    <p className="text-sm font-bold text-foreground">Votre Score AIPP estimé</p>
                  </div>

                  <div className="flex items-center justify-center gap-6 mb-4">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Actuel</p>
                      <ScoreRing score={currentScore} size={72} label="Score" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-success" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Possible</p>
                      <ScoreRing score={potentialScore} size={72} label="Score" colorClass="text-success" />
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-foreground">Vous pourriez atteindre {potentialScore} avec :</p>
                    {["3 projets documentés", "Vos certifications RBQ/CCA"].map((tip) => (
                      <div key={tip} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                        {tip}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <Button variant="outline" size="lg" className="rounded-xl flex-1 h-12" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
          )}
          {step < 5 ? (
            <Button size="lg" className="rounded-xl flex-1 h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
              Suivant <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="lg" variant="premium" className="rounded-xl flex-1 h-12" onClick={handleSubmit}>
              <Sparkles className="h-4 w-4 mr-1" /> Activer mon profil UNPRO
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
