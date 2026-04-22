/**
 * Screen 2 — Ultra Fast Account Creation
 * Email, business name, phone, optional website + friendly errors.
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { WebsiteInput } from "@/components/ui/website-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useHesitationRescue } from "@/hooks/useHesitationRescue";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import { cleanTextField } from "@/utils/cleanInput";
import { formatEmail } from "@/utils/formatEmail";
import { formatWebsiteStorage } from "@/utils/formatWebsite";
import { phoneToE164 } from "@/utils/formatPhone";
import { friendlyError } from "@/utils/friendlyErrors";

export default function ScreenAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "alex" ? "alex" : "solo";
  const { createFunnel } = useActivationFunnel();
  const { toast } = useToast();
  useHesitationRescue({ screenKey: "account" });

  const [form, setForm] = useState({
    email: "",
    password: "",
    business_name: "",
    phone: "",
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = form.email && form.business_name && form.phone && form.password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const cleanedEmail = formatEmail(form.email);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: cleanedEmail,
          password: form.password,
          options: {
            data: {
              business_name: cleanTextField(form.business_name),
              role: "contractor",
            },
          },
        });
        if (signUpError) throw signUpError;
      }

      await createFunnel({
        business_name: cleanTextField(form.business_name),
        phone: phoneToE164(form.phone) || form.phone,
        email: cleanedEmail,
        website: formatWebsiteStorage(form.website),
        mode,
      });

      navigate("/entrepreneur/activer/analyse");
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: friendlyError(err),
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  return (
    <FunnelLayout currentStep="onboarding_start" showProgress={false}>
      <motion.div
        className="max-w-md mx-auto pb-24 sm:pb-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">Créez votre compte</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Quelques informations pour lancer l'import automatique de votre entreprise.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Courriel</Label>
            <EmailInput
              id="email"
              required
              placeholder="vous@entreprise.ca"
              value={form.email}
              onChange={(v) => setForm(p => ({ ...p, email: v }))}
              showValidation
            />
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 caractères"
              value={form.password}
              onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="business_name">Nom de l'entreprise</Label>
            <Input
              id="business_name"
              required
              placeholder="Ex: Toitures Léger Inc."
              value={form.business_name}
              onChange={(e) => setForm(p => ({ ...p, business_name: e.target.value }))}
              onBlur={() => setForm(p => ({ ...p, business_name: cleanTextField(p.business_name) }))}
            />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <PhoneInput
              id="phone"
              required
              placeholder="(514) 555-0123"
              value={form.phone}
              onChange={(v) => setForm(p => ({ ...p, phone: v }))}
              showValidation
            />
          </div>

          <div>
            <Label htmlFor="website">Site web <span className="text-muted-foreground">(optionnel)</span></Label>
            <WebsiteInput
              id="website"
              placeholder="www.votreentreprise.ca"
              value={form.website}
              onChange={(v) => setForm(p => ({ ...p, website: v }))}
              showValidation
            />
          </div>

          {/* Desktop submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-base font-semibold rounded-xl hidden sm:flex"
            disabled={submitting || !canSubmit}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
            Continuer
          </Button>
        </form>
      </motion.div>

      <StickyMobileCTA
        label="Continuer"
        onClick={() => {
          const formEl = document.querySelector("form");
          if (formEl) formEl.requestSubmit();
        }}
        disabled={submitting || !canSubmit}
        loading={submitting}
        icon={submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
      />
    </FunnelLayout>
  );
}
