/**
 * UNPRO — Describe Project Flow (Homeowner Onboarding)
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GooglePlacesInput from "@/components/property/GooglePlacesInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Home, FileText, MapPin,
  Clock, DollarSign, CheckCircle2, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const CATEGORIES = [
  "Rénovation générale", "Toiture", "Plomberie", "Électricité",
  "Cuisine", "Salle de bain", "Fondation", "Peinture",
  "Menuiserie", "Aménagement paysager", "Autre",
];

const TIMELINES = [
  { value: "urgent", label: "Urgent (< 2 semaines)" },
  { value: "soon", label: "Bientôt (1-3 mois)" },
  { value: "planning", label: "Planification (3-6 mois)" },
  { value: "exploring", label: "Exploration (6+ mois)" },
];

const BUDGETS = [
  { value: "under-5k", label: "Moins de 5 000$" },
  { value: "5k-15k", label: "5 000$ - 15 000$" },
  { value: "15k-50k", label: "15 000$ - 50 000$" },
  { value: "50k-100k", label: "50 000$ - 100 000$" },
  { value: "over-100k", label: "Plus de 100 000$" },
];

const STEPS = [
  { id: 1, title: "Votre projet", icon: FileText },
  { id: 2, title: "Votre propriété", icon: Home },
  { id: 3, title: "Détails", icon: Clock },
  { id: 4, title: "Confirmation", icon: CheckCircle2 },
];

export default function DescribeProjectPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    category: "",
    title: "",
    description: "",
    address: "",
    city: "",
    postalCode: "",
    propertyType: "",
    timeline: "",
    budget: "",
    urgency: "normal",
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const canAdvance = () => {
    if (step === 1) return form.category && form.title;
    if (step === 2) return form.address && form.city;
    if (step === 3) return form.timeline && form.budget;
    return true;
  };

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast.info("Créez un compte pour soumettre votre projet.");
      navigate("/signup");
      return;
    }
    toast.success("Projet soumis ! Vous recevrez des soumissions bientôt.");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen premium-bg">
      <div className="mx-auto max-w-lg px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-section text-foreground">Décrivez votre projet</h1>
            <p className="text-caption text-muted-foreground">Étape {step} de 4</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`h-1.5 w-full rounded-full transition-colors duration-300 ${s.id <= step ? "bg-primary" : "bg-muted"}`} />
              <div className="flex items-center gap-1">
                <s.icon className={`h-3 w-3 ${s.id <= step ? "text-primary" : "text-muted-foreground/50"}`} />
                <span className={`text-[9px] font-medium ${s.id <= step ? "text-foreground" : "text-muted-foreground/50"}`}>{s.title}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Catégorie de travaux</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => update("category", cat)}
                        className={`rounded-xl px-3 py-2.5 text-meta font-medium text-left transition-all ${
                          form.category === cat
                            ? "bg-primary text-primary-foreground shadow-soft"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-meta font-semibold">Titre du projet</Label>
                  <Input id="title" placeholder="Ex: Rénovation complète cuisine" value={form.title} onChange={(e) => update("title", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-meta font-semibold">Description <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <Textarea id="desc" placeholder="Décrivez les travaux souhaités..." value={form.description} onChange={(e) => update("description", e.target.value)} className="rounded-xl min-h-[100px]" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Adresse de la propriété</Label>
                  <GooglePlacesInput
                    value={form.address}
                    onChange={(v) => update("address", v)}
                    onPlaceSelect={(place) => {
                      update("address", place.address);
                      if (place.city) update("city", place.city);
                      if (place.postalCode) update("postalCode", place.postalCode);
                    }}
                    placeholder="123 rue Exemple"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-meta font-semibold">Ville</Label>
                    <Input placeholder="Montréal" value={form.city} onChange={(e) => update("city", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-meta font-semibold">Code postal</Label>
                    <Input placeholder="H2X 1Y4" value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Type de propriété</Label>
                  <Select value={form.propertyType} onValueChange={(v) => update("propertyType", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {["Maison", "Condo", "Townhouse", "Duplex", "Commercial"].map((t) => (
                        <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Échéancier souhaité</Label>
                  <div className="space-y-2">
                    {TIMELINES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => update("timeline", t.value)}
                        className={`w-full rounded-xl px-4 py-3 text-meta font-medium text-left transition-all flex items-center gap-3 ${
                          form.timeline === t.value
                            ? "bg-primary text-primary-foreground shadow-soft"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        <Clock className="h-4 w-4 shrink-0" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Budget estimé</Label>
                  <div className="space-y-2">
                    {BUDGETS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => update("budget", b.value)}
                        className={`w-full rounded-xl px-4 py-3 text-meta font-medium text-left transition-all flex items-center gap-3 ${
                          form.budget === b.value
                            ? "bg-primary text-primary-foreground shadow-soft"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        <DollarSign className="h-4 w-4 shrink-0" />
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="glass-card-elevated rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-body font-bold text-foreground">Projet prêt à soumettre</p>
                      <p className="text-caption text-muted-foreground">Vérifiez les détails ci-dessous</p>
                    </div>
                  </div>

                  <div className="divider-gradient" />

                  <div className="space-y-3">
                    {[
                      { label: "Catégorie", value: form.category },
                      { label: "Projet", value: form.title },
                      { label: "Adresse", value: `${form.address}, ${form.city}` },
                      { label: "Échéancier", value: TIMELINES.find((t) => t.value === form.timeline)?.label },
                      { label: "Budget", value: BUDGETS.find((b) => b.value === form.budget)?.label },
                    ].filter((item) => item.value).map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-caption text-muted-foreground">{item.label}</span>
                        <span className="text-meta font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-caption text-muted-foreground">
                    Notre IA va matcher votre projet avec les meilleurs entrepreneurs de votre région.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <Button variant="outline" size="lg" className="rounded-xl flex-1" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
          )}
          {step < 4 ? (
            <Button size="lg" className="rounded-xl flex-1" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
              Suivant <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="lg" variant="premium" className="rounded-xl flex-1" onClick={handleSubmit}>
              Soumettre mon projet <CheckCircle2 className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
