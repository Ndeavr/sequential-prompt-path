/**
 * UNPRO — PageContractorOnboardingStart
 * Minimal form: business name, website, phone, address, RBQ.
 * Progressive onboarding — start with minimum, import rest.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Building2, Globe, Phone, MapPin, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function PageContractorOnboardingStart() {
  const { state, updateState, goToStep } = useContractorFunnel();
  const [form, setForm] = useState({
    businessName: state.businessName || "",
    website: state.website || "",
    phone: state.phone || "",
    city: state.city || "",
    rbqNumber: state.rbqNumber || "",
    googleBusinessUrl: state.googleBusinessUrl || "",
  });

  const canProceed = form.businessName.trim().length >= 2;

  const handleSubmit = () => {
    updateState({
      businessName: form.businessName,
      website: form.website,
      phone: form.phone,
      city: form.city,
      rbqNumber: form.rbqNumber,
      googleBusinessUrl: form.googleBusinessUrl,
      currentStep: "import_workspace",
    });
    goToStep("import_workspace");
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Helmet>
        <title>Démarrage — Profil AIPP | UNPRO</title>
      </Helmet>

      <FunnelLayout currentStep="onboarding_start">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">
              Créons votre profil AIPP
            </h1>
            <p className="text-sm text-muted-foreground">
              Entrez le minimum — on s'occupe du reste
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <CardGlass noAnimation className="space-y-5">
              {/* Business Name - Required */}
              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Nom de l'entreprise *
                </Label>
                <Input
                  placeholder="ex: Toitures Dupont Inc."
                  value={form.businessName}
                  onChange={(e) => updateField("businessName", e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                  autoFocus
                />
              </motion.div>

              {/* Website */}
              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Site web
                </Label>
                <Input
                  placeholder="www.toituresdupont.com"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

              {/* Phone */}
              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Téléphone
                </Label>
                <Input
                  placeholder="(514) 555-0123"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                  type="tel"
                />
              </motion.div>

              {/* City */}
              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Ville principale
                </Label>
                <Input
                  placeholder="Montréal"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

              {/* RBQ */}
              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  Numéro RBQ
                  <span className="text-xs text-muted-foreground">(optionnel)</span>
                </Label>
                <Input
                  placeholder="1234-5678-90"
                  value={form.rbqNumber}
                  onChange={(e) => updateField("rbqNumber", e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

              {/* Submit */}
              <motion.div variants={fadeUp} className="pt-2">
                <Button
                  className="w-full h-13 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)] disabled:opacity-40"
                  disabled={!canProceed}
                  onClick={handleSubmit}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Lancer l'import automatique
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Vos données publiques seront importées automatiquement
                </p>
              </motion.div>
            </CardGlass>

            {/* What we'll create */}
            <CardGlass noAnimation className="mt-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Ce qu'on va créer pour vous
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Profil AIPP complet",
                  "Score de complétude",
                  "Services détectés",
                  "Zones desservies",
                  "Assets visuels",
                  "FAQ intelligente",
                  "Aperçu public",
                  "Recommandation de plan",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-foreground/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    {item}
                  </div>
                ))}
              </div>
            </CardGlass>
          </motion.div>
        </div>
      </FunnelLayout>
    </>
  );
}
