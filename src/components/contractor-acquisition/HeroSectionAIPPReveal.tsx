/**
 * HeroSectionAIPPReveal — Premium hero with animated AIPP score reveal.
 * Mobile-first, dark premium aesthetic.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { toast } from "sonner";

const formSchema = z.object({
  businessName: z.string().trim().min(2, "Minimum 2 caractères").max(120),
  city: z.string().trim().min(2, "Minimum 2 caractères").max(120),
  website: z.union([z.literal(""), z.string().trim().url().max(255)]),
});

interface Props {
  onAnalyze: (data: { businessName: string; city: string; website: string }) => void;
  loading?: boolean;
}

export default function HeroSectionAIPPReveal({ onAnalyze, loading }: Props) {
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse({ businessName, city, website: website.trim() });
    if (!parsed.success) {
      toast.error("Vérifiez les champs.");
      return;
    }
    onAnalyze({ businessName: parsed.data.businessName!, city: parsed.data.city!, website: parsed.data.website ?? "" });
  };

  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <div className="relative max-w-lg mx-auto text-center space-y-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
        >
          <Zap className="w-3 h-3" />
          Analyse IA gratuite en 30 secondes
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight"
        >
          Découvrez comment{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            l'IA vous perçoit
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground max-w-sm mx-auto"
        >
          Score AIPP instantané. Identifiez vos forces, lacunes et opportunités de revenus perdues.
        </motion.p>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-3 text-left"
        >
          <Input
            placeholder="Nom de votre entreprise"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="h-12 bg-card/60 border-border/40 backdrop-blur-sm"
            required
          />
          <Input
            placeholder="Ville principale"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-12 bg-card/60 border-border/40 backdrop-blur-sm"
            required
          />
          <Input
            placeholder="Site web (optionnel)"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="h-12 bg-card/60 border-border/40 backdrop-blur-sm"
            type="url"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyser mon entreprise
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </motion.form>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground"
        >
          <span>✓ Gratuit</span>
          <span>✓ Sans engagement</span>
          <span>✓ Résultat instantané</span>
        </motion.div>
      </div>
    </section>
  );
}
