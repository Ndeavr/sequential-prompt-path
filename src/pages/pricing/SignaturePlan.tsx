import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Shield, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  "Visibilité maximale",
  "Badge Signature",
  "Priorité recommandations",
  "Auto-accepter intelligent",
  "Rapports personnalisés",
  "Territoire exclusif éligible",
];

export default function SignaturePlan() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({ title: "Demande envoyée", description: "Nous vous contacterons sous 24h." });
    setShowForm(false);
  };

  return (
    <section className="px-5 py-12">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="relative rounded-3xl overflow-hidden bg-card border border-border">
            {/* Top accent */}
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

                  {!showForm && (
                    <Button size="lg" onClick={() => setShowForm(true)} className="rounded-2xl h-13 px-8 shadow-glow">
                      Demander Signature <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>

                {/* Contact form */}
                <AnimatePresence>
                  {showForm && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="w-full md:w-[380px] bg-muted/50 border border-border rounded-2xl p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-foreground">Demande Signature</h4>
                        <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <Input placeholder="Nom entreprise" required className="rounded-xl" />
                        <Input placeholder="Nom contact" required className="rounded-xl" />
                        <Input type="email" placeholder="Email" required className="rounded-xl" />
                        <Input type="tel" placeholder="Téléphone" className="rounded-xl" />
                        <Input placeholder="Ville" required className="rounded-xl" />
                        <Input placeholder="Catégorie de service" required className="rounded-xl" />
                        <Input placeholder="Site web" className="rounded-xl" />
                        <Textarea placeholder="Message (optionnel)" className="rounded-xl resize-none" rows={3} />
                        <Button type="submit" className="w-full rounded-xl">Envoyer la demande</Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
