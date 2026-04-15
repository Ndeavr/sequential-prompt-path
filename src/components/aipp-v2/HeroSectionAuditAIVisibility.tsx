import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";

interface Props {
  onSubmit: (domain: string) => void;
  isSubmitting: boolean;
}

export default function HeroSectionAuditAIVisibility({ onSubmit, isSubmitting }: Props) {
  const [domain, setDomain] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = domain.trim();
    if (!cleaned) return;
    onSubmit(cleaned);
  };

  return (
    <section className="relative overflow-hidden py-16 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AIPP v2 — AI Visibility Engine
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 leading-tight">
            Est-ce que l'IA vous recommande ?
          </h1>

          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Analysez votre site comme ChatGPT et Perplexity le voient. Obtenez un score de visibilité IA et des recommandations concrètes.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex gap-2 max-w-md mx-auto"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="votresite.com"
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? "Analyse…" : "Analyser"}
          </button>
        </motion.form>
      </div>
    </section>
  );
}
