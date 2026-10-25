/**
 * HeroV2 — Entrepreneur hero. Strategic UNPRO language (no "leads").
 * Copy sourced from src/lib/copy/entrepreneurs.ts.
 */
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { useLanguage } from "@/components/ui/LanguageToggle";
import UnproLogo from "@/components/brand/UnproLogo";


interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function HeroV2({ onTrackCta }: Props) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { lang } = useLanguage();
  const fr = lang === "fr";

  return (
    <section className="relative overflow-hidden px-5 pt-6 pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <UnproLogo size={92} variant="primary" animated={false} />
        <button
          onClick={() => { onTrackCta("topbar_login", "hero"); navigate("/auth"); }}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Déjà inscrit? <span className="text-primary font-semibold">Connexion</span>
        </button>
      </div>

      {/* Background ambient */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[260px] h-[260px] bg-accent/10 rounded-full blur-[80px]" />
      </div>

      {/* Orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="flex justify-center mb-8"
      >
        <div className="relative w-44 h-44">
          {/* Concentric rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-primary/30"
            style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.35)" }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute inset-3 rounded-full border border-primary/40"
          />
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30 backdrop-blur-sm" />
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-10 rounded-full bg-gradient-to-br from-primary to-accent shadow-[0_0_40px_hsl(var(--primary)/0.7)]"
          />
          <div className="absolute inset-[4.5rem] rounded-full bg-background/90 backdrop-blur-md" />
        </div>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center max-w-md mx-auto"
      >
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground leading-[1.1] tracking-tight">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {fr ? "Professionnels et entreprises de services" : "Professionals and service businesses"}
          </span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed px-2">
          {fr ? "Courtiers, notaires, arpenteurs, entreprises d’entretien et rénovateurs : un seul parcours pour faire connaître votre entreprise, vos services et votre région." : "Brokers, notaries, surveyors, maintenance companies and renovators: one journey to make your business, services and region known."}
        </p>
        <p className="mt-3 text-xs font-semibold text-primary/90">
          {fr ? "Immobilier · Entretien · Rénovation" : "Real estate · Property care · Renovation"}
        </p>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-7 flex flex-col gap-3 max-w-sm mx-auto"
      >
        <Button
          size="lg"
          className="w-full h-14 rounded-xl text-base font-bold gap-2 shadow-[0_8px_30px_hsl(var(--primary)/0.35)]"
          onClick={() => { onTrackCta("hero_primary_book", "hero"); navigate(campaignLink("/entrepreneurs/audit-ia", search)); }}
        >
          {fr ? "Faire mon audit IA gratuit" : "Get my free AI audit"}
          <ArrowRight className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 rounded-xl text-sm border-primary/30 hover:bg-primary/5"
          onClick={() => { onTrackCta("hero_secondary_plan_ia", "hero"); navigate(campaignLink("/entrepreneurs/audit-ia", search)); }}
        >
          {fr ? "Découvrir mon profil UNPRO" : "Explore my UNPRO profile"}
        </Button>
      </motion.div>

      {/* Trust row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-7 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground"
      >
        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-success" /> {fr ? "Profil sous examen" : "Profile subject to review"}</span>
        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-warning" /> {fr ? "Présence IA UNPRO" : "UNPRO AI Presence"}</span>
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {fr ? "Votre région" : "Your region"}</span>
      </motion.div>
    </section>
  );
}
