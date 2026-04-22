/**
 * Screen 2 — Ultra Fast Account Creation
 * Email, business name, phone, optional website.
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";

export default function ScreenAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "alex" ? "alex" : "solo";
  const { createFunnel } = useActivationFunnel();
  const { toast } = useToast();

  const [form, setForm] = useState({
    email: "",
    password: "",
    business_name: "",
    phone: "",
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.business_name || !form.phone) return;

    setSubmitting(true);
    try {
      // Check if already logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Create account
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              business_name: form.business_name,
              role: "contractor",
            },
          },
        });
        if (signUpError) throw signUpError;
      }

      // Create funnel row
      await createFunnel({
        business_name: form.business_name,
        phone: form.phone,
        email: form.email,
        website: form.website,
        mode,
      });

      navigate("/entrepreneur/activer/analyse");
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  return (
    <FunnelLayout currentStep="onboarding_start" showProgress={false}>
      <motion.div
        className="max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Créez votre compte
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Quelques informations pour lancer l'import automatique de votre entreprise.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Courriel</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="vous@entreprise.ca"
              value={form.email}
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
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
            />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              required
              placeholder="514-555-0123"
              value={form.phone}
              onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="website">Site web <span className="text-muted-foreground">(optionnel)</span></Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.votreentreprise.ca"
              value={form.website}
              onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-base font-semibold rounded-xl"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <ArrowRight className="w-5 h-5 mr-2" />
            )}
            Continuer
          </Button>
        </form>
      </motion.div>
    </FunnelLayout>
  );
}
