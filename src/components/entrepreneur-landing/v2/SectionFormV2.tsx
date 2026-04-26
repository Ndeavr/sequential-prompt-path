/**
 * SectionFormV2 — Contractor capture form.
 * Persists submission to entrepreneur_cta_events for downstream follow-up,
 * then redirects to /entrepreneur/activer for full onboarding.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionFormV2({ onTrackCta }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company: "",
    trade: "",
    city: "",
    phone: "",
    email: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.trade || !form.city || !form.email) {
      toast.error("Complétez les champs obligatoires.");
      return;
    }
    setSubmitting(true);
    onTrackCta("form_submit", "form");
    try {
      await supabase.from("entrepreneur_cta_events").insert({
        visitor_id: crypto.randomUUID(),
        cta_key: "landing_form_submit",
        page_section: "form",
        metadata: form as unknown as Record<string, string>,
      } as never);
      toast.success("Reçu ! On vous contacte rapidement.");
      navigate("/entrepreneur/activer");
    } catch (err) {
      console.error(err);
      toast.error("Erreur, réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="section-form" className="px-5 py-12">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-accent/5 backdrop-blur-md p-5"
        >
          <h2 className="font-display text-2xl font-bold text-foreground text-center">
            Recevoir mes opportunités
          </h2>
          <p className="text-center text-sm text-muted-foreground mt-1 mb-5">
            Réponse sous 24h ouvrables.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              required
              placeholder="Entreprise"
              value={form.company}
              onChange={update("company")}
              className="h-12 rounded-xl bg-background/60 border-border/60"
            />
            <Input
              required
              placeholder="Métier (ex: Couvreur)"
              value={form.trade}
              onChange={update("trade")}
              className="h-12 rounded-xl bg-background/60 border-border/60"
            />
            <Input
              required
              placeholder="Ville"
              value={form.city}
              onChange={update("city")}
              className="h-12 rounded-xl bg-background/60 border-border/60"
            />
            <Input
              type="tel"
              placeholder="Téléphone"
              value={form.phone}
              onChange={update("phone")}
              className="h-12 rounded-xl bg-background/60 border-border/60"
            />
            <Input
              required
              type="email"
              placeholder="Courriel"
              value={form.email}
              onChange={update("email")}
              className="h-12 rounded-xl bg-background/60 border-border/60"
            />

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full h-14 rounded-xl text-base font-bold gap-2 mt-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
              Recevoir mes opportunités
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Confidentiel · Aucun engagement
            </p>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
