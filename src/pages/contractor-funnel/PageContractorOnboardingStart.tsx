/**
 * UNPRO — PageContractorOnboardingStart
 * Formulaire complet de demande d'adhésion entrepreneur.
 * Enregistre la demande dans `contractor_intake_sessions` puis
 * dirige vers le tableau de bord entrepreneur.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Building2, Globe, Phone, MapPin, Shield, Sparkles, User, Mail, Hammer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { WebsiteInput } from "@/components/ui/website-input";
import { cleanTextField } from "@/utils/cleanInput";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { useContractorIntakeSession } from "@/hooks/useContractorIntakeSession";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/motion";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function PageContractorOnboardingStart() {
  const { state, updateState } = useContractorFunnel();
  const { patch } = useContractorIntakeSession("form");
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: state.businessName || "",
    contactName: "",
    email: "",
    website: state.website || "",
    phone: state.phone || "",
    city: state.city || "",
    trade: "",
    rbqNumber: state.rbqNumber || "",
    notes: "",
    googleBusinessUrl: state.googleBusinessUrl || "",
  });

  const emailValid = EMAIL_RE.test(form.email.trim());
  const phoneDigits = form.phone.replace(/\D/g, "");
  const canProceed =
    form.businessName.trim().length >= 2 &&
    form.contactName.trim().length >= 2 &&
    emailValid &&
    phoneDigits.length >= 10 &&
    form.city.trim().length >= 2 &&
    form.trade.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canProceed || saving) return;
    setSaving(true);
    setSaveError(null);

    updateState({
      businessName: form.businessName,
      website: form.website,
      phone: form.phone,
      city: form.city,
      rbqNumber: form.rbqNumber,
      googleBusinessUrl: form.googleBusinessUrl,
    });

    const ok = await patch({
      mode: "form",
      company_name: cleanTextField(form.businessName),
      website: form.website || null,
      phone: form.phone || null,
      rbq: form.rbqNumber || null,
      detected_trade: cleanTextField(form.trade),
      detected_region: cleanTextField(form.city),
      completion_percentage: 100,
      answers: {
        request_type: "membership",
        submitted_at: new Date().toISOString(),
        contact_name: cleanTextField(form.contactName),
        email: form.email.trim().toLowerCase(),
        google_business_url: form.googleBusinessUrl || null,
        notes: form.notes.trim() || null,
      },
    });

    setSaving(false);

    if (!ok) {
      setSaveError("Nous n'avons pas pu enregistrer votre demande. Touchez à nouveau pour réessayer.");
      return;
    }

    navigate("/entrepreneur/dashboard");
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Helmet>
        <title>Demande d'adhésion entrepreneur | UNPRO</title>
      </Helmet>

      <FunnelLayout currentStep="onboarding_start">
        <div className="max-w-xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">
              Votre demande d'adhésion
            </h1>
            <p className="text-sm text-muted-foreground">
              Quelques informations vérifiables suffisent pour lancer votre analyse.
            </p>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <CardGlass noAnimation className="space-y-5">
              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Nom de l'entreprise *
                </Label>
                <Input
                  placeholder="ex: Toitures Dupont Inc."
                  value={form.businessName}
                  onChange={(e) => updateField("businessName", e.target.value)}
                  onBlur={() => updateField("businessName", cleanTextField(form.businessName))}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                  autoFocus
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Personne responsable *
                </Label>
                <Input
                  placeholder="Prénom et nom"
                  value={form.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                  onBlur={() => updateField("contactName", cleanTextField(form.contactName))}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  Courriel *
                </Label>
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="nom@entreprise.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
                {form.email.length > 0 && !emailValid && (
                  <p className="text-xs text-destructive mt-1">Courriel invalide.</p>
                )}
              </motion.div>

              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  Téléphone *
                </Label>
                <PhoneInput
                  placeholder="(514) 555-0123"
                  value={form.phone}
                  onChange={(v) => updateField("phone", v)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Hammer className="h-3.5 w-3.5 text-primary" />
                  Service principal *
                </Label>
                <Input
                  placeholder="ex: Toiture, pavage, excavation"
                  value={form.trade}
                  onChange={(e) => updateField("trade", e.target.value)}
                  onBlur={() => updateField("trade", cleanTextField(form.trade))}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Ville principale *
                </Label>
                <Input
                  placeholder="Montréal"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  onBlur={() => updateField("city", cleanTextField(form.city))}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Site web
                  <span className="text-xs text-muted-foreground">(optionnel)</span>
                </Label>
                <WebsiteInput
                  placeholder="www.toituresdupont.com"
                  value={form.website}
                  onChange={(v) => updateField("website", v)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

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

              <motion.div variants={fadeUp}>
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  Précisions
                  <span className="text-xs text-muted-foreground ml-1">(optionnel)</span>
                </Label>
                <Textarea
                  placeholder="Territoires desservis, capacité actuelle, spécialités…"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                  className="rounded-xl bg-muted/50 border-border/50"
                />
              </motion.div>

              <motion.div variants={fadeUp} className="pt-2">
                <Button
                  className="w-full h-13 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)] disabled:opacity-40"
                  disabled={!canProceed || saving}
                  onClick={handleSubmit}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Envoyer ma demande
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                {saveError && (
                  <p className="text-xs text-destructive text-center mt-3" role="alert">{saveError}</p>
                )}
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Votre demande est enregistrée, puis vous accédez à votre tableau de bord.
                </p>
              </motion.div>
            </CardGlass>
          </motion.div>
        </div>
      </FunnelLayout>
    </>
  );
}
