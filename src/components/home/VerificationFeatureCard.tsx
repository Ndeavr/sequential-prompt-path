import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerificationTimeline } from "@/components/verification";
import {
  Shield, ShieldCheck, Search, FileText, Scale,
  CheckCircle2,
} from "lucide-react";

const CHECKS = [
  "Licence RBQ",
  "Entreprise réelle",
  "Cohérence téléphone",
  "Contrat suspect",
  "Identité commerciale",
];

const VerificationFeatureCard = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/verify?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/verify");
    }
  };

  return (
    <section className="px-5 py-16">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <div className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-card via-card to-primary/[0.03]">
            {/* Glow accents */}
            <div className="absolute top-[-40%] right-[-15%] w-[50%] h-[80%] rounded-full blur-[100px] bg-primary/8 pointer-events-none" />
            <div className="absolute bottom-[-30%] left-[-10%] w-[40%] h-[60%] rounded-full blur-[80px] bg-warning/6 pointer-events-none" />

            <div className="relative z-10 p-5 sm:p-8 md:p-10">
              {/* Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/15 shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight">
                    Vous avez des doutes sur un entrepreneur?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ou voulez simplement être rassuré(e)?
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 mb-4">
                Avant de signer une soumission, vérifiez :
              </p>

              {/* Check pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {CHECKS.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-muted/60 border border-border/50 text-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    {c}
                  </span>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-5 items-start">
                {/* Left: Input + CTA */}
                <div className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nom, téléphone, RBQ ou NEQ"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10 h-12 rounded-xl border-border/60 bg-background/80 text-sm"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-sm font-bold gap-2 cta-gradient"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Vérifier maintenant
                    </Button>
                  </form>

                  {/* Secondary CTAs */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate("/dashboard/quotes/upload")}
                      className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Analyser une soumission
                    </button>
                    <button
                      onClick={() => navigate("/compare-quotes")}
                      className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Comparer des entrepreneurs
                    </button>
                  </div>
                </div>

                {/* Right: Animated timeline */}
                <div className="rounded-2xl bg-muted/30 border border-border/50 p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Vérification en cours
                  </p>
                  <VerificationTimeline autoplay stepDelay={800} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VerificationFeatureCard;
