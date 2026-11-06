/** Entrepreneur hero: outcome, mechanism and action. */
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { CONTRACTOR_PLAN_ENTRY_ROUTE } from "@/lib/routing/contractorPlanRoute";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import UnproLogo from "@/components/brand/UnproLogo";


interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function HeroV2({ onTrackCta }: Props) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { lang, setLang } = useLanguage();
  const fr = lang === "fr";

  return (
    <section className="relative overflow-hidden px-5 pt-6 pb-10">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <UnproLogo size={92} variant="primary" animated={false} />
        <LanguageToggle lang={lang} onChange={setLang} />
        <button
          onClick={() => { onTrackCta("topbar_login", "hero"); navigate("/auth"); }}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {fr ? "Déjà inscrit?" : "Already registered?"} <span className="text-primary font-semibold">{fr ? "Connexion" : "Sign in"}</span>
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
            {fr ? "Moins de soumissions pour rien. Plus de mandats faits pour toi." : "Less time quoting the wrong jobs. More work that fits you."}
          </span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed px-2">
          {fr ? "Tanné de courir après des prospects trop loin, hors de tes spécialités ou pour des travaux que tu ne veux pas faire? Clara pose les questions aux propriétaires et cherche le bon match avec TON entreprise. Mets ton énergie sur les mandats qui te conviennent." : "Tired of chasing prospects outside your area, your specialties or the work you want to do? Clara asks homeowners about their projects and looks for the right fit with YOUR business. Put your energy into jobs that work for you."}
        </p>
        <p className="mt-3 text-xs font-semibold text-primary/90">
          {fr ? "Rénovation–Construction · Entretien · Immobilier" : "Renovation–Construction · Property care · Real estate"}
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
          onClick={() => { onTrackCta("hero_primary_objectives", "hero"); navigate(campaignLink(CONTRACTOR_PLAN_ENTRY_ROUTE, search, { from: "entrepreneurs_landing" })); }}
        >
          {fr ? "Définir les projets que je veux" : "Define my ideal projects"}
          <ArrowRight className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 rounded-xl text-sm border-primary/30 hover:bg-primary/5"
          onClick={() => { onTrackCta("hero_secondary_plan_ia", "hero"); navigate(campaignLink("/entrepreneurs/audit-ia", search)); }}
        >
          {fr ? "Faire mon audit IA gratuit" : "Get my free AI audit"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {fr ? "Ton temps. Ton énergie. Tes profits. Commençons par les mandats que tu veux." : "Your time. Your energy. Your profit. Start with the jobs you want."}
        </p>
      </motion.div>

      {/* Trust row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-7 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground"
      >
        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-success" /> {fr ? "Vos spécialités" : "Your specialties"}</span>
        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-warning" /> {fr ? "Présence IA UNPRO" : "UNPRO AI Presence"}</span>
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {fr ? "Votre région" : "Your region"}</span>
      </motion.div>
    </section>
  );
}
