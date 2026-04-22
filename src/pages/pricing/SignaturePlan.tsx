/**
 * UNPRO — Signature Plan with Supabase-connected request form
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Shield, ArrowRight, X, Loader2 } from "lucide-react";
import { formatPhoneDisplay } from "@/utils/formatPhone";
import { formatEmail } from "@/utils/formatEmail";
import { cleanTextField } from "@/utils/cleanInput";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FEATURES = [
  "Visibilité maximale",
  "Badge Signature",
  "Priorité maximale dans les recommandations",
  "Auto-accepter intelligent",
  "Rapports personnalisés",
  "Potentiel exclusivité territoriale",
  "Accès projets : S, M, L, XL, XXL",
];

export default function SignaturePlan() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    category: "",
    specialty: "",
    website: "",
    monthly_budget: "",
    wants_exclusivity: false,
    message: "",
  });

  const updateField = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("signature_requests").insert({
        company_name: form.company_name,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone || null,
        city: form.city,
        category: form.category,
        specialty: form.specialty || null,
        website: form.website || null,
        monthly_budget: form.monthly_budget || null,
        wants_exclusivity: form.wants_exclusivity,
        message: form.message || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Demande envoyée avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de l'envoi. Réessayez.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-5 py-12" id="signature">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="relative rounded-3xl overflow-hidden bg-card border border-border">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

            <div className="relative p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Shield className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Signature</h3>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Exclusivité territoriale</Badge>
                    </div>
                  </div>

                  <div className="mb-5">
                    <span className="text-5xl font-extrabold text-foreground">399 $</span>
                    <span className="text-muted-foreground ml-1">/mois</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        <span className="text-sm text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {!showForm && !submitted && (
                    <Button size="lg" onClick={() => setShowForm(true)} className="rounded-2xl h-13 px-8 shadow-glow">
                      Demander Signature <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>

                <AnimatePresence>
                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full md:w-[380px] bg-success/10 border border-success/20 rounded-2xl p-6 text-center space-y-3"
                    >
                      <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                      <h4 className="font-bold text-foreground">Demande envoyée</h4>
                      <p className="text-sm text-muted-foreground">
                        Merci. Un membre de l'équipe UNPRO vous contactera rapidement pour évaluer votre admissibilité au plan Signature.
                      </p>
                    </motion.div>
                  ) : showForm ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="w-full md:w-[400px] bg-muted/50 border border-border rounded-2xl p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-foreground">Demande Signature</h4>
                        <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <Input placeholder="Nom entreprise *" required className="rounded-xl" value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
                        <Input placeholder="Nom contact *" required className="rounded-xl" value={form.contact_name} onChange={(e) => updateField("contact_name", e.target.value)} />
                        <Input type="email" placeholder="Email *" required className="rounded-xl" value={form.email} onChange={(e) => updateField("email", e.target.value)} onBlur={() => updateField("email", formatEmail(form.email))} />
                        <Input type="tel" placeholder="Téléphone" className="rounded-xl" value={form.phone} onChange={(e) => updateField("phone", formatPhoneDisplay(e.target.value))} />
                        <Input placeholder="Ville principale *" required className="rounded-xl" value={form.city} onChange={(e) => updateField("city", e.target.value)} onBlur={() => updateField("city", cleanTextField(form.city))} />
                        <Input placeholder="Catégorie principale *" required className="rounded-xl" value={form.category} onChange={(e) => updateField("category", e.target.value)} onBlur={() => updateField("category", cleanTextField(form.category))} />
                        <Input placeholder="Spécialité" className="rounded-xl" value={form.specialty} onChange={(e) => updateField("specialty", e.target.value)} />
                        <Input placeholder="Site web" className="rounded-xl" value={form.website} onChange={(e) => updateField("website", e.target.value)} />
                        <Input placeholder="Budget mensuel souhaité" className="rounded-xl" value={form.monthly_budget} onChange={(e) => updateField("monthly_budget", e.target.value)} />
                        <div className="flex items-center gap-3 py-1">
                          <Switch
                            checked={form.wants_exclusivity}
                            onCheckedChange={(v) => updateField("wants_exclusivity", v)}
                          />
                          <Label className="text-sm text-foreground">Exclusivité territoriale souhaitée</Label>
                        </div>
                        <Textarea placeholder="Message (optionnel)" className="rounded-xl resize-none" rows={3} value={form.message} onChange={(e) => updateField("message", e.target.value)} />
                        <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Envoyer la demande
                        </Button>
                      </form>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
