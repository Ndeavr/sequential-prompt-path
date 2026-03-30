/**
 * UNPRO — Fallback Landing Template
 * Premium placeholder for unbuilt pages. Uses DB-driven content when available.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface FallbackPageData {
  title: string;
  subtitle?: string;
  primaryCtaLabel?: string;
  primaryCtaPath?: string;
  secondaryCtaLabel?: string;
  secondaryCtaPath?: string;
  benefits?: string[];
  faq?: { q: string; a: string }[];
}

interface FallbackLandingProps {
  data?: FallbackPageData;
  pageKey?: string;
}

export default function FallbackLandingTemplateUNPRO({ data }: FallbackLandingProps) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const d: FallbackPageData = data || {
    title: "Cette fonctionnalité arrive bientôt",
    subtitle: "Notre équipe travaille activement sur cette section. Restez connecté.",
    primaryCtaLabel: "Retour à l'accueil",
    primaryCtaPath: "/",
    secondaryCtaLabel: "Parler à Alex",
    secondaryCtaPath: "/alex",
    benefits: ["Intelligence artificielle intégrée", "Expérience premium", "Support 24/7"],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-3xl mx-auto px-4 py-20 text-center space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{d.title}</h1>
            {d.subtitle && <p className="text-lg text-muted-foreground mt-3 max-w-xl mx-auto">{d.subtitle}</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3 justify-center">
            {d.primaryCtaPath && (
              <Button onClick={() => navigate(d.primaryCtaPath!)} size="lg" className="gap-2">
                {d.primaryCtaLabel || "Continuer"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {d.secondaryCtaPath && (
              <Button onClick={() => navigate(d.secondaryCtaPath!)} variant="outline" size="lg" className="gap-2">
                <Sparkles className="w-4 h-4" />
                {d.secondaryCtaLabel || "Alex"}
              </Button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      {d.benefits && d.benefits.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 py-12">
          <div className="grid gap-4 sm:grid-cols-2">
            {d.benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50"
              >
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{b}</span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {d.faq && d.faq.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 py-12">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Questions fréquentes
          </h2>
          <div className="space-y-2">
            {d.faq.map((item, i) => (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
                >
                  {item.q}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
