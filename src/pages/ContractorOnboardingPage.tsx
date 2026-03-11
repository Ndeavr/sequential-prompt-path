/**
 * UNPRO — Contractor Onboarding Page
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, HardHat, MapPin, FileText,
  Shield, CheckCircle2, Award, Upload, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const SPECIALTIES = [
  "Rénovation générale", "Toiture", "Plomberie", "Électricité",
  "Menuiserie", "Fondation", "Peinture", "Maçonnerie",
  "CVC / Chauffage", "Aménagement paysager",
];

const STEPS = [
  { id: 1, title: "Entreprise", icon: HardHat },
  { id: 2, title: "Services", icon: FileText },
  { id: 3, title: "Vérification", icon: Shield },
  { id: 4, title: "Confirmation", icon: CheckCircle2 },
];

export default function ContractorOnboardingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    businessName: "",
    phone: "",
    email: "",
    website: "",
    city: "",
    province: "Québec",
    specialty: "",
    yearsExperience: "",
    description: "",
    licenseNumber: "",
    insuranceInfo: "",
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const canAdvance = () => {
    if (step === 1) return form.businessName && form.city;
    if (step === 2) return form.specialty;
    return true;
  };

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast.info("Créez un compte entrepreneur pour compléter votre profil.");
      navigate("/signup");
      return;
    }
    toast.success("Profil soumis ! Votre vérification est en cours.");
    navigate("/pro");
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
            <h1 className="text-section text-foreground">Inscrire mon entreprise</h1>
            <p className="text-caption text-muted-foreground">Étape {step} de 4</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`h-1.5 w-full rounded-full transition-colors duration-300 ${s.id <= step ? "bg-secondary" : "bg-muted"}`} />
              <div className="flex items-center gap-1">
                <s.icon className={`h-3 w-3 ${s.id <= step ? "text-secondary" : "text-muted-foreground/50"}`} />
                <span className={`text-[9px] font-medium ${s.id <= step ? "text-foreground" : "text-muted-foreground/50"}`}>{s.title}</span>
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
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Nom de l'entreprise *</Label>
                  <Input placeholder="Ex: Toiture Expert Inc." value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-meta font-semibold">Téléphone</Label>
                    <Input placeholder="(514) 555-0123" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-meta font-semibold">Courriel</Label>
                    <Input placeholder="info@entreprise.com" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-meta font-semibold">Ville *</Label>
                    <Input placeholder="Montréal" value={form.city} onChange={(e) => update("city", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-meta font-semibold">Province</Label>
                    <Input value={form.province} onChange={(e) => update("province", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Site web <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <Input placeholder="https://mon-entreprise.com" value={form.website} onChange={(e) => update("website", e.target.value)} className="rounded-xl" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Spécialité principale *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALTIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update("specialty", s)}
                        className={`rounded-xl px-3 py-2.5 text-meta font-medium text-left transition-all ${
                          form.specialty === s
                            ? "bg-secondary text-secondary-foreground shadow-soft"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Années d'expérience</Label>
                  <Select value={form.yearsExperience} onValueChange={(v) => update("yearsExperience", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {["1-3", "3-5", "5-10", "10-20", "20+"].map((y) => (
                        <SelectItem key={y} value={y}>{y} ans</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Description de l'entreprise</Label>
                  <Textarea placeholder="Décrivez vos services, votre expertise..." value={form.description} onChange={(e) => update("description", e.target.value)} className="rounded-xl min-h-[100px]" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-caption text-muted-foreground">
                    Ces informations seront vérifiées par notre équipe pour obtenir le <strong className="text-foreground">badge vérifié</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Numéro de licence RBQ</Label>
                  <Input placeholder="1234-5678-90" value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-meta font-semibold">Assurance responsabilité</Label>
                  <Input placeholder="Compagnie et numéro de police" value={form.insuranceInfo} onChange={(e) => update("insuranceInfo", e.target.value)} className="rounded-xl" />
                </div>

                <div className="upload-zone rounded-2xl flex flex-col items-center gap-2 py-8">
                  <Upload className="h-6 w-6 text-secondary/50" />
                  <p className="text-meta font-semibold text-foreground">Téléverser vos documents</p>
                  <p className="text-caption text-muted-foreground">Licence, assurance, portfolio (PDF, JPG)</p>
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
                      <p className="text-body font-bold text-foreground">Profil prêt</p>
                      <p className="text-caption text-muted-foreground">Vérification sous 24-48h</p>
                    </div>
                  </div>

                  <div className="divider-gradient" />

                  {[
                    { label: "Entreprise", value: form.businessName },
                    { label: "Ville", value: form.city },
                    { label: "Spécialité", value: form.specialty },
                    { label: "Expérience", value: form.yearsExperience ? `${form.yearsExperience} ans` : "" },
                    { label: "Licence RBQ", value: form.licenseNumber || "Non fourni" },
                  ].filter((i) => i.value).map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-caption text-muted-foreground">{item.label}</span>
                      <span className="text-meta font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="glass-card rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-secondary" />
                    <p className="text-meta font-semibold text-foreground">Score AIPP</p>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    Votre score AIPP sera calculé automatiquement après vérification. Complétez votre profil pour maximiser votre visibilité.
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
            <Button size="lg" className="rounded-xl flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
              Suivant <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="lg" variant="premium" className="rounded-xl flex-1" onClick={handleSubmit}>
              <Sparkles className="h-4 w-4 mr-1" /> Soumettre mon profil
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
